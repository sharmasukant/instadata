import { Router, type Request } from "express";
import crypto from "crypto";
import {
  createUser,
  findUserByEmail,
  hashPassword,
  verifyPassword,
  saveSessionToken,
  findUserBySessionToken,
} from "../storage/user-store.js";

const router = Router();

function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

router.post("/register", (req: Request, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" });

  try {
    const passwordHash = hashPassword(password);
    const user = createUser(email, passwordHash);
    const token = generateSessionToken();
    saveSessionToken(user.id, token);
    res.json({ user: { id: user.id, email: user.email }, sessionToken: token });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Registration failed" });
  }
});

router.post("/login", (req: Request, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" });

  try {
    const user = findUserByEmail(email);
    if (!user || !user.passwordHash)
      return res.status(400).json({ error: "Invalid credentials" });
    const ok = verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });
    const token = generateSessionToken();
    saveSessionToken(user.id, token);
    res.json({ user: { id: user.id, email: user.email }, sessionToken: token });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Login failed" });
  }
});

router.get("/me", (req: Request, res) => {
  const token = req.get("authorization")?.startsWith("Bearer ")
    ? req.get("authorization")!.slice(7).trim()
    : req.get("x-session-token") || undefined;
  const user = findUserBySessionToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  res.json({ id: user.id, email: user.email, createdAt: user.createdAt });
});

export default router;
