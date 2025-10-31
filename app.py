import io
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import os
import json
import numpy as np
from PIL import Image
import tensorflow as tf

# ----------------------------------------
# 🌿 Flask Setup
# ----------------------------------------
app = Flask(__name__)
CORS(app)

# ----------------------------------------
# 🌾 Crop Prediction Model Setup
# ----------------------------------------
MODEL_PATH = "models/crop_model.pkl"
model = joblib.load(MODEL_PATH)

@app.route('/')
def index():
    return jsonify({
        "message": "🌾 AgriFusion API running successfully!",
        "routes": {
            "/predict": "Crop prediction (JSON input)",
            "/predict_disease": "Plant disease detection (image upload)"
        }
    })

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    required = ['N', 'P', 'K', 'temperature', 'humidity', 'ph']

    if not data or any(k not in data for k in required):
        return jsonify({
            "error": "Missing one or more required fields",
            "required": required
        }), 400

    row = pd.DataFrame([{
        'N': float(data['N']),
        'P': float(data['P']),
        'K': float(data['K']),
        'temperature': float(data['temperature']),
        'humidity': float(data['humidity']),
        'ph': float(data['ph'])
    }])

    try:
        pred = model.predict(row)
        return jsonify({"prediction": str(pred[0])})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ----------------------------------------
# 🌱 Disease Prediction Model Setup
# ----------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DISEASE_MODEL_PATH = os.path.join(BASE_DIR, "models", "plant_disease_prediction_model.h5")
CLASS_INDICES_PATH = os.path.join(BASE_DIR, "class_indices.json")
DISEASE_SOLUTIONS_PATH = os.path.join(BASE_DIR, "disease_solutions.json")

# ✅ Load model
if not os.path.exists(DISEASE_MODEL_PATH):
    print("⚠️ disease_model.h5 not found — disease prediction disabled.")
    disease_model = None
else:
    disease_model = tf.keras.models.load_model(DISEASE_MODEL_PATH)
    print("✅ Disease model loaded successfully.")

# ✅ Load class indices (reverse mapping)
if os.path.exists(CLASS_INDICES_PATH):
    with open(CLASS_INDICES_PATH, "r", encoding="utf-8") as f:
        class_indices = json.load(f)
    label_map = {v: k for k, v in class_indices.items()}
else:
    label_map = {}

# ✅ Load disease solutions
if os.path.exists(DISEASE_SOLUTIONS_PATH):
    with open(DISEASE_SOLUTIONS_PATH, "r", encoding="utf-8") as f:
        disease_solutions = json.load(f)
else:
    disease_solutions = {}

# ----------------------------------------
# 🔍 Disease Prediction Endpoint
# ----------------------------------------
@app.route("/predict_disease", methods=["POST"])
def predict_disease():
    try:
        file = request.files["image"]
        if not file:
            return jsonify({"error": "No image uploaded"}), 400

        # --- Open and preprocess the image ---
        image = Image.open(io.BytesIO(file.read())).convert("RGB")

        # ✅ Center crop for consistency
        width, height = image.size
        min_dim = min(width, height)
        left = (width - min_dim) / 2
        top = (height - min_dim) / 2
        right = (width + min_dim) / 2
        bottom = (height + min_dim) / 2
        image = image.crop((left, top, right, bottom))
        image = image.resize((224, 224))

        img_array = np.expand_dims(np.array(image) / 255.0, axis=0)

        # --- Predict using your disease model ---
        predictions = disease_model.predict(img_array)
        confidence = float(np.max(predictions))
        predicted_class = str(np.argmax(predictions))
        disease_name = label_map.get(int(predicted_class), "Unknown")

        # ✅ Handle unknown disease class
        if disease_name == "Unknown":
            return jsonify({
                "prediction": "Unknown",
                "solution": {
                    "type": "General Advice",
                    "solution": "Please upload a clearer leaf image or verify that your dataset includes this class.",
                    "organic": ""
                }
            })

        # ✅ Low-confidence prediction handling
        if confidence < 0.20:
            return jsonify({
                "prediction": disease_name,
                "solution": {
                    "type": "Low Confidence",
                    "solution": "Uncertain prediction. Try uploading a clearer image.",
                    "organic": ""
                }
            })

        # ✅ Fetch solution from JSON
        solution = disease_solutions.get(disease_name)

        # ✅ If solution found
        if solution:
            return jsonify({
                "prediction": disease_name,
                "solution": solution
            })

        # ✅ If not found but not healthy
        if "healthy" not in disease_name.lower():
            return jsonify({
                "prediction": disease_name,
                "solution": {
                    "type": "General Advice",
                    "solution": "Consult an agricultural expert for further diagnosis.",
                    "organic": ""
                }
            })

        # ✅ Healthy leaf case
        return jsonify({
            "prediction": disease_name,
            "solution": {
                "type": "None",
                "solution": "Crop is healthy.",
                "organic": "No treatment required."
            }
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500



# ----------------------------------------
# Run Server
# ----------------------------------------
if __name__ == '__main__':
    app.run(debug=True, port=5000)
