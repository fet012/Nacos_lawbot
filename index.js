require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const mongoose = require("mongoose");
const passport = require("passport");

const app = express();

// Middlewares
const corsOptions = {
  origin: process.env.FRONTEND_URL || "https://nacos-hackathon-project.vercel.app",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// Session (no MongoDB store for now)
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24 * 7,
    sameSite: 'none',
    secure: true
  }
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Database
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.log("⚠️ MongoDB unavailable - running without database");
  });

// Routes
app.use("/auth", require("./routes/auth"));
app.use("/api", require("./routes/chat"));

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Law-Bot backend running", status: "ok" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});