import pickle
import pandas as pd
import os

# -----------------------------
# STEP 1: Load trained model and encoders
# -----------------------------
try:
    with open("models/fertilizer_model.pkl", "rb") as f:
        model = pickle.load(f)
    with open("models/soil_encoder.pkl", "rb") as f:
        soil_encoder = pickle.load(f)
    with open("models/crop_encoder.pkl", "rb") as f:
        crop_encoder = pickle.load(f)
    print("✅ Fertilizer model and encoders loaded successfully!")
except Exception as e:
    print("❌ Error loading model or encoders:", e)
    exit()

# -----------------------------
# STEP 2: Create a sample input
# -----------------------------
sample = {
    "Soil Type": "Loam",
    "Crop Type": "maize",
    "Nitrogen": 60,
    "Phosphorus": 40,
    "Potassium": 30
}

# -----------------------------
# STEP 3: Encode input
# -----------------------------
try:
    encoded_soil = soil_encoder.transform([sample["Soil Type"].lower()])[0]
    encoded_crop = crop_encoder.transform([sample["Crop Type"].lower()])[0]
except Exception as e:
    print("❌ Encoding error:", e)
    exit()

# Prepare input for model
X_new = [[encoded_soil, encoded_crop, sample["Nitrogen"], sample["Phosphorus"], sample["Potassium"]]]

# -----------------------------
# STEP 4: Predict fertilizer
# -----------------------------
try:
    prediction = model.predict(X_new)[0]
    print(f"\n🌱 Recommended Fertilizer: {prediction}")
except Exception as e:
    print("❌ Error during prediction:", e)
    exit()

# -----------------------------
# STEP 5: Load Fertilizer_dose.csv for extra details
# -----------------------------
dose_file = "data/Fertilizer_dose.csv"
if os.path.exists(dose_file):
    df = pd.read_csv(dose_file)
    df.columns = [c.strip() for c in df.columns]

    crop_name = sample["Crop Type"].split()[0].capitalize()

    # Case-insensitive and whitespace-safe matching
    fert_info = df[
        (df["Crop Type"].str.lower().str.strip() == crop_name.lower().strip()) &
        (df["Fertilizer Name"].str.lower().str.strip() == prediction.lower().strip())
    ]

    if not fert_info.empty:
        print("\n📘 Fertilizer Details:")
        for _, row in fert_info.iterrows():
            print(f"- Crop: {row['Crop Type']}")
            print(f"- Fertilizer Type: {row['Fertilizer Type']}")
            print(f"- N: {row['N (kg/ha)']} | P: {row['P (kg/ha)']} | K: {row['K (kg/ha)']}")
            print(f"- Notes: {row['Notes']}")
    else:
        print(f"ℹ️ No detailed dosage info found for '{prediction}' in Fertilizer_dose.csv.")
else:
    print("⚠️ Fertilizer_dose.csv file not found.")
