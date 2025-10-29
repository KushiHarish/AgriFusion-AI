// backend/server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcrypt";
import bodyParser from "body-parser";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ MongoDB Atlas Connection
mongoose.connect(
  "mongodb+srv://meghana73kumar_db_user:eU0GytdkqM0BFg2G@cluster0.9qjhug7.mongodb.net/agrifusionDB?retryWrites=true&w=majority&appName=Cluster0",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
)
.then(() => console.log("✅ MongoDB connected"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["farmer", "admin", "customer"], default: "farmer" },

  // personal details
  fullName: String,
  age: Number,
  phone: String,
  email: String,
  address: String,

  // land details
  land: {
    climate: String,
    size: Number,
    units: String,
    waterSource: String,
    previousCrop: String,
    soilType: String,
    irrigationPref: String,
  },

  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

// ✅ Soil Test Schema
const soilTestSchema = new mongoose.Schema({
  username: { type: String, required: true },
  N: Number,
  P: Number,
  K: Number,
  temperature: Number,
  humidity: Number,
  ph: Number,
  rainfall: Number,
  predictedCrop: String,
  createdAt: { type: Date, default: Date.now }
});

const SoilTest = mongoose.model("SoilTest", soilTestSchema);

// ✅ Registration Route
app.post("/register", async (req, res) => {
  try {
    const {
      username, password, role,
      fullName, age, phone, email, address,
      land
    } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      password: hashedPassword,
      role: role || "farmer",
      fullName, age, phone, email, address,
      land: land || {},
    });

    await user.save();
    res.json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ✅ Login Route
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid password" });

    res.json({ message: "Login successful", role: user.role });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ✅ Save Soil Test Result Route
app.post("/save-soiltest", async (req, res) => {
  try {
    const { username, N, P, K, temperature, humidity, ph, rainfall, predictedCrop } = req.body;

    if (!username || !predictedCrop) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const test = new SoilTest({
      username, N, P, K, temperature, humidity, ph, rainfall, predictedCrop,
    });
    await test.save();

    res.json({ message: "Soil test result saved successfully" });
  } catch (err) {
    console.error("Error saving soil test:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Run Server
app.listen(5001, () => console.log("✅ Server running on http://localhost:5001"));
