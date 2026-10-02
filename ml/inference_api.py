import io
import os
import uuid

import cv2
import numpy as np
import tensorflow as tf
from fastapi import FastAPI, File, UploadFile
from fastapi.staticfiles import StaticFiles
from PIL import Image

from gradcam import make_gradcam_heatmap

app = FastAPI(title="CanScan ML API")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR,"models","skin_densenet121_weighted.h5")

GENERATED_DIR = os.path.join(BASE_DIR, "generated")
os.makedirs(GENERATED_DIR, exist_ok=True)

model = tf.keras.models.load_model(MODEL_PATH)

IMAGE_SIZE = (224, 224)
THRESHOLD = 0.44

app.mount(
    "/generated",
    StaticFiles(directory=GENERATED_DIR),
    name="generated"
)


@app.get("/")
def root():
    return {
        "message": "CanScan ML API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model": "DenseNet121 weighted"
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    image_bytes = await file.read()

    original = Image.open(
        io.BytesIO(image_bytes)
    ).convert("RGB")

    image = original.resize(IMAGE_SIZE)

    image_array = np.array(
        image,
        dtype=np.float32
    )

    image_array = np.expand_dims(
        image_array,
        axis=0
    )


    probability = float(
        model.predict(
            image_array,
            verbose=0
        )[0][0]
    )

    if probability >= THRESHOLD:
        prediction = "Malignant/High-Risk"
        confidence = probability
    else:
        prediction = "Benign"
        confidence = 1 - probability

    heatmap = make_gradcam_heatmap(
        image_array,
        model
    )

    heatmap_resized = cv2.resize(
        heatmap,
        (original.width, original.height)
    )

    heatmap_uint8 = np.uint8(
        255 * heatmap_resized
    )

    colored_heatmap = cv2.applyColorMap(
        heatmap_uint8,
        cv2.COLORMAP_JET
    )

    original_array = np.array(original)

    original_array = cv2.cvtColor(
        original_array,
        cv2.COLOR_RGB2BGR
    )

    overlay = cv2.addWeighted(
        original_array,
        0.6,
        colored_heatmap,
        0.4,
        0
    )

    filename = f"{uuid.uuid4().hex}_gradcam.jpg"

    output_path = os.path.join(
        GENERATED_DIR,
        filename
    )

    cv2.imwrite(
        output_path,
        overlay
    )

    return {
        "prediction": prediction,
        "confidence": round(confidence * 100, 2),
        "malignant_probability": round(
            probability * 100,
            2
        ),
        "threshold": THRESHOLD,
        "heatmap_url": f"/generated/{filename}"
    }