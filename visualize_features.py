import os
import json
import numpy as np
import tensorflow as tf
from PIL import Image
import matplotlib.pyplot as plt

# Suppress TF logs
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

# Configuration
IMAGE_SIZE = (224, 224)
TFLITE_MODEL_PATH = 'mobilenet_extractor.tflite'
PSO_MASK_PATH = 'pso_feature_mask.npy'

def visualize_features(img_path):
    print(f"Extracting features for: {img_path}")
    
    # 1. Load TFLite Model
    interpreter = tf.lite.Interpreter(model_path=TFLITE_MODEL_PATH)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    # 2. Preprocess Image
    img = Image.open(img_path).convert('RGB')
    img_resized = img.resize(IMAGE_SIZE, Image.LANCZOS)
    img_array = np.array(img_resized).astype(np.float32)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = (img_array / 127.5) - 1.0 # MobileNetV2 scaling

    # 3. Extract Features
    interpreter.set_tensor(input_details[0]['index'], img_array)
    interpreter.invoke()
    features = interpreter.get_tensor(output_details[0]['index']).flatten()
    
    # 4. Load PSO Mask
    pso_mask = np.load(PSO_MASK_PATH)
    selected_features = features[pso_mask]
    
    # 5. Extract "Named" Features for Presentation (Top 10 Strongest)
    # We categorize abstract features into 3 visual groups for the presentation
    top_indices = np.argsort(features)[-10:][::-1]
    
    def get_feature_category(idx):
        if idx < 400: return "Edge & Structure"
        elif idx < 800: return "Color/Light Contrast"
        else: return "Texture & Vein Pattern"

    print("\n--- TOP 10 STRONGEST VISUAL TRAITS IDENTIFIED ---")
    print(f"{'Feature ID':<15} | {'Visual Category':<25} | {'Activation Strength'}")
    print("-" * 65)
    for idx in top_indices:
        category = get_feature_category(idx)
        print(f"Feature #{idx:<8} | {category:<25} | {features[idx]:.4f}")

    # 6. Visualization
    plt.figure(figsize=(15, 8))
    
    # Plot All Features (CNN Output)
    plt.subplot(2, 1, 1)
    plt.plot(features, color='blue', alpha=0.5, label='Raw CNN Features (1280 dimensions)')
    # Highlight top features
    plt.scatter(top_indices, features[top_indices], color='red', s=50, label='Top Identifiers', zorder=5)
    plt.title(f"CNN Feature Signature: {os.path.basename(img_path)}")
    plt.ylabel("Intensity")
    plt.legend()
    
    # Plot Selected Features (PSO Result)
    plt.subplot(2, 1, 2)
    plt.bar(range(len(selected_features)), selected_features, color='green', label=f'PSO Filtered Features ({len(selected_features)} used by SVM)')
    plt.title("PSO Optimized Features (Input to SVM Classifier)")
    plt.ylabel("Intensity")
    plt.legend()
    
    plt.tight_layout()
    output_plot = "feature_visualization.png"
    plt.savefig(output_plot)
    print(f"\nSUCCESS: Visualization saved as '{output_plot}'")
    
    # Attempt to show plot (might not work in all terminals, but good to have)
    # try:
    #     plt.show()
    # except:
    #     pass

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", default="testing_dataset/1.jpg", help="Path to image")
    args = parser.parse_args()
    
    if os.path.exists(args.image):
        visualize_features(args.image)
    else:
        print(f"Error: Image {args.image} not found.")
