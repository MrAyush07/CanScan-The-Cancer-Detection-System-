import os
import json
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.applications import DenseNet121
from tensorflow.keras.applications.densenet import preprocess_input
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score,
    precision_score,
    recall_score,
    f1_score
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

TRAIN_DIR = os.path.join(BASE_DIR, "data", "skin", "train")
VAL_DIR = os.path.join(BASE_DIR, "data", "skin", "val")
TEST_DIR = os.path.join(BASE_DIR, "data", "skin", "test")
MODEL_DIR = os.path.join(BASE_DIR, "models")

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 10
SEED = 42

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "skin_densenet121_weighted.keras"
)

os.makedirs(MODEL_DIR, exist_ok=True)

print("TensorFlow version:", tf.__version__)
print("Loading datasets...")

train_ds = tf.keras.utils.image_dataset_from_directory(
    TRAIN_DIR,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="binary",
    class_names=["benign", "malignant"],
    shuffle=True,
    seed=SEED
)

val_ds = tf.keras.utils.image_dataset_from_directory(
    VAL_DIR,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="binary",
    class_names=["benign", "malignant"],
    shuffle=False
)

test_ds = tf.keras.utils.image_dataset_from_directory(
    TEST_DIR,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="binary",
    class_names=["benign", "malignant"],
    shuffle=False
)

print("Class names:", train_ds.class_names)

augmentation = keras.Sequential([
    layers.RandomFlip("horizontal"),
    layers.RandomRotation(0.08),
    layers.RandomZoom(0.1)
])

base_model = DenseNet121(
    include_top=False,
    weights="imagenet",
    input_shape=(224, 224, 3)
)

base_model.trainable = False

inputs = keras.Input(shape=(224, 224, 3))

x = augmentation(inputs)
x = preprocess_input(x)
x = base_model(x, training=False)
x = layers.GlobalAveragePooling2D()(x)
x = layers.Dropout(0.3)(x)

outputs = layers.Dense(
    1,
    activation="sigmoid"
)(x)

model = keras.Model(inputs, outputs)

model.compile(
    optimizer=keras.optimizers.Adam(
        learning_rate=1e-4
    ),
    loss="binary_crossentropy",
    metrics=[
        "accuracy",
        keras.metrics.Precision(name="precision"),
        keras.metrics.Recall(name="recall"),
        keras.metrics.AUC(name="auc")
    ]
)

class_weight = {
    0: 0.62,
    1: 2.55
}

print("\nClass weights:")
print(class_weight)

print("\nModel summary:")
model.summary()

callbacks = [
    keras.callbacks.ModelCheckpoint(
        MODEL_PATH,
        monitor="val_auc",
        mode="max",
        save_best_only=True
    ),
    keras.callbacks.EarlyStopping(
        monitor="val_auc",
        mode="max",
        patience=3,
        restore_best_weights=True
    ),
    keras.callbacks.ReduceLROnPlateau(
        monitor="val_auc",
        mode="max",
        factor=0.5,
        patience=2,
        min_lr=1e-7
    )
]

print("\nStarting weighted training...")

history = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=EPOCHS,
    class_weight=class_weight,
    callbacks=callbacks
)

print("\nLoading best weighted model...")

model = keras.models.load_model(MODEL_PATH)

print("\nGenerating validation predictions...")

val_true = []
val_prob = []

for images, labels in val_ds:
    probabilities = model.predict(
        images,
        verbose=0
    ).flatten()

    val_prob.extend(probabilities)
    val_true.extend(labels.numpy().astype(int))

val_true = np.array(val_true)
val_prob = np.array(val_prob)

print("\nFinding best threshold...")

best_threshold = 0.5
best_f1 = 0.0

for threshold in np.arange(0.10, 0.91, 0.01):
    predictions = (val_prob >= threshold).astype(int)

    score = f1_score(
        val_true,
        predictions,
        zero_division=0
    )

    if score > best_f1:
        best_f1 = score
        best_threshold = float(threshold)

print(f"Best validation threshold: {best_threshold:.2f}")
print(f"Best validation F1: {best_f1:.4f}")

print("\nGenerating test predictions...")

test_true = []
test_prob = []

for images, labels in test_ds:
    probabilities = model.predict(
        images,
        verbose=0
    ).flatten()

    test_prob.extend(probabilities)
    test_true.extend(labels.numpy().astype(int))

test_true = np.array(test_true)
test_prob = np.array(test_prob)

test_pred = (
    test_prob >= best_threshold
).astype(int)

print("\nWeighted Model Classification Report:")

print(
    classification_report(
        test_true,
        test_pred,
        target_names=["benign", "malignant"],
        digits=4,
        zero_division=0
    )
)

cm = confusion_matrix(
    test_true,
    test_pred
)

print("Confusion Matrix:")
print(cm)

accuracy = float(
    np.mean(test_true == test_pred)
)

precision = precision_score(
    test_true,
    test_pred,
    zero_division=0
)

recall = recall_score(
    test_true,
    test_pred,
    zero_division=0
)

f1 = f1_score(
    test_true,
    test_pred,
    zero_division=0
)

auc = roc_auc_score(
    test_true,
    test_prob
)

print(f"\nAccuracy: {accuracy:.4f}")
print(f"Precision: {precision:.4f}")
print(f"Malignant Recall: {recall:.4f}")
print(f"Malignant F1: {f1:.4f}")
print(f"ROC-AUC: {auc:.4f}")

history_data = {
    key: [float(value) for value in values]
    for key, values in history.history.items()
}

with open(
    os.path.join(
        MODEL_DIR,
        "weighted_training_history.json"
    ),
    "w"
) as file:
    json.dump(
        history_data,
        file,
        indent=4
    )

with open(
    os.path.join(
        MODEL_DIR,
        "weighted_evaluation_results.json"
    ),
    "w"
) as file:
    json.dump(
        {
            "model": "DenseNet121",
            "class_weight": class_weight,
            "threshold": best_threshold,
            "validation_f1": float(best_f1),
            "test_accuracy": accuracy,
            "test_precision": float(precision),
            "test_recall": float(recall),
            "test_f1": float(f1),
            "roc_auc": float(auc),
            "confusion_matrix": cm.tolist()
        },
        file,
        indent=4
    )

print("\nWeighted training completed successfully.")
print("Model saved to:", MODEL_PATH)