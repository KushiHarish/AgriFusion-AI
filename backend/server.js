// backend/server.js

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ======================
// 🔗 MongoDB Connection
// ======================

mongoose
  .connect(
    "mongodb+srv://Agrifusion_2026:Ise_agrifusion@cluster0.2snwyyn.mongodb.net/?appName=Cluster0", // Replace this
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// =========================================
// 2️⃣ Farmer Schema
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

// =========================================
// 🌱 Soil Test History Schema
// =========================================

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

// ------------------------------
// 👤 Registration Route
// ------------------------------
app.post("/register", async (req, res) => {
  try {
    // Check if username already exists
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
// ------------------------------
// 🔐 Login Route (Farmer + Admin)
// ------------------------------
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  console.log("Login attempt:", { username, password }); // Debug log

  // ADMIN LOGIN
  if (username === "admin" && password === "123") {
    return res.json({
      role: "admin", // Changed from admin: true
      username: "admin",
      message: "Admin login successful",
    });
  }

  // FARMER LOGIN
  const farmer = await Farmer.findOne({ username, password });

  if (!farmer) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  res.json({
    role: "farmer", // This is already correct
    username: farmer.username,
    message: "Farmer login successful",
  });
});

// ------------------------------
// 📌 Admin — Get All Farmers
// ------------------------------
app.get("/farmers", async (req, res) => {
  const farmers = await Farmer.find();
  res.json(farmers);
});

// ------------------------------
// ❌ Admin — Delete Farmer
// ------------------------------
app.delete("/farmer/:id", async (req, res) => {
  await Farmer.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ------------------------------
// 🔄 Admin — Toggle Active/Inactive (MORE SPECIFIC - PUT THIS FIRST)
// ------------------------------
app.put("/farmer/status/:id", async (req, res) => {
  const farmer = await Farmer.findById(req.params.id);
  farmer.status = farmer.status === "active" ? "inactive" : "active";
  await farmer.save();
  res.json({ success: true });
});

// ------------------------------
// ✏️ Update Farmer Profile (LESS SPECIFIC - PUT THIS SECOND)
// ------------------------------
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

// ------------------------------
// 🌱 Get Farmer's Soil Test History
// ------------------------------
app.get("/soil-tests/:username", async (req, res) => {
  try {
    const { username } = req.params;

    // Get farmer
    const farmer = await Farmer.findOne({ username });
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found",
      });
    }

    // Get all soil tests for this farmer (sorted by date, newest first)
    const soilTests = await SoilTest.find({ username }).sort({ testDate: -1 });

    // Include registration soil data as first entry if no tests exist
    const response = {
      success: true,
      registrationData: farmer.soilDetails,
      testHistory: soilTests,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching soil tests:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching soil tests",
    });
  }
});

// ------------------------------
// 🌱 Save New Soil Test
// ------------------------------
app.post("/soil-test", async (req, res) => {
  try {
    const { username, N, P, K, temperature, humidity, ph, moisture, notes } =
      req.body;

    // Verify farmer exists
    const farmer = await Farmer.findOne({ username });
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found",
      });
    }

    // Create new soil test
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
    console.error("Error saving soil test:", error);
    res.status(500).json({
      success: false,
      message: "Error saving soil test",
      error: error.message,
    });
  }
});

// ------------------------------
// 🌱 Delete Soil Test
// ------------------------------
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

// ------------------------------
app.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});
