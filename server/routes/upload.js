import express from "express";
import ExcelJS from "exceljs";
import Student from "../models/Student.js";
import History from "../models/History.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s._-]/g, "");

const normalizeReg = (value) =>
  String(value ?? "").trim().toUpperCase();

const findRegCol = (headers) => {
  const aliases = [
    "regno",
    "registrationnumber",
    "registration",
    "rollno",
    "regnno",
    "regno",
    "regnumb",
    "regnumber",
  ];

  return headers.find((h) => aliases.includes(normalize(h)));
};

const findCgpaCol = (headers) => {
  const aliases = [
    "cgpa",
    "enteredcgpa",
    "selfcgpa",
    "reportedcgpa",
    "gpa",
    "enteredgpa",
  ];

  return headers.find((h) => aliases.includes(normalize(h)));
};

router.post("/process", requireAuth, async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { topic, threshold } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const delta = Number.parseFloat(threshold);
    const safeDelta = Number.isFinite(delta) ? delta : 0.02;

    const fileData = req.files.file.data;
    const originalFileName = req.files.file.name;

    // Read Excel file
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileData);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return res.status(400).json({ error: "Excel file has no sheets" });
    }

    const headerRow = sheet.getRow(1);
    const headers = [];

    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value ?? "").trim();
    });

    const regCol = findRegCol(headers);
    const cgpaCol = findCgpaCol(headers);

    if (!regCol) {
      return res.status(400).json({
        error: `Could not find Registration Number column. Found columns: ${headers.join(
          ", "
        )}. Expected a column like 'Registration Number', 'Reg No', or 'Roll No'.`,
      });
    }

    if (!cgpaCol) {
      return res.status(400).json({
        error: `Could not find CGPA column. Found columns: ${headers.join(
          ", "
        )}. Expected a column like 'CGPA' or 'GPA'.`,
      });
    }

    const regIndex = headers.indexOf(regCol);
    const cgpaIndex = headers.indexOf(cgpaCol);

    if (regIndex === -1 || cgpaIndex === -1) {
      return res.status(400).json({
        error: "Could not map required columns correctly.",
      });
    }

    // Extract rows
    const rows = [];
    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);

      const rowObj = {};
      let hasAnyValue = false;

      headers.forEach((header, idx) => {
        const cellText = String(row.getCell(idx + 1).text ?? "").trim();
        rowObj[header] = cellText;
        if (cellText !== "") hasAnyValue = true;
      });

      if (hasAnyValue) {
        rows.push(rowObj);
      }
    }

    if (!rows.length) {
      return res.status(400).json({
        error: "Excel file is empty or has no data rows",
      });
    }

    // Fetch students in batch
    const regNumbers = [
      ...new Set(
        rows
          .map((r) => normalizeReg(r[regCol]))
          .filter((v) => v.length > 0)
      ),
    ];

    const dbStudents = await Student.find({
      registrationNumber: { $in: regNumbers },
    })
      .select("registrationNumber actualCgpa name")
      .lean();

    const dbMap = {};
    dbStudents.forEach((s) => {
      dbMap[normalizeReg(s.registrationNumber)] = {
        actualCgpa: Number(s.actualCgpa),
        name: s.name,
      };
    });

    const results = [];
    const outputRows = [];

    rows.forEach((row) => {
      const regNum = normalizeReg(row[regCol]);
      const enteredCgpaRaw = row[cgpaCol];
      const enteredCgpa = Number.parseFloat(String(enteredCgpaRaw).trim());

      const found = Boolean(regNum && dbMap[regNum]);
      const actualCgpa = found ? Number(dbMap[regNum].actualCgpa) : null;
      const name = found ? dbMap[regNum].name : null;

      let difference = null;
      let flagged = false;
      let status = "OK";

      if (!found) {
        status = "NOT IN DATABASE";
      } else if (!Number.isFinite(enteredCgpa)) {
        status = "INVALID ENTERED CGPA";
      } else if (!Number.isFinite(actualCgpa)) {
        status = "INVALID DATABASE CGPA";
      } else {
        difference = enteredCgpa - actualCgpa;
        flagged = difference > safeDelta;
        status = flagged ? "FLAGGED" : "OK";
      }

      results.push({
        name,
        registrationNumber: regNum,
        enteredCgpa: Number.isFinite(enteredCgpa) ? enteredCgpa : null,
        actualCgpa: Number.isFinite(actualCgpa) ? actualCgpa : null,
        difference: difference !== null ? Number(difference.toFixed(4)) : null,
        flagged,
        found,
        status,
      });

      const outRow = headers.map((h) => row[h]);
      outRow.push(
        found ? actualCgpa : "NOT FOUND",
        difference !== null ? Number(difference.toFixed(4)) : "N/A",
        status
      );

      outputRows.push({
        values: outRow,
        flagged,
        notFound: !found,
      });
    });

    const flaggedCount = results.filter((r) => r.flagged).length;
    const notFoundCount = results.filter((r) => !r.found).length;

    // Build output workbook
    const newWb = new ExcelJS.Workbook();
    const ws = newWb.addWorksheet("CGPA Verification");

    const outputHeaders = [...headers, "Actual CGPA", "Difference", "Status"];
    ws.addRow(outputHeaders);

    // Header styling
    const headerRowOut = ws.getRow(1);
    headerRowOut.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E293B" },
      };
      cell.font = {
        color: { argb: "FFFFFFFF" },
        bold: true,
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFD1D5DB" } },
        left: { style: "thin", color: { argb: "FFD1D5DB" } },
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        right: { style: "thin", color: { argb: "FFD1D5DB" } },
      };
    });

    // Data rows
    outputRows.forEach((rowObj) => {
      const addedRow = ws.addRow(rowObj.values);

      const fillColor = rowObj.flagged
        ? "FFFFC7CE" // light red
        : rowObj.notFound
        ? "FFFFE5CC" // light orange
        : null;

      if (fillColor) {
        addedRow.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: fillColor },
          };
        });
      }
    });

    // Borders and alignment for all used cells
    ws.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFD1D5DB" } },
          left: { style: "thin", color: { argb: "FFD1D5DB" } },
          bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
          right: { style: "thin", color: { argb: "FFD1D5DB" } },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: rowNumber === 1 ? "center" : "left",
          wrapText: true,
        };
      });
    });

    ws.views = [{ state: "frozen", ySplit: 1 }];

    // Auto width
    ws.columns.forEach((col, idx) => {
      const header = String(outputHeaders[idx] ?? "");
      let maxLen = header.length;

      outputRows.forEach((r) => {
        const val = r.values[idx];
        const len = String(val ?? "").length;
        if (len > maxLen) maxLen = len;
      });

      col.width = Math.min(Math.max(maxLen + 2, 12), 30);
    });

    const excelBuffer = await newWb.xlsx.writeBuffer();
    const base64Excel = Buffer.from(excelBuffer).toString("base64");

    const historyEntry = await History.create({
      userId: req.userId,
      topic: topic.trim(),
      threshold: safeDelta,
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
      threshold: safeDelta,
      results: results.slice(0, 100),
      excelBase64: base64Excel,
      fileName: `${topic.trim().replace(/\s+/g, "_")}_verified.xlsx`,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;