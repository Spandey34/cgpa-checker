import express from "express";
import XLSX from "xlsx";
import Student from "../models/Student.js";
import History from "../models/History.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Helper: find reg number column
const findRegCol = (headers) => {
  return headers.find((h) =>
    ["regno", "registrationnumber", "registration", "rollno", "reg no", "regnno", "reg. no"].includes(
      h.toLowerCase().replace(/[\s._-]/g, "")
    )
  );
};

// Helper: find entered CGPA column
const findCgpaCol = (headers) => {
  return headers.find((h) =>
    ["cgpa", "enteredcgpa", "selfcgpa", "reportedcgpa"].includes(
      h.toLowerCase().replace(/[\s._-]/g, "")
    )
  );
};

// POST /api/upload/process
router.post("/process", requireAuth, async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { topic, threshold } = req.body;
    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const delta = parseFloat(threshold) || 0.02;
    const fileData = req.files.file.data;
    const originalFileName = req.files.file.name;

    // Parse workbook
    const workbook = XLSX.read(fileData, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (!rows.length) {
      return res.status(400).json({ error: "Excel file is empty or has no data rows" });
    }

    const headers = Object.keys(rows[0]);
    const regCol = findRegCol(headers);
    const cgpaCol = findCgpaCol(headers);

    if (!regCol) {
      return res.status(400).json({
        error: `Could not find Registration Number column. Found columns: ${headers.join(", ")}. Expected a column like 'Registration Number', 'Reg No', or 'Roll No'.`,
      });
    }
    if (!cgpaCol) {
      return res.status(400).json({
        error: `Could not find CGPA column. Found columns: ${headers.join(", ")}. Expected a column like 'CGPA' or 'GPA'.`,
      });
    }

    // Extract reg numbers to batch-fetch from DB
    const regNumbers = rows
      .map((r) => String(r[regCol]).trim().toUpperCase())
      .filter(Boolean);

    const dbStudents = await Student.find({
      registrationNumber: { $in: regNumbers },
    }).select("registrationNumber actualCgpa");

    const dbMap = {};
    dbStudents.forEach((s) => {
      dbMap[s.registrationNumber] = s.actualCgpa;
    });

    // Process each row
    const results = [];
    const outputRows = [];

    rows.forEach((row) => {
      const regNum = String(row[regCol]).trim().toUpperCase();
      const enteredCgpa = parseFloat(row[cgpaCol]);
      const actualCgpa = dbMap[regNum];

      const found = actualCgpa !== undefined;
      const diff = found ? Math.abs(enteredCgpa - actualCgpa) : null;
      const flagged = found ? diff > delta : false;

      results.push({
        registrationNumber: regNum,
        enteredCgpa: isNaN(enteredCgpa) ? null : enteredCgpa,
        actualCgpa: found ? actualCgpa : null,
        difference: diff !== null ? parseFloat(diff.toFixed(4)) : null,
        flagged,
        found,
      });

      // Build output row with all original columns + new ones
      const outRow = { ...row };
      outRow["Actual CGPA"] = found ? actualCgpa : "NOT FOUND";
      outRow["Difference"] = diff !== null ? parseFloat(diff.toFixed(4)) : "N/A";
      outRow["Status"] = !found ? "NOT IN DATABASE" : flagged ? "FLAGGED" : "OK";
      outputRows.push({ data: outRow, flagged: flagged || !found });
    });

    const flaggedCount = results.filter((r) => r.flagged).length;
    const notFoundCount = results.filter((r) => !r.found).length;

    // Build output Excel with red highlighting for flagged rows
    const newWb = XLSX.utils.book_new();

    // Create worksheet data
    if (outputRows.length > 0) {
      const wsData = outputRows.map((r) => r.data);
      const ws = XLSX.utils.json_to_sheet(wsData);

      // Apply red fill to flagged rows
      const range = XLSX.utils.decode_range(ws["!ref"]);
      const headerRowCount = 1;

      outputRows.forEach((row, idx) => {
        if (row.flagged) {
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddr = XLSX.utils.encode_cell({ r: idx + headerRowCount, c: col });
            if (!ws[cellAddr]) ws[cellAddr] = { v: "", t: "s" };
            ws[cellAddr].s = {
              fill: {
                patternType: "solid",
                fgColor: { rgb: "FFCCCC" }, // light red
              },
              font: { color: { rgb: "CC0000" }, bold: true },
            };
          }
        }
      });

      // Style header row
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddr = XLSX.utils.encode_cell({ r: 0, c: col });
        if (ws[cellAddr]) {
          ws[cellAddr].s = {
            fill: { patternType: "solid", fgColor: { rgb: "1E293B" } },
            font: { color: { rgb: "FFFFFF" }, bold: true },
          };
        }
      }

      XLSX.utils.book_append_sheet(newWb, ws, "CGPA Verification");
    }

    // Generate Excel buffer
    const excelBuffer = XLSX.write(newWb, {
      type: "buffer",
      bookType: "xlsx",
      cellStyles: true,
    });

    const base64Excel = excelBuffer.toString("base64");

    // Save to history
    const historyEntry = await History.create({
      userId: req.userId,
      topic: topic.trim(),
      threshold: delta,
      originalFileName,
      totalRows: rows.length,
      flaggedCount,
      notFoundCount,
      results,
      generatedExcelBase64: base64Excel,
    });

    res.json({
      historyId: historyEntry._id,
      topic: topic.trim(),
      totalRows: rows.length,
      flaggedCount,
      notFoundCount,
      threshold: delta,
      results: results.slice(0, 100), // preview first 100
      excelBase64: base64Excel,
      fileName: `${topic.replace(/\s+/g, "_")}_verified.xlsx`,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
