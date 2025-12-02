import tensorflow as tf
import numpy as np
from tensorflow.keras.preprocessing import image
import json

# 1️⃣ Load trained model
model = tf.keras.models.load_model("models/plant_disease_prediction_model.h5")

# 2️⃣ Load class indices
with open("class_indices.json", "r") as f:
    class_indices = json.load(f)
class_names = [None] * len(class_indices)
for k, v in class_indices.items():
    class_names[v] = k

# 3️⃣ Load and preprocess test image
img_path = "potato-diseases.jpg"  # your test image
img = image.load_img(img_path, target_size=(224, 224))
img_array = image.img_to_array(img)
img_array = np.expand_dims(img_array, axis=0) / 255.0

# 4️⃣ Predict
pred = model.predict(img_array)[0]

# 5️⃣ Top 3 predictions
top3_indices = pred.argsort()[-3:][::-1]
print("Top 3 predictions:")
for i in top3_indices:
    print(f"{class_names[i]} -> Confidence: {pred[i]:.4f}")
