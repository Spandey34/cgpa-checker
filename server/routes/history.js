import express from "express";
import History from "../models/History.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// GET all history for logged-in user
router.get("/", requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";

    const query = { userId: req.userId };
    if (search) {
      query.topic = { $regex: search, $options: "i" };
    }

    const total = await History.countDocuments(query);
    const history = await History.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("-results -generatedExcelBase64"); // exclude heavy fields from list

    res.json({ history, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single history item (with full results)
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const entry = await History.findOne({
      _id: req.params.id,
      userId: req.userId, // ensure user owns it
    });

    if (!entry) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET download excel for a history entry
router.get("/:id/download", requireAuth, async (req, res) => {
  try {
    const entry = await History.findOne({
      _id: req.params.id,
      userId: req.userId,
    }).select("generatedExcelBase64 topic");

    if (!entry || !entry.generatedExcelBase64) {
      return res.status(404).json({ error: "File not found" });
    }

    const buffer = Buffer.from(entry.generatedExcelBase64, "base64");
    const fileName = `${entry.topic.replace(/\s+/g, "_")}_verified.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE history entry
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await History.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
