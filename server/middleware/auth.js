import { verifyToken } from "@clerk/backend";
import dotenv from "dotenv";
dotenv.config();

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const payload = await verifyToken(token, {
      jwtKey: process.env.CLERK_JWT_KEY,
      authorizedParties: [process.env.CLIENT_URL], // your frontend origin
    });

    req.userId = payload.sub;
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};