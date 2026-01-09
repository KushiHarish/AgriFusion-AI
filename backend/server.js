// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Create uploads directories
const uploadsDir = path.join(__dirname, "uploads");
const diseaseUploadsDir = path.join(__dirname, "uploads/disease");

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(diseaseUploadsDir)) fs.mkdirSync(diseaseUploadsDir);

// Serve uploaded files
app.use("/uploads", express.static(uploadsDir));

// ======================
// 🔗 MongoDB Connection
// ======================

mongoose
  .connect(
    "mongodb+srv://Agrifusion_2026:Ise_agrifusion@cluster0.2snwyyn.mongodb.net/?appName=Cluster0"
  )
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ======================
// 📁 File Upload Setup (Multer)
// ======================

// Storage for crop photos
const cropStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `crop-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// Storage for disease images
const diseaseStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, diseaseUploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `disease-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
};

const uploadCropPhoto = multer({
  storage: cropStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter,
});

const uploadDiseaseImage = multer({
  storage: diseaseStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter,
});

// =========================================
// SCHEMAS
// =========================================

const farmerSchema = new mongoose.Schema({
  username: String,
  name: String,
  email: String,
  phone: String,
  age: String,
  address: String,
  password: String,
  cropChosen: String,
  landDetails: {
    soilType: String,
    landSize: String,
    waterResource: String,
    previousCrop: String,
    irrigationPreference: String,
  },
  soilDetails: {
    N: Number,
    P: Number,
    K: Number,
    temperature: Number,
    humidity: Number,
    ph: Number,
    moisture: Number,
  },
  status: { type: String, default: "active" },
});

const Farmer = mongoose.model("Farmer", farmerSchema);

const soilTestSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "Farmer" },
    N: { type: Number, required: true },
    P: { type: Number, required: true },
    K: { type: Number, required: true },
    temperature: { type: Number, required: true },
    humidity: { type: Number, required: true },
    ph: { type: Number, required: true },
    moisture: { type: Number, required: true },
    testDate: { type: Date, default: Date.now },
    notes: String,
  },
  { timestamps: true }
);

const SoilTest = mongoose.model("SoilTest", soilTestSchema);

const transactionSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, index: true },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "Farmer" },
    type: { type: String, required: true, enum: ["income", "expense"] },
    category: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

const photoSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, index: true },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "Farmer" },
    filename: { type: String, required: true },
    originalName: String,
    path: { type: String, required: true },
    url: { type: String, required: true },
    caption: { type: String, default: "" },
    fileSize: Number,
    mimeType: String,
  },
  { timestamps: true }
);

const Photo = mongoose.model("Photo", photoSchema);

// =========================================
// 🦠 DISEASE DETECTION SCHEMA (NEW!)
// =========================================

const diseaseDetectionSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, index: true },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "Farmer" },
    filename: { type: String, required: true },
    originalName: String,
    path: { type: String, required: true },
    url: { type: String, required: true },
    crop: { type: String, required: true },

    // AI Prediction Results
    detectedDisease: { type: String, required: true },
    isHealthy: { type: Boolean, default: false },
    confidence: Number,

    // Treatment Information
    solution: String,
    organicTreatment: String,
    pesticides: [
      {
        name: String,
        type: String,
        dosage: String,
        frequency: String,
        target: String,
      },
    ],

    // Metadata
    fileSize: Number,
    mimeType: String,
    detectionDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const DiseaseDetection = mongoose.model(
  "DiseaseDetection",
  diseaseDetectionSchema
);

// =========================================
// FARMER ROUTES
// =========================================

app.post("/register", async (req, res) => {
  try {
    const existingFarmer = await Farmer.findOne({
      username: req.body.username,
    });

    if (existingFarmer) {
      return res.status(400).json({
        success: false,
        message: "Username already exists",
      });
    }

    const farmer = new Farmer(req.body);
    await farmer.save();
    res.json({ success: true, message: "Registration successful" });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error registering",
      error: err.message,
    });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "123") {
    return res.json({
      role: "admin",
      username: "admin",
      message: "Admin login successful",
    });
  }

  const farmer = await Farmer.findOne({ username, password });

  if (!farmer) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  res.json({
    role: "farmer",
    username: farmer.username,
    message: "Farmer login successful",
  });
});

app.get("/farmers", async (req, res) => {
  const farmers = await Farmer.find();
  res.json(farmers);
});

app.delete("/farmer/:id", async (req, res) => {
  await Farmer.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.put("/farmer/status/:id", async (req, res) => {
  const farmer = await Farmer.findById(req.params.id);
  farmer.status = farmer.status === "active" ? "inactive" : "active";
  await farmer.save();
  res.json({ success: true });
});

app.put("/farmer/:id", async (req, res) => {
  try {
    const farmerId = req.params.id;
    const updateData = req.body;

    const updatedFarmer = await Farmer.findByIdAndUpdate(farmerId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedFarmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found",
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      farmer: updatedFarmer,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: err.message,
    });
  }
});

// =========================================
// SOIL TEST ROUTES
// =========================================

app.get("/soil-tests/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const farmer = await Farmer.findOne({ username });

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found",
      });
    }

    const soilTests = await SoilTest.find({ username }).sort({ testDate: -1 });

    res.json({
      success: true,
      registrationData: farmer.soilDetails,
      testHistory: soilTests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching soil tests",
    });
  }
});

app.post("/soil-test", async (req, res) => {
  try {
    const { username, N, P, K, temperature, humidity, ph, moisture, notes } =
      req.body;

    const farmer = await Farmer.findOne({ username });
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found",
      });
    }

    const soilTest = new SoilTest({
      username,
      farmerId: farmer._id,
      N: parseFloat(N),
      P: parseFloat(P),
      K: parseFloat(K),
      temperature: parseFloat(temperature),
      humidity: parseFloat(humidity),
      ph: parseFloat(ph),
      moisture: parseFloat(moisture),
      notes: notes || "",
    });

    await soilTest.save();

    res.json({
      success: true,
      message: "Soil test saved successfully",
      soilTest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error saving soil test",
      error: error.message,
    });
  }
});

app.delete("/soil-test/:id", async (req, res) => {
  try {
    await SoilTest.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Soil test deleted" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting soil test",
    });
  }
});

// =========================================
// TRANSACTION ROUTES
// =========================================

app.get("/transactions/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const farmer = await Farmer.findOne({ username });

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found",
      });
    }

    const transactions = await Transaction.find({ username }).sort({
      date: -1,
      createdAt: -1,
    });

    res.json({
      success: true,
      transactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching transactions",
    });
  }
});

app.post("/transaction", async (req, res) => {
  try {
    const { username, type, category, amount, date, description } = req.body;

    const farmer = await Farmer.findOne({ username });
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found",
      });
    }

    const transaction = new Transaction({
      username,
      farmerId: farmer._id,
      type,
      category,
      amount: parseFloat(amount),
      date: new Date(date),
      description: description || "",
    });

    await transaction.save();

    res.json({
      success: true,
      message: "Transaction added successfully",
      transaction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding transaction",
      error: error.message,
    });
  }
});

app.delete("/transaction/:id", async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndDelete(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    res.json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting transaction",
    });
  }
});

app.get("/transactions/summary/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const transactions = await Transaction.find({ username });

    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const netProfit = totalIncome - totalExpense;

    res.json({
      success: true,
      summary: {
        totalIncome,
        totalExpense,
        netProfit,
        transactionCount: transactions.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error calculating summary",
    });
  }
});

// =========================================
// 📸 CROP PHOTO ROUTES
// =========================================

app.post("/upload-photo", uploadCropPhoto.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const { username, caption } = req.body;

    const farmer = await Farmer.findOne({ username });
    if (!farmer) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: "Farmer not found",
      });
    }

    const photo = new Photo({
      username,
      farmerId: farmer._id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      url: `/uploads/${req.file.filename}`,
      caption: caption || "",
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });

    await photo.save();

    res.json({
      success: true,
      message: "Photo uploaded successfully",
      photo,
    });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({
      success: false,
      message: "Error uploading photo",
      error: error.message,
    });
  }
});

app.get("/photos/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const farmer = await Farmer.findOne({ username });

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found",
      });
    }

    const photos = await Photo.find({ username }).sort({ createdAt: -1 });

    res.json({
      success: true,
      photos,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching photos",
    });
  }
});

app.delete("/photo/:id", async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);

    if (!photo) {
      return res.status(404).json({
        success: false,
        message: "Photo not found",
      });
    }

    if (fs.existsSync(photo.path)) {
      fs.unlinkSync(photo.path);
    }

    await Photo.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Photo deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting photo",
    });
  }
});

// =========================================
// 🦠 DISEASE DETECTION ROUTES (NEW!)
// =========================================

// Save Disease Detection Result
app.post(
  "/save-disease-detection",
  uploadDiseaseImage.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image file uploaded",
        });
      }

      const {
        username,
        crop,
        detectedDisease,
        isHealthy,
        confidence,
        solution,
        organicTreatment,
      } = req.body;

      // Parse pesticides from form data
      const pesticides = [];
      let i = 0;
      while (req.body[`pesticides[${i}][name]`]) {
        pesticides.push({
          name: req.body[`pesticides[${i}][name]`],
          type: req.body[`pesticides[${i}][type]`],
          dosage: req.body[`pesticides[${i}][dosage]`],
          frequency: req.body[`pesticides[${i}][frequency]`],
          target: req.body[`pesticides[${i}][target]`],
        });
        i++;
      }

      const farmer = await Farmer.findOne({ username });
      if (!farmer) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({
          success: false,
          message: "Farmer not found",
        });
      }

      const diseaseDetection = new DiseaseDetection({
        username,
        farmerId: farmer._id,
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        url: `/uploads/disease/${req.file.filename}`,
        crop,
        detectedDisease,
        isHealthy: isHealthy === "true" || isHealthy === true,
        confidence: parseFloat(confidence) || 0,
        solution: solution || "",
        organicTreatment: organicTreatment || "",
        pesticides: pesticides,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      });

      await diseaseDetection.save();

      res.json({
        success: true,
        message: "Disease detection saved successfully",
        detection: diseaseDetection,
      });
    } catch (error) {
      console.error("Error saving disease detection:", error);
      if (req.file) fs.unlinkSync(req.file.path);
      res.status(500).json({
        success: false,
        message: "Error saving disease detection",
        error: error.message,
      });
    }
  }
);

// Get All Disease Detections for a User
app.get("/disease-detections/:username", async (req, res) => {
  try {
    const { username } = req.params;

    const farmer = await Farmer.findOne({ username });
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found",
      });
    }

    const detections = await DiseaseDetection.find({ username }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      detections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching disease detections",
    });
  }
});

// Get Disease Detection Statistics
app.get("/disease-stats/:username", async (req, res) => {
  try {
    const { username } = req.params;

    const detections = await DiseaseDetection.find({ username });

    const totalDetections = detections.length;
    const healthyCount = detections.filter((d) => d.isHealthy).length;
    const diseasedCount = totalDetections - healthyCount;

    const diseaseTypes = {};
    detections.forEach((d) => {
      if (!d.isHealthy) {
        diseaseTypes[d.detectedDisease] =
          (diseaseTypes[d.detectedDisease] || 0) + 1;
      }
    });

    res.json({
      success: true,
      stats: {
        totalDetections,
        healthyCount,
        diseasedCount,
        diseaseTypes,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
    });
  }
});

// Delete Disease Detection
app.delete("/disease-detection/:id", async (req, res) => {
  try {
    const detection = await DiseaseDetection.findById(req.params.id);

    if (!detection) {
      return res.status(404).json({
        success: false,
        message: "Detection record not found",
      });
    }

    if (fs.existsSync(detection.path)) {
      fs.unlinkSync(detection.path);
    }

    await DiseaseDetection.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Disease detection deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting disease detection",
    });
  }
});

// =========================================
// START SERVER
// =========================================

app.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
  console.log("📁 Crop uploads:", uploadsDir);
  console.log("🦠 Disease uploads:", diseaseUploadsDir);
});
