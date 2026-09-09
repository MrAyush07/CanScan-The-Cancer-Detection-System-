import io
import os

import numpy as np
import tensorflow as tf
from fastapi import FastAPI, File, UploadFile
from PIL import Image
from tensorflow.keras.applications.densenet import preprocess_input

app = FastAPI(title="CanScan ML API")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "skin_densenet121_weighted.keras")

model = tf.keras.models.load_model(MODEL_PATH)

IMAGE_SIZE = (224, 224)
THRESHOLD = 0.56


@app.get("/")
def root():
    return {"message": "CanScan ML API is running"}


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model": "DenseNet121 weighted"
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    image_bytes = await file.read()

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image = image.resize(IMAGE_SIZE)

    image_array = np.array(image, dtype=np.float32)
    image_array = np.expand_dims(image_array, axis=0)

    image_array = preprocess_input(image_array)

    probability = float(
        model.predict(image_array, verbose=0)[0][0]
    )

    if probability >= THRESHOLD:
        prediction = "Malignant/High-Risk"
        confidence = probability
    else:
        prediction = "Benign"
        confidence = 1 - probability

    return {
        "prediction": prediction,
        "confidence": round(confidence * 100, 2),
        "malignant_probability": round(probability * 100, 2),
        "threshold": THRESHOLD
    }