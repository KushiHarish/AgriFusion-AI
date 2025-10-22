# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd

app = Flask(__name__)
CORS(app)  # allow cross-origin requests

MODEL_PATH = "models/crop_model.pkl"
model = joblib.load(MODEL_PATH)

@app.route('/')
def index():
    return "AgriFusion ML API running"

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    required = ['N','P','K','temperature','humidity','ph','rainfall']
    if not data or any(k not in data for k in required):
        return jsonify({"error":"Missing one or more required fields", "required": required}), 400

    # Build single-row DataFrame with correct column order
    row = pd.DataFrame([{
        'N': float(data['N']),
        'P': float(data['P']),
        'K': float(data['K']),
        'temperature': float(data['temperature']),
        'humidity': float(data['humidity']),
        'ph': float(data['ph']),
        'rainfall': float(data['rainfall'])
    }])

    try:
        pred = model.predict(row)
        return jsonify({"prediction": str(pred[0])})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
