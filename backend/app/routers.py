from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from .database import get_db
from .dependencies import current_user, require_roles
from .models import Event, Reservation, User
from .models import Notification
from .notifications import notification_out, pending_notifications, send_notification
from .exports import export_report
from .schemas import AuthInput, AuthResponse, ChangePasswordInput, EventInput, EventOut, EventRescheduleInput, PublicUser, RegisterInput, ReservationInput, ReservationOut, ReservationStateInput, UserAdminUpdate
from .services import ACTIVE_RESERVATIONS, PUBLIC_EVENTS, STATUS_FROM_API, api_role, api_state, cancel_event, change_password, check_in, create_event, create_reservation, event_out, finalize_past_events, list_events, login, public_user, register, reservation_out, reschedule_event, update_event, update_reservation, visible_reservations

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

@router.post("/auth/change-password", response_model=AuthResponse, tags=["auth"])
def auth_change_password(data: ChangePasswordInput, db: Session = Depends(get_db), user: User = Depends(current_user)):
    return change_password(db, user, data.currentPassword, data.newPassword)

@router.get("/users", response_model=list[PublicUser], tags=["users"])
def users(db: Session = Depends(get_db), _user: User = Depends(require_roles("admin"))): return [public_user(u) for u in db.scalars(select(User).order_by(User.id))]

@router.patch("/users/{user_id}", response_model=PublicUser, tags=["users"])
def user_update(user_id: int, data: UserAdminUpdate, db: Session = Depends(get_db), _user: User = Depends(require_roles("admin"))):
    row = db.get(User, user_id)
    if not row: raise HTTPException(404, "Usuario no encontrado")
    if data.role is not None and data.role not in {"admin", "organizer", "participant"}: raise HTTPException(400, "Rol no válido")
    if data.state is not None and data.state not in {"Activo", "Bloqueado"}: raise HTTPException(400, "Estado no válido")
    if data.role is not None: row.role = {"admin":"administrador", "organizer":"organizador", "participant":"participante"}[data.role]
    if data.state is not None: row.state = data.state == "Activo"
    db.commit(); db.refresh(row); return public_user(row)

@router.get("/events", response_model=list[EventOut], tags=["events"])
def events(db: Session = Depends(get_db), user: User = Depends(current_user)): return list_events(db, user)

@router.get("/events/{event_id}", response_model=EventOut, tags=["events"])
def event(event_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    finalize_past_events(db)
    row = db.get(Event, event_id)
    role = api_role(user.role)
    if not row or (role == "participant" and row.status not in PUBLIC_EVENTS) or (role == "organizer" and row.organizer_id != user.id): raise HTTPException(404, "Evento no encontrado")
    return event_out(row)

@router.post("/events", response_model=EventOut, tags=["events"])
def event_create(data: EventInput, db: Session = Depends(get_db), user: User = Depends(require_roles("admin", "organizer"))): return create_event(db, data, user)

@router.patch("/events/{event_id}", response_model=EventOut, tags=["events"])
def event_update(event_id: int, data: EventInput, db: Session = Depends(get_db), user: User = Depends(require_roles("admin", "organizer"))):
    return update_event(db, event_id, data, user)

@router.post("/events/{event_id}/cancel", response_model=EventOut, tags=["events"])
def event_cancel(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles("admin", "organizer"))): return cancel_event(db, event_id, user)

@router.post("/events/{event_id}/reschedule", response_model=EventOut, tags=["events"])
def event_reschedule(event_id: int, data: EventRescheduleInput, db: Session = Depends(get_db), user: User = Depends(require_roles("admin", "organizer"))): return reschedule_event(db, event_id, data, user)

@router.get("/reservations", response_model=list[ReservationOut], tags=["reservations"])
def reservations(db: Session = Depends(get_db), user: User = Depends(current_user)): return visible_reservations(db, user)

@router.post("/reservations", response_model=ReservationOut, tags=["reservations"])
def reservation_create(data: ReservationInput, db: Session = Depends(get_db), user: User = Depends(current_user)): return create_reservation(db, data, user)

@router.patch("/reservations/{reservation_id}/status", response_model=ReservationOut, tags=["reservations"])
def reservation_status(reservation_id: str, data: ReservationStateInput, db: Session = Depends(get_db), user: User = Depends(current_user)): return update_reservation(db, reservation_id, data.state, user)

@router.post("/reservations/{reservation_id}/cancel", response_model=ReservationOut, tags=["reservations"])
def reservation_cancel(reservation_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)): return update_reservation(db, reservation_id, "Cancelada", user)

@router.post("/attendance/check-in", response_model=ReservationOut, tags=["attendance"])
def attendance_check(data: dict, db: Session = Depends(get_db), user: User = Depends(require_roles("admin", "organizer"))): return check_in(db, data.get("reservationId", ""), user, data.get("eventId"))

@router.get("/attendance/{event_id}", response_model=list[ReservationOut], tags=["attendance"])
def attendance_list(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles("admin", "organizer"))):
    event_row = db.get(Event, event_id)
    if not event_row or (api_role(user.role) == "organizer" and event_row.organizer_id != user.id): raise HTTPException(404, "Evento no encontrado")
    return [reservation_out(r) for r in event_row.reservations if r.state in ACTIVE_RESERVATIONS]

@router.get("/reports/summary", tags=["reports"])
def reports(db: Session = Depends(get_db), user: User = Depends(require_roles("admin", "organizer"))):
    events_rows = list(db.scalars(select(Event)))
    if api_role(user.role) == "organizer": events_rows = [e for e in events_rows if e.organizer_id == user.id]
    ids = {e.id for e in events_rows}; reservations_rows = [r for r in db.scalars(select(Reservation)) if r.event_id in ids]
    total_capacity = sum(e.capacity for e in events_rows); active = sum(1 for r in reservations_rows if r.state in ACTIVE_RESERVATIONS)
    return {"activeEvents": len(events_rows), "reservations": len(reservations_rows), "users": db.scalar(select(func.count(User.id))), "confirmedReservations": sum(1 for r in reservations_rows if r.state == "confirmada"), "occupancyRate": round(active / total_capacity * 100) if total_capacity else 0, "categories": {e.category.name: sum(1 for x in events_rows if x.category_id == e.category_id) for e in events_rows}}

@router.get("/reports/export", tags=["reports"])
def report_export(format: str = "CSV", db: Session = Depends(get_db), user: User = Depends(require_roles("admin", "organizer"))):
    content, media_type, filename = export_report(db, user, format)
    return Response(content=content, media_type=media_type, headers={"Content-Disposition": f'attachment; filename="{filename}"'})

@router.get("/notifications", tags=["notifications"])
def user_notifications(db: Session = Depends(get_db), user: User = Depends(current_user)):
    rows = db.scalars(select(Notification).where(Notification.user_id == user.id).order_by(Notification.id.desc())).all()
    return [notification_out(item) for item in rows]

@router.patch("/notifications/{notification_id}/read", tags=["notifications"])
def mark_notification_read(notification_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    item = db.get(Notification, notification_id)
    if not item or item.user_id != user.id: raise HTTPException(404, "Notificación no encontrada")
    item.read = True; db.commit(); db.refresh(item); return notification_out(item)

@router.post("/notifications/process-pending", tags=["notifications"])
def process_pending_notifications(db: Session = Depends(get_db), _user: User = Depends(require_roles("admin"))):
    processed = 0
    for item in pending_notifications(db):
        send_notification(db, item); processed += 1
    return {"processed": processed}
