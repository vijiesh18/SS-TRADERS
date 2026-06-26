import nodemailer from "nodemailer";

/* ── Transporter ─────────────────────────────────────────
   Uses Gmail SMTP. Add these to your backend .env file:
     MAIL_USER=your.gmail@gmail.com
     MAIL_PASS=your-gmail-app-password
     FRONTEND_URL=http://localhost:3000
   ──────────────────────────────────────────────────────── */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export async function sendPasswordResetEmail(
  toEmail: string,
  userName: string,
  resetToken: string
) {
  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>Reset Your Password — S.S Traders</title>
</head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif;">
  <div style="max-width:520px;margin:40px auto;background:#faf7f2;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(100,80,40,0.12);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6b7c45,#8fa05a);padding:32px 40px;text-align:center;">
      <div style="width:52px;height:52px;background:rgba(255,255,255,0.2);border-radius:14px;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;font-size:24px;">🎨</div>
      <div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px;">S.S Traders Management System</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:4px;letter-spacing:0.5px;">Password Reset Request</div>
    </div>

    <!-- Body -->
    <div style="padding:36px 40px;">
      <p style="font-size:16px;color:#2c2418;margin:0 0 8px;">Hello, <strong>${userName}</strong></p>
      <p style="font-size:14px;color:#6b5d4a;line-height:1.7;margin:0 0 28px;">
        We received a request to reset your password for your S.S Traders Management System account.
        Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
      </p>

      <div style="text-align:center;margin-bottom:28px;">
        <a href="${resetUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#6b7c45,#8fa05a);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(107,124,69,0.35);">
          Reset My Password →
        </a>
      </div>

      <p style="font-size:12px;color:#a8937a;margin:0 0 8px;">Or copy this link into your browser:</p>
      <p style="font-size:11px;color:#c47a3a;word-break:break-all;background:rgba(196,122,58,0.08);border:1px solid rgba(196,122,58,0.2);border-radius:8px;padding:10px 14px;margin:0 0 28px;">${resetUrl}</p>

      <div style="border-top:1px solid rgba(180,155,110,0.25);padding-top:20px;">
        <p style="font-size:12px;color:#a8937a;margin:0;line-height:1.6;">
          If you did not request this, you can safely ignore this email — your password will remain unchanged.<br><br>
          <strong style="color:#6b5d4a;">S.S Traders Management System</strong> · Nagercoil, Tamil Nadu<br>
          GSTIN: 33NQAPS4337D1ZS
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:rgba(180,155,110,0.10);padding:16px 40px;text-align:center;">
      <p style="font-size:11px;color:#c0a882;margin:0;">© 2026 S.S Traders Management System · Designed & Curated by Vijiesh 🌿</p>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"S.S Traders Management System" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: "Reset Your Password — S.S Traders Management System",
    html,
  });
}
