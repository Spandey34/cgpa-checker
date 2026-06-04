import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    actualCgpa: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    name: {
      type: String,
      trim: true,
    },
    branch: {
      type: String,
      trim: true,
    },
    batch: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

studentSchema.index({ registrationNumber: 1 });

export default mongoose.model("Student", studentSchema);
