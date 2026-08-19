import { Request, Response, NextFunction } from "express";
import { findUserBySessionToken } from "../storage/user-store.js";

export function authenticateMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : undefined;
  const alt = req.get("x-session-token") || req.cookies?.session || undefined;
  const sessionToken = token || alt;
  const user = findUserBySessionToken(sessionToken);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // attach user to request
  (req as any).user = user;
  next();
}
