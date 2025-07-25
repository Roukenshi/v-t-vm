import os
import smtplib
from email.mime.text import MIMEText

def send_email(to: str, subject: str, body: str):
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = os.getenv("SMTP_FROM")
    msg["To"] = to

    with smtplib.SMTP_SSL(os.getenv("SMTP_HOST"), int(os.getenv("SMTP_PORT"))) as server:
        server.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASS"))
        server.send_message(msg)
