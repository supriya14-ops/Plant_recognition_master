import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
import numpy as np
import os

print("Exporting MobileNetV2 feature extractor...")
# Define the model with fixed pooling for feature extraction
model = MobileNetV2(weights='imagenet', include_top=False, pooling='avg', input_shape=(224, 224, 3))

# Convert the model to TFLite
converter = tf.lite.TFLiteConverter.from_keras_model(model)
tflite_model = converter.convert()

# Save the model
with open('mobilenet_extractor.tflite', 'wb') as f:
    f.write(tflite_model)

print("Optimization complete: 'mobilenet_extractor.tflite' saved.")
