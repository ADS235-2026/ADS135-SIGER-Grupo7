from datetime import date, datetime, time
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, Time, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    role: Mapped[str] = mapped_column(String(20), default="participant")
    state: Mapped[str] = mapped_column(String(20), default="Activo")
    password_hash: Mapped[str] = mapped_column(String(255))
    events: Mapped[list["Event"]] = relationship(back_populates="organizer")
    reservations: Mapped[list["Reservation"]] = relationship(back_populates="participant")


class Event(Base):
    __tablename__ = "events"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(180))
    type: Mapped[str] = mapped_column(String(80))
    date: Mapped[date] = mapped_column(Date)
    time: Mapped[time] = mapped_column(Time)
    location: Mapped[str] = mapped_column(String(180))
    capacity: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="Borrador")
    organizer_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    image: Mapped[str] = mapped_column(String(500), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    organizer: Mapped[User] = relationship(back_populates="events")
    reservations: Mapped[list["Reservation"]] = relationship(back_populates="event")


class Reservation(Base):
    __tablename__ = "reservations"
    id: Mapped[str] = mapped_column(String(30), primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    state: Mapped[str] = mapped_column(String(20), default="Confirmada")
    receipt: Mapped[str] = mapped_column(String(120), unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    canceled_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    event: Mapped[Event] = relationship(back_populates="reservations")
    participant: Mapped[User] = relationship(back_populates="reservations")
    attendance: Mapped["Attendance"] = relationship(back_populates="reservation", uselist=False)
    __table_args__ = (Index("ix_reservation_event_user_state", "event_id", "user_id", "state"),)


class Attendance(Base):
    __tablename__ = "attendance"
    id: Mapped[int] = mapped_column(primary_key=True)
    reservation_id: Mapped[str] = mapped_column(ForeignKey("reservations.id"), unique=True)
    checked_in_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    reservation: Mapped[Reservation] = relationship(back_populates="attendance")
