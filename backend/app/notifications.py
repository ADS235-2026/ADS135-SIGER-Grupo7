from datetime import datetime, timezone
from email.message import EmailMessage
import smtplib
from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException
from .config import settings

def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)
from .models import Notification, User

def add_notification(db: Session, user_id: int, kind: str, message: str) -> Notification:
    notification = Notification(user_id=user_id, kind=kind, message=message, read=False)
    db.add(notification)
    return notification

def notification_out(item: Notification):
    return {"id": item.id, "type": item.kind, "message": item.message, "sentAt": item.sent_at,
            "read": item.read, "userId": item.user_id}

def send_notification(db: Session, item: Notification) -> Notification:
    if item.sent_at:
        return item
    if not all((settings.smtp_host, settings.smtp_from)):
        raise HTTPException(503, "SMTP no está configurado; la notificación permanece pendiente")
    recipient = db.get(User, item.user_id)
    if not recipient:
        raise HTTPException(404, "Destinatario no encontrado")
    message = EmailMessage()
    message["Subject"] = f"SIGER · {item.kind.capitalize()}"
    message["From"] = settings.smtp_from
    message["To"] = recipient.email
    message.set_content(item.message)
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
        if settings.smtp_tls:
            smtp.starttls()
        if settings.smtp_user and settings.smtp_password:
            smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(message)
    item.sent_at = utc_now()
    db.commit()
    db.refresh(item)
    return item

def pending_notifications(db: Session, limit: int = 100):
    return list(db.scalars(select(Notification).where(Notification.sent_at.is_(None)).order_by(Notification.id).limit(limit)))
