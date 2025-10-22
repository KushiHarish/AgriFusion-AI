import os
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, precision_score
import joblib

# 1) Load dataset
DATA_PATH = os.path.join("data", "Crop_recommendation.csv")
df = pd.read_csv(DATA_PATH)

# 2) Feature selection
features = ['N','P','K','temperature','humidity','ph','rainfall']
X = df[features]
y = df['label']

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

print(f"Accuracy: {accuracy:.2f}")
print("\nClassification Report:\n", classification_report(y_test, y_pred))

# 6) Save model
os.makedirs("models", exist_ok=True)
joblib.dump(model, "models/crop_model.pkl")
print("✅ Saved model to models/crop_model.pkl")

# 7) Plot Accuracy & Precision graph
import matplotlib
matplotlib.use('Agg')  # <-- use non-GUI backend (prevents Tcl/Tk errors)
import matplotlib.pyplot as plt

labels = list(report.keys())[:-3]
precisions = [report[label]['precision'] for label in labels]

plt.figure(figsize=(10, 6))
plt.bar(labels, precisions, color='skyblue', label='Precision (per class)')
plt.axhline(y=accuracy, color='red', linestyle='--', label=f'Overall Accuracy = {accuracy:.2f}')
plt.xticks(rotation=45, ha='right')
plt.xlabel("Crop Label")
plt.ylabel("Score")
plt.title("Model Accuracy and Precision by Class")
plt.legend()
plt.tight_layout()

# Instead of plt.show(), save it as an image:
plt.savefig("accuracy_precision.png")
print("📈 Graph saved as accuracy_precision.png in project folder!")

