from datetime import datetime
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from .models import Attendance, Event, Reservation, User
from .repositories import EventRepository, ReservationRepository, UserRepository
from .schemas import EventInput, RegisterInput, ReservationInput
from .security import create_token, hash_password, verify_password

ACTIVE = {"Confirmada", "Pendiente", "En revisión"}

def public_user(user): return {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "state": user.state}

def event_out(event):
    active = sum(1 for r in event.reservations if r.state in ACTIVE)
    return {"id": event.id, "title": event.title, "type": event.type, "date": event.date, "time": event.time,
            "location": event.location, "capacity": event.capacity, "available": max(event.capacity-active, 0),
            "reserved": active, "occupancyRate": round(active/event.capacity*100), "status": event.status,
            "organizerId": event.organizer_id, "organizer": event.organizer.name, "image": event.image, "description": event.description}

def reservation_out(r):
    return {"id": r.id, "eventId": r.event_id, "event": r.event.title, "userId": r.user_id, "guest": r.participant.name,
            "state": r.state, "date": r.event.date, "checkedIn": r.attendance is not None,
            "checkedInAt": r.attendance.checked_in_at if r.attendance else None, "eventDetail": event_out(r.event)}

def register(db, data: RegisterInput):
    if data.role and data.role != "participant": raise HTTPException(400, "El registro público solo permite participantes")
    if UserRepository(db).by_email(str(data.email).lower()): raise HTTPException(409, "El correo ya está registrado")
    user = User(name=data.name.strip(), email=str(data.email).lower(), role="participant", password_hash=hash_password(data.password))
    db.add(user); db.commit(); db.refresh(user)
    return {"token": create_token(user), "user": public_user(user)}

def login(db, email, password):
    user = UserRepository(db).by_email(str(email).lower())
    if not user or user.state != "Activo" or not verify_password(password, user.password_hash): raise HTTPException(401, "Credenciales inválidas")
    return {"token": create_token(user), "user": public_user(user)}

def create_event(db, data: EventInput, user):
    if data.status not in {"Publicado", "Borrador", "Casi lleno"}: raise HTTPException(400, "Estado de evento no válido")
    event = Event(**data.model_dump(), organizer_id=user.id); db.add(event); db.commit(); db.refresh(event); return event_out(event)

def can_access_event(user, event):
    if user.role == "admin": return True
    return event.organizer_id == user.id

def list_events(db, user):
    events = EventRepository(db).all()
    if user.role == "participant": events = [e for e in events if e.status != "Borrador"]
    elif user.role == "organizer": events = [e for e in events if e.organizer_id == user.id]
    return [event_out(e) for e in events]

def create_reservation(db, data: ReservationInput, user):
    # MariaDB obtains a row lock below; SQLite needs an immediate write
    # transaction so two requests cannot both observe the last cup.
    if db.bind.dialect.name == "sqlite":
        db.connection().exec_driver_sql("BEGIN IMMEDIATE")
    event = EventRepository(db).by_id(data.eventId, lock=True)
    if not event: raise HTTPException(404, "Evento no encontrado")
    if user.role != "participant": raise HTTPException(403, "Solo los participantes pueden reservar")
    if event.status == "Borrador": raise HTTPException(400, "El evento no está disponible")
    existing = db.scalar(select(Reservation).where(Reservation.event_id == event.id, Reservation.user_id == user.id, Reservation.state.in_(ACTIVE)).with_for_update())
    if existing: raise HTTPException(409, "Ya tienes una reservación para este evento")
    if sum(1 for r in event.reservations if r.state in ACTIVE) >= event.capacity: raise HTTPException(409, "El evento ya no tiene cupos disponibles")
    if data.receipt and db.scalar(select(Reservation).where(Reservation.receipt == data.receipt)): raise HTTPException(409, "El comprobante ya fue utilizado")
    reservation = Reservation(id=f"RSV-{int(datetime.utcnow().timestamp()*1000000)}", event_id=event.id, user_id=user.id, receipt=data.receipt, state="Confirmada")
    db.add(reservation)
    try: db.commit(); db.refresh(reservation)
    except IntegrityError: db.rollback(); raise HTTPException(409, "La reservación o comprobante ya existe")
    return reservation_out(reservation)

def visible_reservations(db, user):
    rows = ReservationRepository(db).all()
    if user.role == "participant": rows = [r for r in rows if r.user_id == user.id]
    elif user.role == "organizer": rows = [r for r in rows if r.event.organizer_id == user.id]
    return [reservation_out(r) for r in rows]

def update_reservation(db, reservation_id, state, user):
    r = ReservationRepository(db).by_id(reservation_id, lock=True)
    if not r: raise HTTPException(404, "Reservación no encontrada")
    if user.role != "admin" and (user.role != "organizer" or r.event.organizer_id != user.id): raise HTTPException(403, "No puedes administrar esta reservación")
    if state not in ACTIVE | {"Cancelada"}: raise HTTPException(400, "Estado de reservación no válido")
    if state == "Cancelada" and r.attendance: raise HTTPException(409, "No se puede cancelar una reservación con asistencia")
    r.state = state; r.canceled_at = datetime.utcnow() if state == "Cancelada" else None
    db.commit(); db.refresh(r); return reservation_out(r)

def check_in(db, reservation_id, user):
    r = ReservationRepository(db).by_id(reservation_id, lock=True)
    if not r: raise HTTPException(404, "Reservación no encontrada")
    if user.role != "admin" and (user.role != "organizer" or r.event.organizer_id != user.id): raise HTTPException(403, "No puedes registrar este evento")
    if r.state != "Confirmada": raise HTTPException(400, "Solo las reservaciones confirmadas pueden ingresar")
    if r.attendance: raise HTTPException(409, "La asistencia ya fue registrada")
    db.add(Attendance(reservation_id=r.id)); db.commit(); db.refresh(r); return reservation_out(r)
