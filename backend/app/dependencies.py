from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from .database import get_db
from .models import User
from .security import decode_token

def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Autenticación requerida")
    payload = decode_token(authorization[7:])
    user = db.get(User, int(payload["sub"]))
    if not user or not user.state: raise HTTPException(401, "Usuario no disponible")
    return user

def require_roles(*roles):
    def dependency(user: User = Depends(current_user)):
        normalized = {"administrador": "admin", "organizador": "organizer", "participante": "participant"}.get(user.role, user.role)
        if normalized not in roles: raise HTTPException(403, "No tienes permisos para esta operación")
        return user
    return dependency
