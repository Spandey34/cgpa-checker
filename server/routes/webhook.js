import express from "express";
import { Webhook } from "svix";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// Clerk sends raw body for webhook verification
router.post(
  "/clerk",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    const svix_id = req.headers["svix-id"];
    const svix_timestamp = req.headers["svix-timestamp"];
    const svix_signature = req.headers["svix-signature"];

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return res.status(400).json({ error: "Missing svix headers" });
    }

    try {
      const wh = new Webhook(webhookSecret);
      const evt = wh.verify(req.body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });

      const { type, data } = evt;
      console.log(`Clerk webhook: ${type}`, data.id);

      // You can handle user.created, user.deleted etc. here
      // For now we just acknowledge
      res.json({ received: true });
    } catch (err) {
      console.error("Webhook verification failed:", err.message);
      res.status(400).json({ error: "Invalid signature" });
    }
  }
);

export default router;
