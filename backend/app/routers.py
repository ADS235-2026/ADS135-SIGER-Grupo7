from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from .database import get_db
from .dependencies import current_user, require_roles
from .models import Attendance, Event, Reservation, User
from .schemas import AuthInput, AuthResponse, EventInput, EventOut, PublicUser, RegisterInput, ReservationInput, ReservationOut, ReservationStateInput, UserAdminUpdate
from .services import ACTIVE, check_in, create_event, create_reservation, event_out, list_events, login, public_user, register, reservation_out, update_reservation, visible_reservations

router = APIRouter()

@router.get("/", tags=["health"])
@router.get("/health", tags=["health"])
def health(): return {"name": "SIGER API", "status": "ok", "version": "2.0.0"}

@router.post("/auth/login", response_model=AuthResponse, tags=["auth"])
def auth_login(data: AuthInput, db: Session = Depends(get_db)): return login(db, data.email, data.password)

@router.post("/auth/register", response_model=AuthResponse, tags=["auth"])
def auth_register(data: RegisterInput, db: Session = Depends(get_db)): return register(db, data)

@router.get("/auth/me", response_model=PublicUser, tags=["auth"])
def auth_me(user: User = Depends(current_user)): return public_user(user)

@router.get("/users", response_model=list[PublicUser], tags=["users"])
def users(db: Session = Depends(get_db), _user: User = Depends(require_roles("admin"))): return [public_user(u) for u in db.scalars(select(User).order_by(User.id))]

@router.patch("/users/{user_id}", response_model=PublicUser, tags=["users"])
def user_update(user_id: int, data: UserAdminUpdate, db: Session = Depends(get_db), _user: User = Depends(require_roles("admin"))):
    row = db.get(User, user_id)
    if not row: raise HTTPException(404, "Usuario no encontrado")
    if data.role is not None and data.role not in {"admin", "organizer", "participant"}: raise HTTPException(400, "Rol no válido")
    if data.state is not None and data.state not in {"Activo", "Bloqueado"}: raise HTTPException(400, "Estado no válido")
    if data.role is not None: row.role = data.role
    if data.state is not None: row.state = data.state
    db.commit(); db.refresh(row); return public_user(row)

@router.get("/events", response_model=list[EventOut], tags=["events"])
def events(db: Session = Depends(get_db), user: User = Depends(current_user)): return list_events(db, user)

@router.get("/events/{event_id}", response_model=EventOut, tags=["events"])
def event(event_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    row = db.get(Event, event_id)
    if not row or (user.role == "participant" and row.status == "Borrador") or (user.role == "organizer" and row.organizer_id != user.id): raise HTTPException(404, "Evento no encontrado")
    return event_out(row)

@router.post("/events", response_model=EventOut, tags=["events"])
def event_create(data: EventInput, db: Session = Depends(get_db), user: User = Depends(require_roles("admin", "organizer"))): return create_event(db, data, user)

@router.patch("/events/{event_id}", response_model=EventOut, tags=["events"])
def event_update(event_id: int, data: EventInput, db: Session = Depends(get_db), user: User = Depends(require_roles("admin", "organizer"))):
    row = db.get(Event, event_id)
    if not row: raise HTTPException(404, "Evento no encontrado")
    if user.role != "admin" and row.organizer_id != user.id: raise HTTPException(403, "Solo puedes administrar tus eventos")
    for key, value in data.model_dump().items(): setattr(row, key, value)
    db.commit(); db.refresh(row); return event_out(row)

@router.get("/reservations", response_model=list[ReservationOut], tags=["reservations"])
def reservations(db: Session = Depends(get_db), user: User = Depends(current_user)): return visible_reservations(db, user)

@router.post("/reservations", response_model=ReservationOut, tags=["reservations"])
def reservation_create(data: ReservationInput, db: Session = Depends(get_db), user: User = Depends(current_user)): return create_reservation(db, data, user)

@router.patch("/reservations/{reservation_id}/status", response_model=ReservationOut, tags=["reservations"])
def reservation_status(reservation_id: str, data: ReservationStateInput, db: Session = Depends(get_db), user: User = Depends(current_user)): return update_reservation(db, reservation_id, data.state, user)

@router.post("/reservations/{reservation_id}/cancel", response_model=ReservationOut, tags=["reservations"])
def reservation_cancel(reservation_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)): return update_reservation(db, reservation_id, "Cancelada", user)

@router.post("/attendance/check-in", response_model=ReservationOut, tags=["attendance"])
def attendance_check(data: dict, db: Session = Depends(get_db), user: User = Depends(require_roles("admin", "organizer"))): return check_in(db, data.get("reservationId", ""), user)

@router.get("/attendance/{event_id}", response_model=list[ReservationOut], tags=["attendance"])
def attendance_list(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles("admin", "organizer"))):
    event_row = db.get(Event, event_id)
    if not event_row or (user.role == "organizer" and event_row.organizer_id != user.id): raise HTTPException(404, "Evento no encontrado")
    return [reservation_out(r) for r in event_row.reservations]

@router.get("/reports/summary", tags=["reports"])
def reports(db: Session = Depends(get_db), user: User = Depends(require_roles("admin", "organizer"))):
    events = list(db.scalars(select(Event)))
    if user.role == "organizer": events = [e for e in events if e.organizer_id == user.id]
    event_ids = {e.id for e in events}
    reservations_rows = [r for r in db.scalars(select(Reservation)) if r.event_id in event_ids]
    total_capacity = sum(e.capacity for e in events)
    reserved = sum(1 for r in reservations_rows if r.state in ACTIVE)
    return {"activeEvents": len(events), "reservations": len(reservations_rows), "users": db.scalar(select(func.count(User.id))),
            "confirmedReservations": sum(1 for r in reservations_rows if r.state == "Confirmada"),
            "occupancyRate": round(reserved / total_capacity * 100) if total_capacity else 0,
            "categories": {kind: sum(1 for e in events if e.type == kind) for kind in {e.type for e in events}}}
