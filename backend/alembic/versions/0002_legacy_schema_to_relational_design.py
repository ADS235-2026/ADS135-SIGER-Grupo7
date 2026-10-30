from alembic import op
from sqlalchemy import inspect, text
from app.database import Base
from app import models  # noqa: F401

revision = "0002_relational_design"
down_revision = "0001_initial"
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    old = set(inspect(bind).get_table_names())
    if not {"users", "events", "reservations", "attendance"}.issubset(old):
        return
    event_columns = {column["name"] for column in inspect(bind).get_columns("events")}
    organizer_column = "organizer_id" if "organizer_id" in event_columns else "organizerId"
    # Copy the previous prototype into the seven-table design before removing
    # its temporary tables. This preserves identifiers and historical records.
    canonical = [models.User, models.Category, models.Event, models.Reservation, models.Attendance, models.Notification, models.Report]
    for model in canonical:
        model.__table__.create(bind, checkfirst=True)
    canonical_event_columns = {column["name"] for column in inspect(bind).get_columns("eventos")}
    if "description" in canonical_event_columns and "descripcion" not in canonical_event_columns:
        bind.execute(text("ALTER TABLE eventos CHANGE COLUMN description descripcion TEXT NULL"))
    bind.execute(text("""INSERT IGNORE INTO usuarios (id_usuario,nombre,apellido,correo,contrasena,rol,activo,fecha_registro)
        SELECT id, name, '', email, password_hash,
        CASE role WHEN 'admin' THEN 'administrador' WHEN 'organizer' THEN 'organizador' ELSE 'participante' END,
        CASE WHEN state='Activo' THEN 1 ELSE 0 END, CURRENT_TIMESTAMP FROM users"""))
    bind.execute(text("INSERT IGNORE INTO categorias (nombre,descripcion) SELECT DISTINCT type, type FROM events"))
    bind.execute(text(f"""INSERT IGNORE INTO eventos (id_evento,nombre,descripcion,fecha,hora,ubicacion,capacidad_max,id_organizador,id_categoria,estado,image)
        SELECT e.id,e.title,e.description,e.date,e.time,e.location,e.capacity,e.{organizer_column},c.id_categoria,
        CASE e.status WHEN 'Publicado' THEN 'activo' WHEN 'Casi lleno' THEN 'activo' WHEN 'Borrador' THEN 'borrador' ELSE 'cancelado' END,e.image
        FROM events e JOIN categorias c ON c.nombre=e.type"""))
    bind.execute(text("""INSERT IGNORE INTO reservaciones (id_usuario,id_evento,fecha_reservacion,estado,codigo_comprobante)
        SELECT user_id,event_id,created_at,CASE state WHEN 'Cancelada' THEN 'cancelada' WHEN 'Pendiente' THEN 'pendiente' ELSE 'confirmada' END,id FROM reservations"""))
    bind.execute(text("""INSERT IGNORE INTO asistencias (id_reservacion,hora_registro,validada)
        SELECT r.id_reservacion,old.checked_in_at,1 FROM attendance old JOIN reservaciones r ON r.id_reservacion=old.reservation_id"""))
    for name in ("attendance", "reservations", "events", "users"):
        bind.execute(text(f"DROP TABLE {name}"))

def downgrade():
    # The legacy prototype schema is not recreated automatically; the copied
    # relational data remains in the canonical tables.
    pass
