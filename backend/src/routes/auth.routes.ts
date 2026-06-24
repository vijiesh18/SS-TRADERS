import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  login,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
  me,
} from "@/controllers/auth.controller";
import { authenticate } from "@/middleware/auth";

const router = Router();

// Rate limit login attempts to mitigate brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

router.post("/login", loginLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", authenticate, logout);
router.post("/forgot-password", loginLimiter, forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", authenticate, me);

export default router;
