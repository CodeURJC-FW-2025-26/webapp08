require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const mustacheExpress = require("mustache-express");
const methodOverride = require("method-override");

const platesRouter = require("./routes/plates");

const Plate = require("./models/Plate");

const app = express();

// Configuration
const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/zentao";
const UPLOAD_PATH = process.env.UPLOAD_PATH || "uploads";

// View engine
app.engine("mustache", mustacheExpress());
app.set("view engine", "mustache");
app.set("views", path.join(__dirname, "views"));
app.engine(
  "mustache",
  mustacheExpress(path.join(__dirname, "views", "partials"))
);

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method")); // to support PUT/DELETE via forms
// serve static files from /public at the root URL (e.g.: /css/Style.css => ./public/css/Style.css)
app.use(express.static(path.join(__dirname, "public")));

// also allow the /public prefix in URLs (for compatibility with DB paths containing "/public/images/...")
// example: /public/images/nigiri.jpg -> ./public/images/nigiri.jpg
app.use("/public", express.static(path.join(__dirname, "public")));

// serve user-uploaded files
app.use("/uploads", express.static(path.join(__dirname, UPLOAD_PATH)));

// MongoDB connection
mongoose
  .connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB connected");
    const runSeed = require("./seed/seed.js");
    runSeed(); // inserts only if the collection is empty
  })
  .catch((err) => console.error("MongoDB error:", err));

// Routes
app.use("/", platesRouter);

// Simple 404 page
app.use((req, res) => {
  res.status(404).render("main", { errorMessage: "Page not found" });
});

app.listen(PORT, () =>
  console.log(`Server started at http://localhost:${PORT}`)
);
