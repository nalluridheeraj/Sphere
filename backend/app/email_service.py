"""
Sphere Email Service
────────────────────
Sends OTP emails via SMTP. Falls back to console output if SMTP is not configured —
perfect for local development without an email provider.
"""
import smtplib
import random
import string
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.config import settings


def generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


def send_otp_email(to_email: str, otp: str, purpose: str) -> bool:
    """Send an OTP email. Prints to console when SMTP is not configured."""

    subject_map = {
        "register": "Verify your Sphere account",
        "reset": "Reset your Sphere password",
    }
    action_map = {
        "register": "verify your email address and activate your Sphere account",
        "reset": "reset your Sphere password",
    }

    subject = subject_map.get(purpose, "Your Sphere OTP")
    action_text = action_map.get(purpose, "complete your request")

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, 'Inter', sans-serif; background: #09090b; color: #e2e8f0; margin: 0; padding: 32px 16px; }}
    .wrap {{ max-width: 480px; margin: 0 auto; background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; padding: 40px; }}
    .logo {{ font-size: 22px; font-weight: 800; color: #a78bfa; letter-spacing: -0.5px; margin-bottom: 28px; }}
    p {{ font-size: 15px; color: #94a3b8; line-height: 1.6; margin: 0 0 16px; }}
    .otp-box {{ background: #1a1a2e; border: 1px solid #2d2d4e; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0; }}
    .otp {{ font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #ffffff; font-variant-numeric: tabular-nums; }}
    .timer {{ font-size: 13px; color: #64748b; margin-top: 8px; }}
    .divider {{ border: none; border-top: 1px solid #1e1e2e; margin: 24px 0; }}
    .note {{ font-size: 13px; color: #475569; }}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="logo">⬡ Sphere</div>
    <p>You requested to <strong style="color:#e2e8f0">{action_text}</strong>. Use the one-time code below:</p>
    <div class="otp-box">
      <div class="otp">{otp}</div>
      <div class="timer">Expires in 10 minutes</div>
    </div>
    <p>Do not share this code with anyone. Sphere staff will never ask for it.</p>
    <hr class="divider">
    <p class="note">If you didn't request this, you can safely ignore this email.</p>
  </div>
</body>
</html>"""

    # ── Console fallback (dev mode) ──────────────────────────────────────────
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("\n" + "=" * 60)
        print(f"  [SPHERE EMAIL]  To      : {to_email}")
        print(f"  [SPHERE EMAIL]  Subject : {subject}")
        print(f"  [SPHERE EMAIL]  OTP Code: {otp}")
        print(f"  [SPHERE EMAIL]  Purpose : {purpose}")
        print("=" * 60 + "\n")
        return True

    # ── Real SMTP ─────────────────────────────────────────────────────────────
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Sphere <{settings.SMTP_USER}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
        return True
    except Exception as exc:
        print(f"[SPHERE EMAIL ERROR] {exc}")
        print(f"[SPHERE EMAIL FALLBACK] OTP for {to_email}: {otp}")
        return False
