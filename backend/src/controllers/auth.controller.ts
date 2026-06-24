import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/jwt";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/audit";
import { ROLE_PERMISSIONS, type AuthRequest } from "@/middleware/auth";
import { sendPasswordResetEmail } from "@/lib/email";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid email or password format" });
  const { email, password } = parsed.data;
  const ip = req.ip;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    await recordAudit({ action: AUDIT_ACTIONS.LOGIN_FAILED, details: { email }, ipAddress: ip });
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await recordAudit({ userId: user.id, action: AUDIT_ACTIONS.LOGIN_FAILED, details: { email }, ipAddress: ip });
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken  = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  await prisma.session.create({
    data: { userId: user.id, token: refreshToken, userAgent: req.headers["user-agent"], ipAddress: ip, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });
  await recordAudit({ userId: user.id, action: AUDIT_ACTIONS.LOGIN, ipAddress: ip });
  return res.json({ accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email, role: user.role, permissions: ROLE_PERMISSIONS[user.role] } });
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "Refresh token required" });
  try {
    const payload = verifyRefreshToken(refreshToken);
    const session = await prisma.session.findUnique({ where: { token: refreshToken } });
    if (!session || session.expiresAt < new Date()) return res.status(401).json({ error: "Session expired" });
    const accessToken = signAccessToken({ userId: payload.userId, email: payload.email, role: payload.role });
    return res.json({ accessToken });
  } catch {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
}

export async function logout(req: AuthRequest, res: Response) {
  const { refreshToken } = req.body;
  if (refreshToken) await prisma.session.deleteMany({ where: { token: refreshToken } });
  if (req.user) await recordAudit({ userId: req.user.userId, action: AUDIT_ACTIONS.LOGOUT, ipAddress: req.ip });
  return res.json({ message: "Logged out successfully" });
}

export async function forgotPassword(req: Request, res: Response) {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Valid email is required" });

  const { email } = parsed.data;

  // DEBUG: log env vars (masked)
  console.log("🔍 MAIL_USER:", process.env.MAIL_USER || "NOT SET");
  console.log("🔍 MAIL_PASS:", process.env.MAIL_PASS ? "SET (" + process.env.MAIL_PASS.length + " chars)" : "NOT SET");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log("⚠️ No user found for email:", email);
    return res.json({ message: "If that email exists, a reset link has been sent" });
  }

  const resetToken       = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExpiry },
  });

  await recordAudit({ userId: user.id, action: AUDIT_ACTIONS.PASSWORD_RESET_REQUEST, ipAddress: req.ip });

  console.log("📧 Attempting to send email to:", user.email);

  try {
    await sendPasswordResetEmail(user.email, user.name, resetToken);
    console.log("✅ Email sent successfully to:", user.email);
  } catch (err: any) {
    console.error("❌ EMAIL SEND FAILED:", err.message);
    console.error("   Full error:", err);
    // Also log the reset URL so you can still use it manually
    console.log(`\n🔐 MANUAL RESET URL:\nhttp://localhost:3000/reset-password?token=${resetToken}\n`);
  }

  return res.json({ message: "If that email exists, a reset link has been sent" });
}

export async function resetPassword(req: Request, res: Response) {
  const parsed = z.object({ resetToken: z.string(), newPassword: z.string().min(6) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "resetToken and newPassword required" });
  const { resetToken, newPassword } = parsed.data;
  const user = await prisma.user.findFirst({ where: { resetToken, resetTokenExpiry: { gt: new Date() } } });
  if (!user) return res.status(400).json({ error: "Invalid or expired reset link. Please request a new one." });
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash, resetToken: null, resetTokenExpiry: null } });
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await recordAudit({ userId: user.id, action: AUDIT_ACTIONS.PASSWORD_RESET, ipAddress: req.ip });
  return res.json({ message: "Password reset successfully. Please log in with your new password." });
}

export async function me(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });
  const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true } });
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({ ...user, permissions: ROLE_PERMISSIONS[user.role] });
}
