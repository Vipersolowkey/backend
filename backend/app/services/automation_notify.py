"""Email, Telegram, Slack notifications for owner automation."""

from __future__ import annotations

import json
import smtplib
from email.mime.text import MIMEText

import httpx

from app.core.config import settings


def _split_csv(raw: str | None) -> list[str]:
    if not raw or not raw.strip():
        return []
    return [p.strip() for p in raw.split(",") if p.strip()]


def send_digest_email(subject: str, body: str) -> None:
    recipients = _split_csv(settings.automation_digest_email_to)
    host = settings.smtp_host
    mail_from = settings.smtp_from or settings.smtp_user
    if not recipients or not host or not mail_from:
        return
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = mail_from
    msg["To"] = ", ".join(recipients)
    if settings.smtp_use_tls:
        with smtplib.SMTP(host, settings.smtp_port, timeout=25) as smtp:
            smtp.starttls()
            if settings.smtp_user and settings.smtp_password:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.sendmail(mail_from, recipients, msg.as_string())
    else:
        with smtplib.SMTP(host, settings.smtp_port, timeout=25) as smtp:
            if settings.smtp_user and settings.smtp_password:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.sendmail(mail_from, recipients, msg.as_string())


def send_telegram_message(text: str) -> None:
    token = settings.automation_telegram_bot_token
    chat_ids = _split_csv(settings.automation_telegram_chat_ids)
    if not token or not chat_ids:
        return
    if len(text) > 4000:
        text = text[:3997] + "..."
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    with httpx.Client(timeout=12.0) as client:
        for cid in chat_ids:
            try:
                client.post(url, json={"chat_id": cid, "text": text})
            except Exception:
                pass


def post_slack_webhooks(urls: list[str], text: str) -> None:
    if not urls:
        return
    payload = {"text": text}
    with httpx.Client(timeout=12.0) as client:
        for url in urls:
            try:
                client.post(url, json=payload, headers={"Content-Type": "application/json"})
            except Exception:
                pass


def send_digest_notifications(subject: str, body: str) -> None:
    send_digest_email(subject, body)
    send_telegram_message(f"{subject}\n\n{body}")
    post_slack_webhooks(_split_csv(settings.automation_digest_slack_webhooks), f"*{subject}*\n{body}")


def alert_slack_urls() -> list[str]:
    alert = _split_csv(settings.automation_alert_slack_webhooks)
    if alert:
        return alert
    return _split_csv(settings.automation_digest_slack_webhooks)


def send_threshold_alert_notifications(summary_lines: list[str], payload: dict) -> None:
    text = "\n".join(summary_lines)
    tg = bool(settings.automation_telegram_bot_token and _split_csv(settings.automation_telegram_chat_ids))
    slack_urls = alert_slack_urls()
    extra = _split_csv(settings.automation_extra_alert_webhooks)
    if not tg and not slack_urls and not extra:
        return
    if tg:
        send_telegram_message(text)
    post_slack_webhooks(slack_urls, text)
    if extra:
        body = json.dumps({"summary": text, "payload": payload}, ensure_ascii=False)
        with httpx.Client(timeout=12.0) as client:
            for url in extra:
                try:
                    client.post(url, content=body.encode("utf-8"), headers={"Content-Type": "application/json"})
                except Exception:
                    pass
