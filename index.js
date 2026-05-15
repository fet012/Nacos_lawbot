require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const mongoose = require("mongoose");
const passport = require("passport");

const app = express();

// Middlewares
app.use(cors({
  origin: "*",
  credentials: false
}));
app.use(express.json());

// Session (no MongoDB store for now)
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
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