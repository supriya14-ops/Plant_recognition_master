import os
import io
import json
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.preprocessing import image
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score
import pyswarms as ps
import joblib

# Configuration
IMAGE_SIZE = (224, 224)
BATCH_SIZE = 32
TRAIN_DIR = "training_plant_images"
TEST_DIR = "testing_dataset"
NUM_PARTICLES = 15
NUM_ITERATIONS = 20
MAX_FEATURES_TO_SELECT = 200 # Optional max features

def load_data_and_extract_features(data_dir, feature_extractor):
    print(f"Loading images and extracting features from: {data_dir}")
    features = []
    labels = []
    class_names = sorted(os.listdir(data_dir))
    
    for label_idx, class_name in enumerate(class_names):
        class_path = os.path.join(data_dir, class_name)
        if not os.path.isdir(class_path):
            continue
            
        print(f"Processing class: {class_name}")
        for img_name in os.listdir(class_path):
            img_path = os.path.join(class_path, img_name)
            try:
                img = image.load_img(img_path, target_size=IMAGE_SIZE)
                img_array = image.img_to_array(img)
                img_array = np.expand_dims(img_array, axis=0)
                img_array = preprocess_input(img_array)
                
                # Extract features
                feature_vector = feature_extractor.predict(img_array, verbose=0)
                features.append(feature_vector.flatten())
                labels.append(label_idx)
            except Exception as e:
                print(f"Error loading {img_path}: {e}")
                
    return np.array(features), np.array(labels), class_names

def f_per_particle(m, alpha, X_train, y_train, X_test, y_test):
    """Computes objective function for a single particle."""
    # Ensure m has at least one selected feature
    if np.sum(m) == 0:
        return 1.0 # High penalty if no features selected
        
    # Get the selected features
    X_train_subset = X_train[:, m]
    X_test_subset = X_test[:, m]
    
    # Train SVM
    clf = SVC(kernel='linear')
    clf.fit(X_train_subset, y_train)
    
    # Predict and calculate error
    y_pred = clf.predict(X_test_subset)
    accuracy = accuracy_score(y_test, y_pred)
    error = 1.0 - accuracy
    
    # Objective merges error and number of features
    # alpha controls the tradeoff (higher alpha = care more about minimizing features)
    j = (alpha * error) + (1.0 - alpha) * (np.sum(m) / X_train.shape[1])
    return j

def f(x, alpha, X_train, y_train, X_test, y_test):
    """Objective function for the swarm."""
    n_particles = x.shape[0]
    j = [f_per_particle(x[i] > 0.5, alpha, X_train, y_train, X_test, y_test) for i in range(n_particles)]
    return np.array(j)

def main():
    # 1. Setup Feature Extractor (MobileNetV2 without the top classification layer)
    print("Loading MobileNetV2 for feature extraction...")
    base_model = MobileNetV2(weights='imagenet', include_top=False, pooling='avg', input_shape=(IMAGE_SIZE[0], IMAGE_SIZE[1], 3))
    
    # 2. Extract Features
    X, y, class_names = load_data_and_extract_features(TRAIN_DIR, base_model)
    print(f"Extracted features shape: {X.shape}")
    print(f"Labels shape: {y.shape}")
    
    # Save class names
    with open('class_names.json', 'w') as json_file:
        json.dump(class_names, json_file)
        
    # 3. Split Data for PSO evaluation
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # 4. Setup PSO
    print("Setting up Particle Swarm Optimization for Feature Selection...")
    n_features = X.shape[1]
    
    # Define bounds: 0 or 1 for feature selection
    options = {'c1': 0.5, 'c2': 0.5, 'w': 0.9}
    
    # Continuous to binary mapping will happen in f_per_particle (x > 0.5)
    bounds = (np.zeros(n_features), np.ones(n_features))
    
    optimizer = ps.single.GlobalBestPSO(n_particles=NUM_PARTICLES, 
                                        dimensions=n_features, 
                                        options=options, 
                                        bounds=bounds)
    
    # 5. Run PSO
    print("Running PSO...")
    cost, pos = optimizer.optimize(f, iters=NUM_ITERATIONS, alpha=0.8, 
                                   X_train=X_train, y_train=y_train, 
                                   X_test=X_test, y_test=y_test)
                                   
    # 6. Get optimal feature mask
    optimal_feature_mask = (pos > 0.5)
    print(f"Selected {np.sum(optimal_feature_mask)} out of {n_features} features.")
    
    # Save the mask
    np.save('pso_feature_mask.npy', optimal_feature_mask)
    
    # 7. Train Final Classifier on optimized features using all Data
    print("Training final SVM classifier on selected features...")
    X_optimized = X[:, optimal_feature_mask]
    final_svm = SVC(kernel='linear', probability=True)
    final_svm.fit(X_optimized, y)
    
    # Save Final Model
    joblib.dump(final_svm, 'svm_model.joblib')
    print("Model saved to svm_model.joblib")
    
if __name__ == "__main__":
    main()
