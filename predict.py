import json
import os
import sys

# Suppress TensorFlow logs immediately
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

def load_models():
    # Lazy imports inside the loader
    import numpy as np
    import tensorflow as tf
    import joblib
    
    # Configuration
    IMAGE_SIZE = (224, 224)
    TFLITE_MODEL_PATH = 'mobilenet_extractor.tflite'
    
    # Load TFLite Interpreter
    interpreter = tf.lite.Interpreter(model_path=TFLITE_MODEL_PATH)
    interpreter.allocate_tensors()
    
    # Load SVM and PSO mask
    pso_feature_mask = np.load('pso_feature_mask.npy')
    svm_model = joblib.load('svm_model.joblib')
    
    with open('class_names.json', 'r') as f:
        class_names = json.load(f)
        
    return interpreter, pso_feature_mask, svm_model, class_names

def process_image(img_path, interpreter, pso_feature_mask, svm_model, class_names):
    from PIL import Image
    import numpy as np
    
    IMAGE_SIZE = (224, 224)
    
    # Preprocess
    img = Image.open(img_path).convert('RGB')
    img = img.resize(IMAGE_SIZE, Image.LANCZOS)
    img_array = np.array(img).astype(np.float32)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = (img_array / 127.5) - 1.0
    
    # Extract features
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    interpreter.set_tensor(input_details[0]['index'], img_array)
    interpreter.invoke()
    features = interpreter.get_tensor(output_details[0]['index']).flatten()
    
    # Apply PSO and Predict
    optimized_features = features[pso_feature_mask].reshape(1, -1)
    prediction_idx = svm_model.predict(optimized_features)[0]
    
    # Confidence
    confidence = 1.0
    if hasattr(svm_model, 'predict_proba'):
        try:
            probabilities = svm_model.predict_proba(optimized_features)[0]
            confidence = float(np.max(probabilities))
        except:
            pass
            
    return class_names[prediction_idx], confidence

if __name__ == "__main__":
    # Signal that we are loading
    # sys.stderr.write("LOADING_MODELS\n")
    
    try:
        interpreter, pso_mask, svm, classes = load_models()
        # Signal that we are ready
        # sys.stderr.write("READY\n")
        
        while True:
            # Wait for image path from stdin
            line = sys.stdin.readline()
            if not line:
                break
                
            img_path = line.strip()
            if not img_path:
                continue
                
            try:
                prediction, confidence = process_image(img_path, interpreter, pso_mask, svm, classes)
                print(json.dumps({
                    "status": "success", 
                    "prediction": prediction, 
                    "confidence": confidence
                }), flush=True) # Flush is CRITICAL for persistent process
            except Exception as e:
                print(json.dumps({"status": "error", "message": str(e)}), flush=True)
                
    except Exception as e:
        sys.stderr.write(f"FATAL_ERROR: {str(e)}\n")
        sys.exit(1)
