from datetime import date, time
from app.database import Base, SessionLocal, engine
from app.models import Event, Reservation, User
from app.security import hash_password

Base.metadata.create_all(engine)
db = SessionLocal()
if not db.query(User).first():
    admin = User(name="Admin SIGER", email="admin@siger.edu", role="admin", state="Activo", password_hash=hash_password("Admin123!"))
    organizer = User(name="Andrea Ruiz", email="organizador@siger.edu", role="organizer", state="Activo", password_hash=hash_password("Organizador123!"))
    participant = User(name="Carlos Mendoza", email="carlos@siger.edu", role="participant", state="Activo", password_hash=hash_password("Carlos123!"))
    db.add_all([admin, organizer, participant]); db.flush()
    events = [
        Event(title="Liderazgo en la Era Digital", type="Conferencia", date=date(2026,10,24), time=time(9), location="Auditorio Principal", capacity=120, status="Publicado", organizer_id=organizer.id, image="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80", description="Una jornada para equipos ejecutivos sobre estrategia, cultura digital y toma de decisiones con datos."),
        Event(title="Design Thinking Avanzado", type="Taller", date=date(2026,10,29), time=time(14), location="Sala Boreal", capacity=40, status="Casi lleno", organizer_id=organizer.id, image="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80", description="Sesión práctica para mapear problemas, prototipar soluciones y validar experiencias centradas en usuarios."),
        Event(title="Networking para Innovadores", type="Networking", date=date(2026,11,3), time=time(18), location="Terraza Norte", capacity=80, status="Publicado", organizer_id=admin.id, image="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80", description="Encuentro curado para conectar patrocinadores, emprendedores y responsables de innovación corporativa."),
        Event(title="Analítica para Gestión de Eventos", type="Seminario", date=date(2026,11,10), time=time(10,30), location="Laboratorio Data", capacity=55, status="Borrador", organizer_id=admin.id, image="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80", description="Seminario sobre indicadores, predicción de demanda y tableros de seguimiento para eventos institucionales."),
    ]
    db.add_all(events); db.flush()
    db.add_all([Reservation(id="RSV-1048", event_id=events[0].id, user_id=participant.id, state="Confirmada"), Reservation(id="RSV-1047", event_id=events[1].id, user_id=participant.id, state="Pendiente")])
    db.commit(); print("Datos sintéticos cargados")
else: print("La base ya contiene datos; no se modificó")
db.close()
