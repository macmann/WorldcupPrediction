import crypto from "node:crypto";
import { config } from "./config";

const TOKEN_BYTES = 32;

export const PASSWORD_RESET_TOKEN_TTL_MINUTES = 60;

export function createPasswordResetToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashPasswordResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getPasswordResetExpiry(now = new Date()) {
  return new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000);
}

export function buildPasswordResetUrl(token: string) {
  const baseUrl = config.appBaseUrl.replace(/\/$/, "");
  return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  if (!config.resendApiKey || !config.passwordResetFromEmail) {
    console.info(`Password reset link for ${email}: ${resetUrl}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: config.passwordResetFromEmail,
      to: email,
      subject: "Reset your FFM - WC2026 password",
      html: `<p>Use this secure link to reset your FFM - WC2026 password:</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in ${PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes. If you did not request it, you can ignore this email.</p>`,
      text: `Use this secure link to reset your FFM - WC2026 password: ${resetUrl}\n\nThis link expires in ${PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes. If you did not request it, you can ignore this email.`
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw Object.assign(new Error(`Could not send password reset email: ${body}`), { status: 502 });
  }
}
