import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import fileUpload from "express-fileupload";
import studentRoutes from "./routes/students.js";
import uploadRoutes from "./routes/upload.js";
import historyRoutes from "./routes/history.js";
import webhookRoutes from "./routes/webhook.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Webhook route BEFORE body parsers (needs raw body)
app.use("/api/webhook", webhookRoutes);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(
  fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    useTempFiles: false,
  })
);

// Routes
app.use("/api/students", studentRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/history", historyRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
