# train_disease_model.py

import os
import json
import matplotlib.pyplot as plt
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import ModelCheckpoint

# --------------------------------------------
# 🌿 PATH CONFIGURATION
# --------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = r"D:\AgriFusionF\AgriFusion-AI\data"  # ✅ Update this path if needed
MODEL_SAVE_PATH = os.path.join(BASE_DIR, "models", "plant_disease_prediction_model.h5")
CLASS_INDICES_PATH = os.path.join(BASE_DIR, "class_indices.json")

# --------------------------------------------
# 🧩 IMAGE DATA GENERATOR (AUGMENTATION)
# --------------------------------------------
datagen = ImageDataGenerator(
    rescale=1.0 / 255,
    rotation_range=25,
    zoom_range=0.25,
    horizontal_flip=True,
    width_shift_range=0.1,
    height_shift_range=0.1,
    shear_range=0.1,
    validation_split=0.2
)

# --------------------------------------------
# 🧠 TRAINING & VALIDATION GENERATORS
# --------------------------------------------
train_gen = datagen.flow_from_directory(
    DATASET_PATH,
    target_size=(224, 224),
    batch_size=32,
    subset="training"
)

val_gen = datagen.flow_from_directory(
    DATASET_PATH,
    target_size=(224, 224),
    batch_size=32,
    subset="validation"
)

# --------------------------------------------
# 🧱 CNN MODEL ARCHITECTURE
# --------------------------------------------
model = Sequential([
    Conv2D(32, (3, 3), activation="relu", input_shape=(224, 224, 3)),
    MaxPooling2D(2, 2),

    Conv2D(64, (3, 3), activation="relu"),
    MaxPooling2D(2, 2),

    Conv2D(128, (3, 3), activation="relu"),
    MaxPooling2D(2, 2),

    Dropout(0.3),
    Flatten(),
    Dense(256, activation="relu"),
    Dropout(0.5),
    Dense(train_gen.num_classes, activation="softmax")
])

# --------------------------------------------
# ⚙️ COMPILE MODEL
# --------------------------------------------
model.compile(
    optimizer=Adam(learning_rate=0.0001),
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

# --------------------------------------------
# 💾 CHECKPOINT (SAVE BEST MODEL)
# --------------------------------------------
checkpoint = ModelCheckpoint(
    MODEL_SAVE_PATH,
    monitor="val_accuracy",
    save_best_only=True,
    verbose=1
)

# --------------------------------------------
# 🚀 TRAIN MODEL
# --------------------------------------------
print("🚀 Training started...")
history = model.fit(
    train_gen,
    validation_data=val_gen,
    epochs=10,  # start with 10 for testing, increase to 25 later
    callbacks=[checkpoint]
)
print("✅ Training completed!")

# --------------------------------------------
# 💾 SAVE FINAL MODEL AND CLASS LABELS
# --------------------------------------------
model.save(MODEL_SAVE_PATH)
print(f"✅ Model saved to: {MODEL_SAVE_PATH}")

with open(CLASS_INDICES_PATH, "w") as f:
    json.dump(train_gen.class_indices, f)
print(f"✅ Class indices saved to: {CLASS_INDICES_PATH}")

# --------------------------------------------
# 📊 PLOT ACCURACY AND LOSS
# --------------------------------------------
plt.figure(figsize=(10, 4))
plt.subplot(1, 2, 1)
plt.plot(history.history["accuracy"], label="Train Accuracy", color="green")
plt.plot(history.history["val_accuracy"], label="Validation Accuracy", color="orange")
plt.title("Model Accuracy")
plt.xlabel("Epoch")
plt.ylabel("Accuracy")
plt.legend()

plt.subplot(1, 2, 2)
plt.plot(history.history["loss"], label="Train Loss", color="red")
plt.plot(history.history["val_loss"], label="Validation Loss", color="blue")
plt.title("Model Loss")
plt.xlabel("Epoch")
plt.ylabel("Loss")
plt.legend()

plt.tight_layout()
plt.savefig(os.path.join(BASE_DIR, "training_graph.png"))
plt.show()

print("📈 Training graph saved as training_graph.png")