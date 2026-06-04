import express from "express";
import Student from "../models/Student.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// GET all students (paginated)
router.get("/", requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || "";

    const query = search
      ? {
          $or: [
            { registrationNumber: { $regex: search, $options: "i" } },
            { name: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .select("-__v");

    res.json({ students, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST bulk import students from Excel
router.post("/bulk-import", requireAuth, async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const XLSX = (await import("xlsx")).default;
    const workbook = XLSX.read(req.files.file.data, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) {
      return res.status(400).json({ error: "Excel file is empty" });
    }

    // Normalize: accept columns like reg_no, registration, registrationNumber, RegNo etc.
    const normalize = (row) => {
      const keys = Object.keys(row).map((k) => k.toLowerCase().replace(/[\s_-]/g, ""));
      const regKey = Object.keys(row).find((k) =>
        ["regno", "registrationnumber", "registration", "regno", "regnno","rollno"].includes(
          k.toLowerCase().replace(/[\s_-]/g, "")
        )
      );
      const cgpaKey = Object.keys(row).find((k) =>
        ["cgpa", "actualcgpa", "marks"].includes(
          k.toLowerCase().replace(/[\s_-]/g, "")
        )
      );
      if (!regKey || !cgpaKey) return null;
      return {
        registrationNumber: String(row[regKey]).trim().toUpperCase(),
        actualCgpa: parseFloat(row[cgpaKey]),
        name: row["Name"] || row["name"] || row["Student Name"] || "",
        branch: row["Branch"] || row["branch"] || row["Department"] || "",
        batch: row["Batch"] || row["batch"] || row["Year"] || "",
      };
    };

    const docs = rows.map(normalize).filter((r) => r && !isNaN(r.actualCgpa));

    if (!docs.length) {
      return res.status(400).json({
        error: "Could not parse rows. Ensure columns: Registration Number, CGPA",
      });
    }

    // Upsert all
    const ops = docs.map((d) => ({
      updateOne: {
        filter: { registrationNumber: d.registrationNumber },
        update: { $set: d },
        upsert: true,
      },
    }));

    const result = await Student.bulkWrite(ops);
    res.json({
      message: "Import successful",
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
      total: docs.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a student
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET stats
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const total = await Student.countDocuments();
    res.json({ total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
