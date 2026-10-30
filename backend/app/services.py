from datetime import datetime, timezone
from uuid import uuid4
from zoneinfo import ZoneInfo
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from .config import settings
from .models import Attendance, Category, Event, Reservation, User, WaitlistEntry
from .notifications import add_notification
from .repositories import EventRepository, ReservationRepository, UserRepository
from .schemas import EventInput, EventRescheduleInput, RegisterInput, ReservationInput
from .security import create_token, hash_password, validate_password, verify_password

ACTIVE_ROLES = {"administrador", "organizador", "participante"}
ACTIVE_RESERVATIONS = {"confirmada", "pendiente"}
PUBLIC_EVENTS = {"activo", "reprogramado"}
ROLE_TO_API = {"administrador": "admin", "organizador": "organizer", "participante": "participant", "admin": "admin", "organizer": "organizer", "participant": "participant"}
STATUS_TO_API = {"borrador": "Borrador", "activo": "Publicado", "cancelado": "Cancelado", "reprogramado": "Reprogramado", "finalizado": "Finalizado"}
STATUS_FROM_API = {"Borrador": "borrador", "Publicado": "activo", "Casi lleno": "activo", "Cancelado": "cancelado", "Reprogramado": "reprogramado", "Finalizado": "finalizado"}

def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)

def api_role(role): return ROLE_TO_API.get(role, role)
def db_role(role): return {"admin": "administrador", "organizer": "organizador", "participant": "participante"}.get(role, role)
def api_state(state): return "Activo" if state in {"Activo", True, 1} else "Bloqueado"
def public_user(user):
    return {"id": user.id, "name": user.name, "email": user.email, "role": api_role(user.role), "state": api_state(user.state)}

def event_out(event):
    active = sum(1 for r in event.reservations if r.state in ACTIVE_RESERVATIONS)
    return {"id": event.id, "title": event.title, "type": event.category.name, "date": event.date, "time": event.time,
            "location": event.location, "capacity": event.capacity, "available": max(event.capacity-active, 0),
            "reserved": active, "occupancyRate": round(active/event.capacity*100), "status": STATUS_TO_API.get(event.status, event.status),
            "organizerId": event.organizer_id, "organizer": event.organizer.name, "image": event.image, "description": event.description or ""}

def reservation_out(r):
    return {"id": r.receipt, "reservationId": r.id, "eventId": r.event_id, "event": r.event.title, "userId": r.user_id,
            "guest": r.participant.name, "state": r.state.capitalize(), "date": r.event.date,
            "checkedIn": r.attendance is not None, "checkedInAt": r.attendance.checked_in_at if r.attendance else None,
            "eventDetail": event_out(r.event)}

def waitlist_out(entry, position):
    return {"id": entry.id, "eventId": entry.event_id, "event": entry.event.title, "userId": entry.user_id, "position": position, "date": entry.created_at}

def waitlist_position(db, entry):
    return db.scalar(select(WaitlistEntry).where(WaitlistEntry.event_id == entry.event_id, WaitlistEntry.created_at < entry.created_at).order_by(WaitlistEntry.created_at))

def register(db, data: RegisterInput):
    if data.role and db_role(data.role) != "participante": raise HTTPException(400, "El registro público solo permite participantes")
    email = str(data.email).lower()
    if UserRepository(db).by_email(email): raise HTTPException(409, "El correo ya está registrado")
    pieces = data.name.strip().split(maxsplit=1)
    user = User(name=pieces[0], apellido=pieces[1] if len(pieces) > 1 else "", email=email, role="participante", state=True, password_hash=hash_password(data.password))
    db.add(user); db.commit(); db.refresh(user)
    return {"token": create_token(user), "user": public_user(user)}

def change_password(db, user, current_password: str, new_password: str):
    if not verify_password(current_password, user.password_hash):
        raise HTTPException(400, "La contraseña actual no es válida")
    try:
        validate_password(new_password)
    except ValueError as error:
        raise HTTPException(422, str(error)) from error
    if verify_password(new_password, user.password_hash):
        raise HTTPException(400, "La nueva contraseña debe ser diferente")
    user.password_hash = hash_password(new_password)
    db.commit(); db.refresh(user)
    return {"token": create_token(user), "user": public_user(user)}

def login(db, email, password):
    user = UserRepository(db).by_email(str(email).lower())
    if not user or api_state(user.state) != "Activo" or not verify_password(password, user.password_hash): raise HTTPException(401, "Credenciales inválidas")
    return {"token": create_token(user), "user": public_user(user)}

def category_for(db, data):
    category = db.get(Category, data.categoryId) if getattr(data, "categoryId", None) else db.scalar(select(Category).where(Category.name == data.type))
    if not category:
        category = Category(name=data.type, description=data.type); db.add(category); db.flush()
    return category

def create_event(db, data: EventInput, user):
    if data.status not in STATUS_FROM_API: raise HTTPException(400, "Estado de evento no válido")
    if datetime.combine(data.date, data.time) <= datetime.now(ZoneInfo(settings.timezone)).replace(tzinfo=None): raise HTTPException(400, "La fecha y hora del evento deben ser futuras")
    category = category_for(db, data)
    event = Event(title=data.title, description=data.description, date=data.date, time=data.time, location=data.location,
                  capacity=data.capacity, organizer_id=user.id, category_id=category.id, status=STATUS_FROM_API[data.status], image=data.image)
    db.add(event); db.commit(); db.refresh(event); return event_out(event)

def list_events(db, user):
    finalize_past_events(db)
    events = EventRepository(db).all()
    if api_role(user.role) == "participant": events = [e for e in events if e.status in PUBLIC_EVENTS]
    elif api_role(user.role) == "organizer": events = [e for e in events if e.organizer_id == user.id]
    return [event_out(e) for e in events]

def event_is_future(event):
    now = datetime.now(ZoneInfo(settings.timezone)).replace(tzinfo=None)
    return datetime.combine(event.date, event.time) > now

def finalize_past_events(db):
    changed = False
    for event in db.scalars(select(Event).where(Event.status.in_(PUBLIC_EVENTS))):
        if not event_is_future(event):
            event.status = "finalizado"; changed = True
    if changed: db.commit()

def _assert_event_owner(event, user):
    if not event: raise HTTPException(404, "Evento no encontrado")
    if api_role(user.role) != "admin" and (api_role(user.role) != "organizer" or event.organizer_id != user.id): raise HTTPException(403, "Solo puedes administrar tus eventos")

def update_event(db, event_id, data: EventInput, user):
    event = db.scalar(select(Event).where(Event.id == event_id).with_for_update())
    _assert_event_owner(event, user)
    if event.status in {"cancelado", "finalizado"}: raise HTTPException(409, "El evento ya no puede editarse")
    if datetime.combine(data.date, data.time) <= datetime.now(ZoneInfo(settings.timezone)).replace(tzinfo=None): raise HTTPException(400, "La fecha y hora del evento deben ser futuras")
    active_count = len(list(db.scalars(select(Reservation).where(Reservation.event_id == event.id, Reservation.state.in_(ACTIVE_RESERVATIONS)).with_for_update())))
    if data.capacity < active_count: raise HTTPException(400, "La capacidad no puede ser menor que las reservas activas")
    category = category_for(db, data)
    event.title, event.description, event.date, event.time, event.location, event.capacity = data.title, data.description, data.date, data.time, data.location, data.capacity
    event.category_id, event.status, event.image = category.id, STATUS_FROM_API[data.status], data.image
    db.commit(); db.refresh(event); return event_out(event)

def cancel_event(db, event_id, user):
    event = db.scalar(select(Event).where(Event.id == event_id).with_for_update()); _assert_event_owner(event, user)
    if event.status == "cancelado": return event_out(event)
    if event.status == "finalizado": raise HTTPException(409, "El evento ya finalizó")
    event.status = "cancelado"
    for reservation in event.reservations:
        if reservation.state in ACTIVE_RESERVATIONS: add_notification(db, reservation.user_id, "cancelacion", f"El evento {event.title} fue cancelado.")
    db.commit(); db.refresh(event); return event_out(event)

def reschedule_event(db, event_id, data: EventRescheduleInput, user):
    event = db.scalar(select(Event).where(Event.id == event_id).with_for_update()); _assert_event_owner(event, user)
    if event.status in {"cancelado", "finalizado"}: raise HTTPException(409, "El evento ya no puede reprogramarse")
    if datetime.combine(data.date, data.time) <= datetime.now(ZoneInfo(settings.timezone)).replace(tzinfo=None): raise HTTPException(400, "La nueva fecha y hora deben ser futuras")
    event.date, event.time, event.status = data.date, data.time, "reprogramado"
    for reservation in event.reservations:
        if reservation.state in ACTIVE_RESERVATIONS: add_notification(db, reservation.user_id, "cambio", f"El evento {event.title} fue reprogramado para {data.date} {data.time}.")
    db.commit(); db.refresh(event); return event_out(event)

def find_reservation(db, reservation_id, lock=False):
    query = select(Reservation).where(Reservation.receipt == str(reservation_id))
    if str(reservation_id).isdigit(): query = select(Reservation).where(Reservation.id == int(reservation_id))
    if lock: query = query.with_for_update()
    return db.scalar(query)

def create_reservation(db, data: ReservationInput, user):
    if db.bind.dialect.name == "sqlite": db.connection().exec_driver_sql("BEGIN IMMEDIATE")
    event = EventRepository(db).by_id(data.eventId, lock=True)
    if not event: raise HTTPException(404, "Evento no encontrado")
    if api_role(user.role) != "participant" or api_state(user.state) != "Activo": raise HTTPException(403, "Solo los participantes activos pueden reservar")
    if event.status not in PUBLIC_EVENTS or not event_is_future(event): raise HTTPException(400, "El evento no está habilitado o ya pasó")
    existing = db.scalar(select(Reservation).where(Reservation.event_id == event.id, Reservation.user_id == user.id).with_for_update())
    if existing and existing.state in ACTIVE_RESERVATIONS: raise HTTPException(409, "Ya tienes una reservación para este evento")
    # This is deliberately a locking read, not a normal aggregate snapshot:
    # under MariaDB REPEATABLE READ the latter can retain a pre-lock snapshot.
    active_rows = list(db.scalars(select(Reservation).where(Reservation.event_id == event.id, Reservation.state.in_(ACTIVE_RESERVATIONS)).with_for_update()))
    active_count = len(active_rows)
    if active_count >= event.capacity: raise HTTPException(409, "El evento ya no tiene cupos disponibles")
    if data.receipt and db.scalar(select(Reservation).where(Reservation.receipt == data.receipt)): raise HTTPException(409, "El comprobante ya fue utilizado")
    receipt = data.receipt or str(uuid4())
    if existing:
        if existing.attendance: raise HTTPException(409, "La reservación tiene asistencia y no puede reactivarse")
        existing.state, existing.receipt, existing.created_at = "confirmada", receipt, utc_now(); reservation = existing
    else:
        reservation = Reservation(event_id=event.id, user_id=user.id, receipt=receipt, state="confirmada"); db.add(reservation)
    add_notification(db, user.id, "confirmacion", f"Tu reserva para {event.title} fue confirmada. Comprobante: {receipt}")
    try:
        db.commit(); db.refresh(reservation); db.expire(event, ["reservations"])
    except IntegrityError: db.rollback(); raise HTTPException(409, "La reservación o comprobante ya existe")
    return reservation_out(reservation)

def join_waitlist(db, event_id, user):
    event = EventRepository(db).by_id(event_id, lock=True)
    if not event: raise HTTPException(404, "Evento no encontrado")
    if api_role(user.role) != "participant" or api_state(user.state) != "Activo": raise HTTPException(403, "Solo los participantes activos pueden entrar a la lista de espera")
    if event.status not in PUBLIC_EVENTS or not event_is_future(event): raise HTTPException(400, "El evento no está habilitado o ya pasó")
    active_count = len(list(db.scalars(select(Reservation).where(Reservation.event_id == event.id, Reservation.state.in_(ACTIVE_RESERVATIONS)).with_for_update())))
    if active_count < event.capacity: raise HTTPException(400, "El evento todavía tiene cupos disponibles")
    existing_reservation = db.scalar(select(Reservation).where(Reservation.event_id == event.id, Reservation.user_id == user.id))
    if existing_reservation and existing_reservation.state in ACTIVE_RESERVATIONS: raise HTTPException(409, "Ya tienes una reservación para este evento")
    existing = db.scalar(select(WaitlistEntry).where(WaitlistEntry.event_id == event.id, WaitlistEntry.user_id == user.id))
    if existing: raise HTTPException(409, "Ya estás en la lista de espera")
    entry = WaitlistEntry(event_id=event.id, user_id=user.id); db.add(entry); db.commit(); db.refresh(entry)
    position = len(list(db.scalars(select(WaitlistEntry).where(WaitlistEntry.event_id == event.id, WaitlistEntry.id <= entry.id))))
    return waitlist_out(entry, position)

def visible_waitlist(db, user):
    query = select(WaitlistEntry).order_by(WaitlistEntry.created_at)
    if api_role(user.role) == "participant": query = query.where(WaitlistEntry.user_id == user.id)
    elif api_role(user.role) == "organizer": query = query.join(Event).where(Event.organizer_id == user.id)
    rows = list(db.scalars(query))
    positions = {}
    result = []
    for entry in rows:
        positions[entry.event_id] = positions.get(entry.event_id, 0) + 1
        result.append(waitlist_out(entry, positions[entry.event_id]))
    return result

def leave_waitlist(db, entry_id, user):
    entry = db.get(WaitlistEntry, entry_id)
    if not entry: raise HTTPException(404, "Entrada de lista de espera no encontrada")
    if api_role(user.role) != "admin" and entry.user_id != user.id and not (api_role(user.role) == "organizer" and entry.event.organizer_id == user.id):
        raise HTTPException(403, "No puedes retirar esta entrada de la lista de espera")
    db.delete(entry); db.commit(); return {"id": entry_id, "removed": True}

def promote_waitlisted_user(db, event):
    active_count = len(list(db.scalars(select(Reservation).where(Reservation.event_id == event.id, Reservation.state.in_(ACTIVE_RESERVATIONS)).with_for_update())))
    if active_count >= event.capacity: return None
    entry = db.scalar(select(WaitlistEntry).where(WaitlistEntry.event_id == event.id).order_by(WaitlistEntry.created_at).with_for_update())
    if not entry: return None
    receipt = str(uuid4())
    reservation = Reservation(event_id=event.id, user_id=entry.user_id, receipt=receipt, state="confirmada")
    db.add(reservation); add_notification(db, entry.user_id, "confirmacion", f"Se liberó un cupo y tu reserva para {event.title} fue confirmada. Comprobante: {receipt}")
    db.delete(entry)
    return reservation

def visible_reservations(db, user):
    rows = ReservationRepository(db).all()
    if api_role(user.role) == "participant": rows = [r for r in rows if r.user_id == user.id]
    elif api_role(user.role) == "organizer": rows = [r for r in rows if r.event.organizer_id == user.id]
    return [reservation_out(r) for r in rows]

def update_reservation(db, reservation_id, state, user):
    r = find_reservation(db, reservation_id, lock=True)
    if not r: raise HTTPException(404, "Reservación no encontrada")
    role = api_role(user.role)
    allowed = (role == "admin" or (role == "organizer" and r.event.organizer_id == user.id) or (role == "participant" and r.user_id == user.id))
    if not allowed: raise HTTPException(403, "No puedes administrar esta reservación")
    target = {"Confirmada": "confirmada", "Pendiente": "pendiente", "Cancelada": "cancelada"}.get(state, state)
    if target not in ACTIVE_RESERVATIONS | {"cancelada"}: raise HTTPException(400, "Estado de reservación no válido")
    if target == "cancelada":
        if r.state == "cancelada": return reservation_out(r)
        if r.attendance: raise HTTPException(409, "No se puede cancelar una reservación con asistencia")
    r.state = target
    if target == "cancelada": add_notification(db, r.user_id, "cancelacion", f"Tu reserva para {r.event.title} fue cancelada.")
    if target == "cancelada": promote_waitlisted_user(db, r.event)
    db.commit(); db.refresh(r); return reservation_out(r)

def check_in(db, reservation_id, user, event_id=None):
    r = find_reservation(db, reservation_id, lock=True)
    if not r: raise HTTPException(404, "Reservación no encontrada")
    if event_id is not None and r.event_id != int(event_id): raise HTTPException(400, "El comprobante no corresponde al evento")
    if api_role(user.role) != "admin" and (api_role(user.role) != "organizer" or r.event.organizer_id != user.id): raise HTTPException(403, "No puedes registrar este evento")
    if r.state != "confirmada": raise HTTPException(400, "Solo las reservaciones confirmadas pueden ingresar")
    if r.attendance: raise HTTPException(409, "La asistencia ya fue registrada")
    db.add(Attendance(reservation_id=r.id, valid=True)); db.commit(); db.refresh(r); return reservation_out(r)
