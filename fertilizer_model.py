import pandas as pd
import pickle
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import os

# -----------------------------
# STEP 1: Load Dataset
# -----------------------------
data = pd.read_csv("data/fertilizer_recommendation.csv")

# Clean up column names
data.columns = [col.strip() for col in data.columns]

# -----------------------------
# STEP 2: Encode Categorical Columns
# -----------------------------
soil_le = LabelEncoder()
crop_le = LabelEncoder()

data["Soil Type"] = soil_le.fit_transform(data["Soil Type"].str.lower())
data["Crop Type"] = crop_le.fit_transform(data["Crop Type"].str.lower())

# -----------------------------
# STEP 3: Prepare Features and Target
# -----------------------------
X = data[["Soil Type", "Crop Type", "Nitrogen", "Phosphorus", "Potassium"]]
y = data["Fertilizer"]

# -----------------------------
# STEP 4: Train Model
# -----------------------------
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model = RandomForestClassifier(random_state=42)
model.fit(X_train, y_train)

# -----------------------------
# STEP 5: Save Model and Encoders
# -----------------------------
os.makedirs("models", exist_ok=True)

with open("models/fertilizer_model.pkl", "wb") as f:
    pickle.dump(model, f)

with open("models/soil_encoder.pkl", "wb") as f:
    pickle.dump(soil_le, f)

with open("models/crop_encoder.pkl", "wb") as f:
    pickle.dump(crop_le, f)

print("✅ Fertilizer model and encoders saved successfully!")
