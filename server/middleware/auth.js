import { createClerkClient } from "@clerk/backend";
import dotenv from "dotenv";
dotenv.config();

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // Verify session token with Clerk
    const payload = await clerk.verifyToken(token);
    req.userId = payload.sub; // Clerk user ID
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
