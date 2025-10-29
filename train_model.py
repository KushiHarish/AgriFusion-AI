# train_model.py
import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib
import matplotlib
matplotlib.use('Agg')   # non-GUI backend for saving plots
import matplotlib.pyplot as plt

# 1) Load dataset
DATA_PATH = os.path.join("data", "Crop_recommendation.csv")
if not os.path.exists(DATA_PATH):
    raise FileNotFoundError(f"Dataset not found at {DATA_PATH}")
df = pd.read_csv(DATA_PATH)

# 2) Feature selection — remove 'rainfall'
features = ['N', 'P', 'K', 'temperature', 'humidity', 'ph']
if not all(col in df.columns for col in features):
    missing = [c for c in features if c not in df.columns]
    raise ValueError(f"The dataset is missing these required columns: {missing}")

X = df[features]
y = df['label']   # make sure label column exists

# 3) Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42, stratify=y
)

# 4) Train model
model = RandomForestClassifier(n_estimators=150, random_state=42)
model.fit(X_train, y_train)

# 5) Evaluate
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
report = classification_report(y_test, y_pred, output_dict=True)

print(f"Accuracy: {accuracy:.4f}")
print("\nClassification Report:\n", classification_report(y_test, y_pred))

# 6) Save model
os.makedirs("models", exist_ok=True)
joblib.dump(model, "models/crop_model.pkl")
print("✅ Saved model to models/crop_model.pkl")

# 7) Plot Accuracy & Precision (optional)
labels = [lab for lab in report.keys() if lab not in ('accuracy', 'macro avg', 'weighted avg')]
precisions = [report[label]['precision'] for label in labels]

plt.figure(figsize=(10, 6))
plt.bar(labels, precisions)
plt.axhline(y=accuracy, color='red', linestyle='--', label=f'Overall Accuracy = {accuracy:.2f}')
plt.xticks(rotation=45, ha='right')
plt.xlabel("Crop Label")
plt.ylabel("Precision")
plt.title("Model Precision by Class")
plt.legend()
plt.tight_layout()
plt.savefig("accuracy_precision.png")
print("📈 Graph saved as accuracy_precision.png")
