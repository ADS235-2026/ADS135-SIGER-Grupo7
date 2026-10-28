from datetime import date, time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.main import app
from app.dependencies import current_user
from app.database import get_db
from app.models import Event, User
from app.security import hash_password

TEST_DB = Path(__file__).with_name("test.sqlite")
engine = create_engine(f"sqlite:///{TEST_DB}", connect_args={"check_same_thread": False})
Session = sessionmaker(bind=engine)

@pytest.fixture(autouse=True)
def database():
    Base.metadata.drop_all(engine); Base.metadata.create_all(engine)
    db = Session()
    admin = User(name="Admin", email="admin@test.com", role="admin", state="Activo", password_hash=hash_password("Admin123!"))
    organizer = User(name="Owner", email="owner@test.com", role="organizer", state="Activo", password_hash=hash_password("Owner123!"))
    other = User(name="Other", email="other@test.com", role="organizer", state="Activo", password_hash=hash_password("Other123!"))
    participant = User(name="Guest", email="guest@test.com", role="participant", state="Activo", password_hash=hash_password("Guest123!"))
    participant2 = User(name="Guest Two", email="guest2@test.com", role="participant", state="Activo", password_hash=hash_password("Guest123!"))
    db.add_all([admin, organizer, other, participant, participant2]); db.flush()
    db.add_all([Event(title="Public", type="Taller", date=date(2027,1,1), time=time(9), location="A", capacity=1, status="Publicado", organizer_id=organizer.id), Event(title="Draft", type="Taller", date=date(2027,1,2), time=time(9), location="B", capacity=1, status="Borrador", organizer_id=other.id)])
    db.commit(); db.close()
    def override():
        session = Session()
        try: yield session
        finally: session.close()
    app.dependency_overrides[get_db] = override
    yield
    app.dependency_overrides.clear()

@pytest.fixture
def client(): return TestClient(app)

def login(client, email="guest@test.com", password="Guest123!"):
    response = client.post("/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {response.json()['token']}"}

def test_public_registration_cannot_elevate_role(client):
    response = client.post("/auth/register", json={"name":"X", "email":"x@test.com", "password":"Password123!", "role":"admin"})
    assert response.status_code == 400
    ok = client.post("/auth/register", json={"name":"X", "email":"x@test.com", "password":"Password123!"})
    assert ok.status_code == 200 and ok.json()["user"]["role"] == "participant"

def test_jwt_auth_and_draft_isolation(client):
    headers = login(client)
    events = client.get("/events", headers=headers)
    assert events.status_code == 200 and len(events.json()) == 1
    assert client.get("/events/2", headers=headers).status_code == 404
    owner_events = client.get("/events", headers=login(client, "owner@test.com", "Owner123!"))
    assert [e["title"] for e in owner_events.json()] == ["Public"]

def test_duplicate_reservation_and_cancel_keeps_record(client):
    headers = login(client)
    first = client.post("/reservations", headers=headers, json={"eventId": 1, "receipt":"R-1"})
    assert first.status_code == 200
    assert client.post("/reservations", headers=headers, json={"eventId": 1, "receipt":"R-2"}).status_code == 409
    reservation_id = first.json()["id"]
    owner_headers = login(client, "owner@test.com", "Owner123!")
    assert client.post(f"/reservations/{reservation_id}/cancel", headers=owner_headers).status_code == 200
    assert client.post("/reservations", headers=headers, json={"eventId": 1, "receipt":"R-2"}).status_code == 200

def test_organizer_cannot_read_other_organizer_reservations(client):
    response = client.get("/reservations", headers=login(client, "other@test.com", "Other123!"))
    assert response.status_code == 200 and response.json() == []

def test_attendance_is_once_and_cancel_is_blocked(client):
    participant = login(client)
    reservation = client.post("/reservations", headers=participant, json={"eventId":1}).json()
    owner = login(client, "owner@test.com", "Owner123!")
    assert client.post("/attendance/check-in", headers=owner, json={"reservationId":reservation["id"]}).status_code == 200
    assert client.post("/attendance/check-in", headers=owner, json={"reservationId":reservation["id"]}).status_code == 409
    assert client.post(f"/reservations/{reservation['id']}/cancel", headers=owner).status_code == 409

def test_concurrent_last_cup_allows_only_one(client):
    def reserve(email):
        return client.post("/reservations", headers=login(client, email, "Guest123!"), json={"eventId": 1}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(reserve, ["guest@test.com", "guest2@test.com"]))
    assert sorted(results) == [200, 409]
