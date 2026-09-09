import os
import json
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.applications import DenseNet121
from tensorflow.keras.applications.densenet import preprocess_input
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

TRAIN_DIR = os.path.join(BASE_DIR, "data", "skin", "train")
VAL_DIR = os.path.join(BASE_DIR, "data", "skin", "val")
TEST_DIR = os.path.join(BASE_DIR, "data", "skin", "test")
MODEL_DIR = os.path.join(BASE_DIR, "models")

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 10
SEED = 42

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
    optimizer=keras.optimizers.Adam(learning_rate=1e-4),
    loss="binary_crossentropy",
    metrics=[
        "accuracy",
        keras.metrics.Precision(name="precision"),
        keras.metrics.Recall(name="recall"),
        keras.metrics.AUC(name="auc")
    ]
)

print("\nModel summary:")
model.summary()

callbacks = [
    keras.callbacks.ModelCheckpoint(
        os.path.join(MODEL_DIR, "skin_densenet121.keras"),
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

print("\nStarting training...")

history = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=EPOCHS,
    callbacks=callbacks
)

print("\nLoading best model...")

model = keras.models.load_model(
    os.path.join(MODEL_DIR, "skin_densenet121.keras"
))

print("\nEvaluating on test dataset...")

results = model.evaluate(
    test_ds,
    verbose=1
)

for name, value in zip(model.metrics_names, results):
    print(f"{name}: {value:.4f}")

print("\nGenerating predictions...")

y_true = []
y_prob = []

for images, labels in test_ds:
    probabilities = model.predict(
        images,
        verbose=0
    ).flatten()

    y_prob.extend(probabilities)
    y_true.extend(labels.numpy().astype(int))

y_true = tf.convert_to_tensor(y_true).numpy()
y_prob = tf.convert_to_tensor(y_prob).numpy()

y_pred = (y_prob >= 0.5).astype(int)

print("\nClassification Report:")

print(
    classification_report(
        y_true,
        y_pred,
        target_names=["benign", "malignant"],
        digits=4
    )
)

print("Confusion Matrix:")

cm = confusion_matrix(
    y_true,
    y_pred
)

print(cm)

auc = roc_auc_score(
    y_true,
    y_prob
)

print(f"\nROC-AUC: {auc:.4f}")

history_data = {
    key: [float(value) for value in values]
    for key, values in history.history.items()
}

with open(
    os.path.join(MODEL_DIR, "training_history.json"),
    "w"
) as file:
    json.dump(history_data, file, indent=4)

with open(
    os.path.join(MODEL_DIR, "evaluation_results.json"),
    "w"
) as file:
    json.dump(
        {
            "test_loss": float(results[0]),
            "test_accuracy": float(results[1]),
            "test_precision": float(results[2]),
            "test_recall": float(results[3]),
            "test_auc": float(results[4]),
            "roc_auc": float(auc),
            "confusion_matrix": cm.tolist()
        },
        file,
        indent=4
    )

print("\nTraining completed successfully.")
print("Model saved to:", os.path.join(MODEL_DIR, "skin_densenet121.keras"))