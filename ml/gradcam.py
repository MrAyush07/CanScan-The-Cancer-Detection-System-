import numpy as np
import tensorflow as tf
from PIL import Image
from tensorflow.keras.applications.densenet import preprocess_input


IMAGE_SIZE = (224, 224)


def make_gradcam_heatmap(image, model):
    base_model = model.get_layer("densenet121")

    grad_model = tf.keras.models.Model(
        inputs=model.inputs,
        outputs=[
            base_model.get_layer("conv5_block16_concat").output,
            model.output
        ]
    )

    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(image)
        prediction = predictions[:, 0]

    gradients = tape.gradient(
        prediction,
        conv_outputs
    )

    pooled_gradients = tf.reduce_mean(
        gradients,
        axis=(0, 1, 2)
    )

    conv_outputs = conv_outputs[0]

    heatmap = conv_outputs @ pooled_gradients[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)

    heatmap = tf.maximum(heatmap, 0)
    heatmap /= tf.maximum(
        tf.reduce_max(heatmap),
        tf.keras.backend.epsilon()
    )

    return heatmap.numpy()


def prepare_image(image_path):
    image = Image.open(image_path).convert("RGB")
    original = image.copy()

    image = image.resize(IMAGE_SIZE)

    image_array = np.array(
        image,
        dtype=np.float32
    )

    image_array = np.expand_dims(
        image_array,
        axis=0
    )

    image_array = preprocess_input(
        image_array
    )

    return original, image_array