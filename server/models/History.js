import mongoose from "mongoose";

const resultRowSchema = new mongoose.Schema(
  {
    registrationNumber: String,
    enteredCgpa: Number,
    actualCgpa: Number,
    difference: Number,
    flagged: Boolean, // true if difference > threshold
    found: Boolean,   // false if reg number not in DB
  },
  { _id: false }
);

const historySchema = new mongoose.Schema(
  {
    userId: {
      type: String, // Clerk user ID
      required: true,
      index: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    threshold: {
      type: Number,
      required: true,
      default: 0.02,
    },
    originalFileName: {
      type: String,
    },
    totalRows: Number,
    flaggedCount: Number,
    notFoundCount: Number,
    results: [resultRowSchema],
    // Store the generated Excel as base64 for re-download
    generatedExcelBase64: {
      type: String,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true }
);

historySchema.index({ userId: 1, createdAt: -1 });
historySchema.index({ userId: 1, topic: "text" });

export default mongoose.model("History", historySchema);
