import os

import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score
)

from tensorflow.keras.preprocessing.image import ImageDataGenerator

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

TEST_DIR = os.path.join(
    BASE_DIR,
    "data",
    "skin",
    "test"
)

MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "skin_densenet121_weighted.keras"
)

IMAGE_SIZE = (224, 224)
BATCH_SIZE = 32

model = tf.keras.models.load_model(MODEL_PATH)

datagen = ImageDataGenerator()

test_generator = datagen.flow_from_directory(
    TEST_DIR,
    target_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="binary",
    shuffle=False
)

probabilities = model.predict(
    test_generator,
    verbose=1
).ravel()

true_labels = test_generator.classes

print("\nClass mapping:")
print(test_generator.class_indices)

print("\nTotal test images:", len(true_labels))

print("\nROC-AUC:")
print(round(roc_auc_score(true_labels, probabilities), 4))


thresholds = np.arange(
    0.30,
    0.71,
    0.05
)

results = []

for threshold in thresholds:
    predictions = (
        probabilities >= threshold
    ).astype(int)

    results.append({
        "threshold": round(float(threshold), 2),
        "accuracy": round(
            accuracy_score(
                true_labels,
                predictions
            ),
            4
        ),
        "precision": round(
            precision_score(
                true_labels,
                predictions,
                zero_division=0
            ),
            4
        ),
        "recall": round(
            recall_score(
                true_labels,
                predictions,
                zero_division=0
            ),
            4
        ),
        "f1": round(
            f1_score(
                true_labels,
                predictions,
                zero_division=0
            ),
            4
        )
    })


results_df = pd.DataFrame(results)

print("\nThreshold analysis:")
print(
    results_df.to_string(
        index=False
    )
)


threshold = 0.44

predictions = (
    probabilities >= threshold
).astype(int)

cm = confusion_matrix(
    true_labels,
    predictions
)

print("\nConfusion matrix at threshold 0.44:")
print(cm)


false_negative_indices = np.where(
    (true_labels == 1) &
    (predictions == 0)
)[0]

print(
    "\nMalignant false negatives:",
    len(false_negative_indices)
)


filenames = test_generator.filenames

false_negative_data = []

for index in false_negative_indices:
    false_negative_data.append({
        "filename": filenames[index],
        "malignant_probability": round(
            float(probabilities[index]),
            4
        ),
        "predicted_class": "Benign",
        "actual_class": "Malignant"
    })


false_negative_df = pd.DataFrame(
    false_negative_data
)

false_negative_df = false_negative_df.sort_values(
    "malignant_probability"
)

output_path = os.path.join(
    BASE_DIR,
    "models",
    "false_negative_analysis.csv"
)

false_negative_df.to_csv(
    output_path,
    index=False
)

print(
    "\nFalse-negative analysis saved to:",
    output_path
)

print("\nLowest malignant probabilities among false negatives:")

print(
    false_negative_df.head(20).to_string(
        index=False
    )
)
