import os
import shutil
import pandas as pd
from sklearn.model_selection import train_test_split

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(BASE_DIR, "data", "skin", "raw")
OUTPUT_DIR = os.path.join(BASE_DIR, "data", "skin")

METADATA_FILE = os.path.join(RAW_DIR, "HAM10000_metadata.tab")

IMAGE_DIRS = [
    os.path.join(RAW_DIR, "HAM10000_images_part_1"),
    os.path.join(RAW_DIR, "HAM10000_images_part_2")
]

BENIGN_CLASSES = ["nv", "bkl", "df"]
MALIGNANT_CLASSES = ["mel", "bcc", "akiec"]

RANDOM_STATE = 42


def find_image(image_id):
    filename = image_id + ".jpg"

    for directory in IMAGE_DIRS:
        path = os.path.join(directory, filename)

        if os.path.exists(path):
            return path

    return None


def clean_output_directories():
    for split in ["train", "val", "test"]:
        split_dir = os.path.join(OUTPUT_DIR, split)

        if os.path.exists(split_dir):
            shutil.rmtree(split_dir)


def create_directories():
    directories = [
        os.path.join(OUTPUT_DIR, "train", "benign"),
        os.path.join(OUTPUT_DIR, "train", "malignant"),
        os.path.join(OUTPUT_DIR, "val", "benign"),
        os.path.join(OUTPUT_DIR, "val", "malignant"),
        os.path.join(OUTPUT_DIR, "test", "benign"),
        os.path.join(OUTPUT_DIR, "test", "malignant")
    ]

    for directory in directories:
        os.makedirs(directory, exist_ok=True)


def main():
    print("Loading HAM10000 metadata...")

    if not os.path.exists(METADATA_FILE):
        raise FileNotFoundError(
            f"Metadata file not found: {METADATA_FILE}"
        )

    metadata = pd.read_csv(METADATA_FILE, sep=",")

    print(f"Total metadata records: {len(metadata)}")

    metadata = metadata[
        metadata["dx"].isin(BENIGN_CLASSES + MALIGNANT_CLASSES)
    ].copy()

    metadata["label"] = metadata["dx"].apply(
        lambda x: "benign" if x in BENIGN_CLASSES else "malignant"
    )

    print(f"Selected records: {len(metadata)}")

    print("\nClass distribution:")
    print(metadata["label"].value_counts())

    print("\nChecking lesion labels...")

    lesion_label_counts = metadata.groupby("lesion_id")["label"].nunique()

    conflicting_lesions = lesion_label_counts[
        lesion_label_counts > 1
    ]

    if len(conflicting_lesions) > 0:
        raise RuntimeError(
            f"Found {len(conflicting_lesions)} lesions with conflicting labels."
        )

    print("No conflicting lesion labels found.")

    records = []

    print("\nLocating images...")

    for _, row in metadata.iterrows():
        image_path = find_image(row["image_id"])

        if image_path is not None:
            records.append({
                "lesion_id": row["lesion_id"],
                "image_id": row["image_id"],
                "image_path": image_path,
                "dx": row["dx"],
                "label": row["label"]
            })

    dataset = pd.DataFrame(records)

    print(f"Images found: {len(dataset)}")

    if len(dataset) == 0:
        raise RuntimeError("No images were found.")

    lesions = dataset[
        ["lesion_id", "label"]
    ].drop_duplicates()

    print(f"Unique lesions: {len(lesions)}")

    train_lesions, temp_lesions = train_test_split(
        lesions,
        test_size=0.2,
        stratify=lesions["label"],
        random_state=RANDOM_STATE
    )

    val_lesions, test_lesions = train_test_split(
        temp_lesions,
        test_size=0.5,
        stratify=temp_lesions["label"],
        random_state=RANDOM_STATE
    )

    train_ids = set(train_lesions["lesion_id"])
    val_ids = set(val_lesions["lesion_id"])
    test_ids = set(test_lesions["lesion_id"])

    train = dataset[dataset["lesion_id"].isin(train_ids)].copy()
    val = dataset[dataset["lesion_id"].isin(val_ids)].copy()
    test = dataset[dataset["lesion_id"].isin(test_ids)].copy()

    print("\nDataset split by lesion:")

    print(f"Train images: {len(train)}")
    print(f"Validation images: {len(val)}")
    print(f"Test images: {len(test)}")

    print(f"\nTrain lesions: {len(train_ids)}")
    print(f"Validation lesions: {len(val_ids)}")
    print(f"Test lesions: {len(test_ids)}")

    print("\nSplit class distribution:")

    print("\nTrain:")
    print(train["label"].value_counts())

    print("\nValidation:")
    print(val["label"].value_counts())

    print("\nTest:")
    print(test["label"].value_counts())

    overlap_train_val = train_ids.intersection(val_ids)
    overlap_train_test = train_ids.intersection(test_ids)
    overlap_val_test = val_ids.intersection(test_ids)

    if overlap_train_val or overlap_train_test or overlap_val_test:
        raise RuntimeError("Lesion leakage detected between splits.")

    print("\nLesion leakage check: PASSED")

    clean_output_directories()
    create_directories()

    splits = {
        "train": train,
        "val": val,
        "test": test
    }

    print("\nCopying images...")

    for split_name, split_data in splits.items():
        for _, row in split_data.iterrows():
            destination_dir = os.path.join(
                OUTPUT_DIR,
                split_name,
                row["label"]
            )

            destination = os.path.join(
                destination_dir,
                row["image_id"] + ".jpg"
            )

            shutil.copy2(
                row["image_path"],
                destination
            )

    train.to_csv(
        os.path.join(OUTPUT_DIR, "train_metadata.csv"),
        index=False
    )

    val.to_csv(
        os.path.join(OUTPUT_DIR, "val_metadata.csv"),
        index=False
    )

    test.to_csv(
        os.path.join(OUTPUT_DIR, "test_metadata.csv"),
        index=False
    )

    print("\nDataset preparation completed successfully.")


if __name__ == "__main__":
    main()