from sqlalchemy import select
from sqlalchemy.orm import Session
from .models import Event, Reservation, User

class UserRepository:
    def __init__(self, db: Session): self.db = db
    def by_id(self, user_id): return self.db.get(User, user_id)
    def by_email(self, email): return self.db.scalar(select(User).where(User.email == email))
    def all(self): return list(self.db.scalars(select(User).order_by(User.id)))

class EventRepository:
    def __init__(self, db: Session): self.db = db
    def by_id(self, event_id, lock=False):
        query = select(Event).where(Event.id == event_id)
        if lock: query = query.with_for_update()
        return self.db.scalar(query)
    def all(self): return list(self.db.scalars(select(Event).order_by(Event.id.desc())))

class ReservationRepository:
    def __init__(self, db: Session): self.db = db
    def by_id(self, reservation_id, lock=False):
        query = select(Reservation).where(Reservation.id == reservation_id)
        if lock: query = query.with_for_update()
        return self.db.scalar(query)
    def all(self): return list(self.db.scalars(select(Reservation).order_by(Reservation.created_at.desc())))
