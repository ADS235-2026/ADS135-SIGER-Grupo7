from datetime import date, datetime, time, timezone
from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, Enum as SQLEnum, ForeignKey, Integer, JSON, String, Text, Time, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)

class User(Base):
    __tablename__ = "usuarios"
    id: Mapped[int] = mapped_column("id_usuario", Integer, primary_key=True)
    name: Mapped[str] = mapped_column("nombre", String(50))
    apellido: Mapped[str] = mapped_column(String(50), default="")
    email: Mapped[str] = mapped_column("correo", String(100), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column("contrasena", String(255))
    role: Mapped[str] = mapped_column("rol", SQLEnum("administrador", "organizador", "participante", name="rol_enum"), default="participante")
    state: Mapped[bool] = mapped_column("activo", Boolean, default=True)
    fecha_registro: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    events: Mapped[list["Event"]] = relationship(back_populates="organizer")
    reservations: Mapped[list["Reservation"]] = relationship(back_populates="participant")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user")
    reports: Mapped[list["Report"]] = relationship(back_populates="generator")
    waitlist_entries: Mapped[list["WaitlistEntry"]] = relationship(back_populates="user")

class Category(Base):
    __tablename__ = "categorias"
    id: Mapped[int] = mapped_column("id_categoria", Integer, primary_key=True)
    name: Mapped[str] = mapped_column("nombre", String(100), unique=True)
    description: Mapped[str] = mapped_column("descripcion", String(255), nullable=True)
    events: Mapped[list["Event"]] = relationship(back_populates="category")

class Event(Base):
    __tablename__ = "eventos"
    id: Mapped[int] = mapped_column("id_evento", Integer, primary_key=True)
    title: Mapped[str] = mapped_column("nombre", String(150))
    description: Mapped[str] = mapped_column("descripcion", Text, nullable=True)
    date: Mapped[date] = mapped_column("fecha", Date)
    time: Mapped[time] = mapped_column("hora", Time)
    location: Mapped[str] = mapped_column("ubicacion", String(200))
    capacity: Mapped[int] = mapped_column("capacidad_max", Integer)
    organizer_id: Mapped[int] = mapped_column("id_organizador", ForeignKey("usuarios.id_usuario"))
    category_id: Mapped[int] = mapped_column("id_categoria", ForeignKey("categorias.id_categoria"))
    status: Mapped[str] = mapped_column("estado", SQLEnum("borrador", "activo", "cancelado", "reprogramado", "finalizado", name="evento_estado_enum"), default="borrador")
    image: Mapped[str] = mapped_column(String(500), default="")
    organizer: Mapped[User] = relationship(back_populates="events")
    category: Mapped[Category] = relationship(back_populates="events")
    reservations: Mapped[list["Reservation"]] = relationship(back_populates="event")
    waitlist_entries: Mapped[list["WaitlistEntry"]] = relationship(back_populates="event")
    __table_args__ = (CheckConstraint("capacidad_max > 0", name="ck_event_capacity_positive"), Index("ix_event_status_date", "estado", "fecha"))

class Reservation(Base):
    __tablename__ = "reservaciones"
    id: Mapped[int] = mapped_column("id_reservacion", Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column("id_evento", ForeignKey("eventos.id_evento"))
    user_id: Mapped[int] = mapped_column("id_usuario", ForeignKey("usuarios.id_usuario"))
    created_at: Mapped[datetime] = mapped_column("fecha_reservacion", DateTime, default=utc_now)
    state: Mapped[str] = mapped_column("estado", SQLEnum("pendiente", "confirmada", "cancelada", name="reserva_estado_enum"), default="confirmada")
    receipt: Mapped[str] = mapped_column("codigo_comprobante", String(36), unique=True)
    event: Mapped[Event] = relationship(back_populates="reservations")
    participant: Mapped[User] = relationship(back_populates="reservations")
    attendance: Mapped["Attendance"] = relationship(back_populates="reservation", uselist=False)
    __table_args__ = (UniqueConstraint("id_usuario", "id_evento", name="uq_reservation_user_event"), Index("ix_reservation_event_state", "id_evento", "estado"))

class WaitlistEntry(Base):
    __tablename__ = "lista_espera"
    id: Mapped[int] = mapped_column("id_lista_espera", Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column("id_evento", ForeignKey("eventos.id_evento"))
    user_id: Mapped[int] = mapped_column("id_usuario", ForeignKey("usuarios.id_usuario"))
    created_at: Mapped[datetime] = mapped_column("fecha_registro", DateTime, default=utc_now)
    event: Mapped[Event] = relationship(back_populates="waitlist_entries")
    user: Mapped[User] = relationship(back_populates="waitlist_entries")
    __table_args__ = (UniqueConstraint("id_usuario", "id_evento", name="uq_waitlist_user_event"), Index("ix_waitlist_event_created", "id_evento", "fecha_registro"))

class Attendance(Base):
    __tablename__ = "asistencias"
    id: Mapped[int] = mapped_column("id_asistencia", Integer, primary_key=True, autoincrement=True)
    reservation_id: Mapped[int] = mapped_column("id_reservacion", ForeignKey("reservaciones.id_reservacion"), unique=True)
    checked_in_at: Mapped[datetime] = mapped_column("hora_registro", DateTime, default=utc_now)
    valid: Mapped[bool] = mapped_column("validada", Boolean, default=True)
    reservation: Mapped[Reservation] = relationship(back_populates="attendance")

class Notification(Base):
    __tablename__ = "notificaciones"
    id: Mapped[int] = mapped_column("id_notificacion", Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column("id_usuario", ForeignKey("usuarios.id_usuario"))
    kind: Mapped[str] = mapped_column("tipo", SQLEnum("confirmacion", "cambio", "cancelacion", "recordatorio", name="notificacion_tipo_enum"))
    message: Mapped[str] = mapped_column("mensaje", String(255))
    sent_at: Mapped[datetime] = mapped_column("fecha_envio", DateTime, nullable=True)
    read: Mapped[bool] = mapped_column("leida", Boolean, default=False)
    user: Mapped[User] = relationship(back_populates="notifications")

class Report(Base):
    __tablename__ = "reportes"
    id: Mapped[int] = mapped_column("id_reporte", Integer, primary_key=True, autoincrement=True)
    kind: Mapped[str] = mapped_column("tipo", String(50))
    generated_at: Mapped[datetime] = mapped_column("fecha_generacion", DateTime, default=utc_now)
    data: Mapped[dict] = mapped_column("datos", JSON, nullable=True)
    format: Mapped[str] = mapped_column("formato", SQLEnum("PDF", "EXCEL", "CSV", name="reporte_formato_enum"))
    generator_id: Mapped[int] = mapped_column("id_generador", ForeignKey("usuarios.id_usuario"))
    generator: Mapped[User] = relationship(back_populates="reports")
