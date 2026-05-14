require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo").default || require("connect-mongo");
const mongoose = require("mongoose");
const passport = require("passport");

require("./routes/auth");

const app = express();

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5500",
  credentials: true
}));
app.use(express.json());

// Session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 7 days
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Database
mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB_NAME || "lawbot",
})
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ DB error:", err);
    if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND" || err.syscall === "querySrv") {
      console.error("  → Check DNS/network and ensure your MongoDB URI is reachable.");
      console.error("  → If network DNS blocks SRV lookups, use a standard mongodb:// connection string.");
    }
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