from tensorflow.keras.preprocessing.image import ImageDataGenerator
import json, os

BASE_DIR = "D:/Agrifusion"
DATASET_PATH = os.path.join(BASE_DIR, "dataset")
CLASS_INDICES_PATH = os.path.join(BASE_DIR, "class_indices.json")

datagen = ImageDataGenerator(rescale=1./255, validation_split=0.2)
train_gen = datagen.flow_from_directory(
    DATASET_PATH,
    target_size=(224, 224),
    batch_size=32,
    subset='training'
)

with open(CLASS_INDICES_PATH, "w") as f:
    json.dump(train_gen.class_indices, f)

print("✅ class_indices.json saved successfully!")
