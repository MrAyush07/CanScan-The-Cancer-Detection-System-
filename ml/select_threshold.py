import os
import numpy as np
import tensorflow as tf
from sklearn.metrics import precision_score, recall_score, f1_score
from tensorflow.keras.preprocessing.image import ImageDataGenerator

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

VAL_DIR = os.path.join(
    BASE_DIR,
    "data",
    "skin",
    "val"
)

MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "skin_densenet121_weighted.keras"
)

IMAGE_SIZE = (224, 224)
BATCH_SIZE = 32

model = tf.keras.models.load_model(
    MODEL_PATH
)

datagen = ImageDataGenerator()

val_generator = datagen.flow_from_directory(
    VAL_DIR,
    target_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="binary",
    classes=["benign", "malignant"],
    shuffle=False
)

probabilities = model.predict(
    val_generator,
    verbose=1
).ravel()

true_labels = val_generator.classes

print("\nClass mapping:")
print(val_generator.class_indices)

print("\nValidation images:")
print(len(true_labels))

print("\nRecall-oriented threshold analysis:")

results = []

for threshold in np.arange(0.20, 0.71, 0.01):
    predictions = (
        probabilities >= threshold
    ).astype(int)

    precision = precision_score(
        true_labels,
        predictions,
        zero_division=0
    )

    recall = recall_score(
        true_labels,
        predictions,
        zero_division=0
    )

    f1 = f1_score(
        true_labels,
        predictions,
        zero_division=0
    )

    results.append(
        (
            threshold,
            precision,
            recall,
            f1
        )
    )

print(
    "\nThreshold     Precision     Recall       F1"
)

for threshold, precision, recall, f1 in results:
    if recall >= 0.75:
        print(
            f"{threshold:.2f}          "
            f"{precision:.4f}        "
            f"{recall:.4f}      "
            f"{f1:.4f}"
        )

eligible = [
    result
    for result in results
    if result[2] >= 0.75
]

if eligible:
    best = max(
        eligible,
        key=lambda x: x[3]
    )

    print("\nRecommended threshold:")
    print(f"Threshold: {best[0]:.2f}")
    print(f"Precision: {best[1]:.4f}")
    print(f"Recall: {best[2]:.4f}")
    print(f"F1: {best[3]:.4f}")
else:
    print(
        "\nNo threshold achieved "
        "at least 75% malignant recall."
    )
