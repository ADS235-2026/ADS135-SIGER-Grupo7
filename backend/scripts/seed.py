from datetime import date, time
import os
import secrets
from app.database import Base, SessionLocal, engine
from app.models import Category, Event, Reservation, User
from app.security import hash_password

Base.metadata.create_all(engine)
db = SessionLocal()
if not db.query(User).first():
    passwords = {role: os.getenv(f"SEED_{role.upper()}_PASSWORD") or secrets.token_urlsafe(18) for role in ("admin", "organizer", "participant")}
    admin = User(name="Admin", apellido="SIGER", email="admin@siger.edu", role="administrador", state=True, password_hash=hash_password(passwords["admin"]))
    organizer = User(name="Andrea", apellido="Ruiz", email="organizador@siger.edu", role="organizador", state=True, password_hash=hash_password(passwords["organizer"]))
    participant = User(name="Carlos", apellido="Mendoza", email="carlos@siger.edu", role="participante", state=True, password_hash=hash_password(passwords["participant"]))
    db.add_all([admin, organizer, participant]); db.flush()
    categories = {name: Category(name=name, description=f"Eventos de {name}") for name in ["Conferencia", "Taller", "Networking", "Seminario"]}
    db.add_all(categories.values()); db.flush()
    events = [
        Event(title="Liderazgo en la Era Digital", date=date(2026,10,30), time=time(9), location="Auditorio Principal", capacity=120, status="activo", organizer_id=organizer.id, category_id=categories["Conferencia"].id, image="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80", description="Estrategia, cultura digital y toma de decisiones con datos."),
        Event(title="Design Thinking Avanzado", date=date(2026,11,5), time=time(14), location="Sala Boreal", capacity=40, status="activo", organizer_id=organizer.id, category_id=categories["Taller"].id, image="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80", description="Sesión práctica centrada en usuarios."),
        Event(title="Networking para Innovadores", date=date(2026,11,10), time=time(18), location="Terraza Norte", capacity=80, status="activo", organizer_id=admin.id, category_id=categories["Networking"].id, image="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80", description="Encuentro para conectar equipos de innovación."),
        Event(title="Analítica para Gestión de Eventos", date=date(2026,11,15), time=time(10,30), location="Laboratorio Data", capacity=55, status="borrador", organizer_id=admin.id, category_id=categories["Seminario"].id, image="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80", description="Indicadores y tableros para eventos."),
    ]
    db.add_all(events); db.flush()
    db.add_all([Reservation(event_id=events[0].id, user_id=participant.id, state="confirmada", receipt="RSV-1048"), Reservation(event_id=events[1].id, user_id=participant.id, state="pendiente", receipt="RSV-1047")])
    db.commit()
    print("Datos sintéticos cargados")
    print("Credenciales temporales (guárdalas de forma segura):")
    print(f"admin@siger.edu / {passwords['admin']}")
    print(f"organizador@siger.edu / {passwords['organizer']}")
    print(f"carlos@siger.edu / {passwords['participant']}")
else: print("La base ya contiene datos; no se modificó")
db.close()
