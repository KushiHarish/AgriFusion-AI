# app.py
import io
import os
import json
import joblib
import pandas as pd
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf

app = Flask(__name__)
CORS(app)

# ---------------- Crop Model ----------------
CROP_MODEL_PATH = "models/crop_model.pkl"
crop_model = joblib.load(CROP_MODEL_PATH)

# ---------------- Disease Model ----------------
DISEASE_MODEL_PATH = "models/plant_disease_prediction_model.h5"
CLASS_INDICES_PATH = "class_indices.json"
DISEASE_SOLUTIONS_PATH = "disease_solutions.json"

disease_model = tf.keras.models.load_model(DISEASE_MODEL_PATH) if os.path.exists(DISEASE_MODEL_PATH) else None

if os.path.exists(CLASS_INDICES_PATH):
    with open(CLASS_INDICES_PATH, "r") as f:
        class_indices = json.load(f)
    label_map = {v: k for k, v in class_indices.items()}
else:
    label_map = {}

if os.path.exists(DISEASE_SOLUTIONS_PATH):
    with open(DISEASE_SOLUTIONS_PATH, "r") as f:
        disease_solutions = json.load(f)
else:
    disease_solutions = {}

# ---------------- Fertilizer Model ----------------
FERTILIZER_MODEL_PATH = "models/fertilizer_model.pkl"
SOIL_ENCODER_PATH = "models/soil_encoder.pkl"
CROP_ENCODER_PATH = "models/crop_encoder.pkl"
DOSE_CSV_PATH = "data/Fertilizer_dose.csv"

fertilizer_model = joblib.load(FERTILIZER_MODEL_PATH)
soil_encoder = joblib.load(SOIL_ENCODER_PATH)
crop_encoder = joblib.load(CROP_ENCODER_PATH)
dose_df = pd.read_csv(DOSE_CSV_PATH)

# ---------------- Routes ----------------
@app.route("/predict_crop", methods=["POST"])
def predict_crop():
    data = request.get_json()
    required = ['N', 'P', 'K', 'temperature', 'humidity', 'ph']
    if not data or any(k not in data for k in required):
        return jsonify({"error": "Missing fields", "required": required}), 400

    row = pd.DataFrame([{
        'N': float(data['N']),
        'P': float(data['P']),
        'K': float(data['K']),
        'temperature': float(data['temperature']),
        'humidity': float(data['humidity']),
        'ph': float(data['ph'])
    }])

    pred = crop_model.predict(row)
    return jsonify({"prediction": str(pred[0])})


@app.route("/get_fertilizer", methods=["GET"])
def get_fertilizer():
    crop_type = request.args.get('crop', '').strip().lower()
    soil_type = request.args.get('soil', 'loam').strip().lower()
    land_size = float(request.args.get('landSize', 1))
    land_unit = request.args.get('landUnit', 'hectares').lower()
    
    # Get actual NPK values from request
    nitrogen = float(request.args.get('nitrogen', 60))
    phosphorus = float(request.args.get('phosphorus', 40))
    potassium = float(request.args.get('potassium', 30))

    # Convert land size to hectares
    if land_unit == "acres":
        land_ha = land_size * 0.404686
    elif land_unit == "sq_m":
        land_ha = land_size / 10000
    else:
        land_ha = land_size

    try:
        # Encode categorical variables
        encoded_soil = soil_encoder.transform([soil_type])[0]
        encoded_crop = crop_encoder.transform([crop_type])[0]
        
        # Use actual NPK values from farmer's soil data
        X_new = [[encoded_soil, encoded_crop, nitrogen, phosphorus, potassium]]
        
        # Predict fertilizer
        predicted_fertilizer = fertilizer_model.predict(X_new)[0]

        # Get ALL fertilizer options for this crop from CSV
        all_crop_fertilizers = dose_df[
            dose_df['Crop Type'].str.lower().str.strip() == crop_type
        ]

        if all_crop_fertilizers.empty:
            return jsonify({
                "error": f"No fertilizer data available for crop: {crop_type}",
                "availableCrops": dose_df['Crop Type'].unique().tolist()
            }), 404

        # Separate organic and chemical fertilizers
        organic_options = []
        chemical_options = []

        for _, row in all_crop_fertilizers.iterrows():
            fert_type = str(row.get('Fertilizer Type', '')).strip().lower()
            
            fert_data = {
                "name": row['Fertilizer Name'],
                "type": row.get('Fertilizer Type', 'N/A'),
                "N": round(row['N (kg/ha)'] * land_ha, 2),
                "P": round(row['P (kg/ha)'] * land_ha, 2),
                "K": round(row['K (kg/ha)'] * land_ha, 2),
                "notes": row.get('Notes', ''),
                "nPerHa": row['N (kg/ha)'],
                "pPerHa": row['P (kg/ha)'],
                "kPerHa": row['K (kg/ha)']
            }
            
            if fert_type == 'organic':
                organic_options.append(fert_data)
            else:
                chemical_options.append(fert_data)

        # Build comprehensive result
        result = {
            "predictedFertilizer": predicted_fertilizer,
            "organicOptions": organic_options,
            "chemicalOptions": chemical_options,
            "recommendation": {
                "primary": organic_options[0] if organic_options else chemical_options[0] if chemical_options else None,
                "message": "🌿 Organic fertilizers recommended for sustainable farming" if organic_options else "⚗️ Chemical fertilizers available"
            },
            "cropType": crop_type.title(),
            "soilType": soil_type.title(),
            "landSize": land_size,
            "landUnit": land_unit,
            "currentSoilNPK": {
                "N": nitrogen,
                "P": phosphorus,
                "K": potassium
            }
        }
        
        return jsonify(result)
        
    except ValueError as e:
        return jsonify({
            "error": f"Invalid crop or soil type: {str(e)}",
            "validCrops": list(crop_encoder.classes_),
            "validSoils": list(soil_encoder.classes_)
        }), 400
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/predict_disease", methods=["POST"])
def predict_disease():
    try:
        file = request.files["image"]
        if not file or disease_model is None:
            return jsonify({"error": "No image uploaded or disease model missing"}), 400

        image = Image.open(io.BytesIO(file.read())).convert("RGB")
        w, h = image.size
        min_dim = min(w, h)
        left = (w - min_dim) / 2
        top = (h - min_dim) / 2
        right = left + min_dim
        bottom = top + min_dim
        image = image.crop((left, top, right, bottom))
        image = image.resize((224, 224))
        img_array = np.expand_dims(np.array(image)/255.0, axis=0)

        predictions = disease_model.predict(img_array)
        predicted_class = str(np.argmax(predictions))
        disease_name = label_map.get(int(predicted_class), "Unknown")

        if disease_name in disease_solutions:
            solution = disease_solutions[disease_name]
        elif "healthy" in disease_name.lower():
            solution = {"type":"None","solution":"Crop is healthy.","organic":"No treatment required."}
        else:
            solution = {"type":"General Advice","solution":"Consult an expert.","organic":""}

        return jsonify({"prediction": disease_name,"solution": solution})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5001)
