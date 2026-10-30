import base64, hashlib, hmac, secrets
from datetime import datetime, timedelta, timezone
import jwt
from fastapi import HTTPException, status
from .config import settings

def validate_password(password: str) -> str:
    if len(password) < 8 or len(password) > 128:
        raise ValueError("La contraseña debe tener entre 8 y 128 caracteres")
    if not any(char.islower() for char in password):
        raise ValueError("La contraseña debe incluir una letra minúscula")
    if not any(char.isupper() for char in password):
        raise ValueError("La contraseña debe incluir una letra mayúscula")
    if not any(char.isdigit() for char in password):
        raise ValueError("La contraseña debe incluir un número")
    if not any(not char.isalnum() for char in password):
        raise ValueError("La contraseña debe incluir un carácter especial")
    return password

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"scrypt${base64.urlsafe_b64encode(salt).decode()}${base64.urlsafe_b64encode(digest).decode()}"

def verify_password(password: str, encoded: str) -> bool:
    try:
        _, salt_text, digest_text = encoded.split("$", 2)
        salt = base64.urlsafe_b64decode(salt_text.encode())
        actual = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
        return hmac.compare_digest(actual, base64.urlsafe_b64decode(digest_text.encode()))
    except (ValueError, TypeError):
        return False

def create_token(user) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": str(user.id), "email": user.email, "role": user.role,
                       "iat": now, "exp": now + timedelta(minutes=settings.jwt_expires_minutes)},
                      settings.jwt_secret, algorithm="HS256")

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sesión expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
