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
from app.models import Category, Event, User
from app.security import hash_password

TEST_DB = Path(__file__).with_name("test.sqlite")
engine = create_engine(f"sqlite:///{TEST_DB}", connect_args={"check_same_thread": False})
Session = sessionmaker(bind=engine)

@pytest.fixture(autouse=True)
def database():
    Base.metadata.drop_all(engine); Base.metadata.create_all(engine)
    db = Session()
    admin = User(name="Admin", email="admin@test.com", role="administrador", state=True, password_hash=hash_password("Admin123!"))
    organizer = User(name="Owner", email="owner@test.com", role="organizador", state=True, password_hash=hash_password("Owner123!"))
    other = User(name="Other", email="other@test.com", role="organizador", state=True, password_hash=hash_password("Other123!"))
    participant = User(name="Guest", email="guest@test.com", role="participante", state=True, password_hash=hash_password("Guest123!"))
    participant2 = User(name="Guest Two", email="guest2@test.com", role="participante", state=True, password_hash=hash_password("Guest123!"))
    db.add_all([admin, organizer, other, participant, participant2]); db.flush()
    category = Category(name="Taller", description="Talleres")
    db.add(category); db.flush()
    db.add_all([Event(title="Public", date=date(2027,1,1), time=time(9), location="A", capacity=1, status="activo", organizer_id=organizer.id, category_id=category.id), Event(title="Draft", date=date(2027,1,2), time=time(9), location="B", capacity=1, status="borrador", organizer_id=other.id, category_id=category.id)])
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

def test_password_policy_and_change_password(client):
    weak = client.post("/auth/register", json={"name":"Weak", "email":"weak@test.com", "password":"password"})
    assert weak.status_code == 422
    headers = login(client)
    changed = client.post("/auth/change-password", headers=headers, json={"currentPassword":"Guest123!", "newPassword":"NewGuest456!"})
    assert changed.status_code == 200
    assert client.post("/auth/login", json={"email":"guest@test.com", "password":"Guest123!"}).status_code == 401
    assert client.post("/auth/login", json={"email":"guest@test.com", "password":"NewGuest456!"}).status_code == 200

def test_security_headers_are_present(client):
    response = client.get("/health")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"

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

def test_cancelled_reservation_cannot_check_in_or_appear_in_attendance(client):
    participant = login(client)
    reservation = client.post("/reservations", headers=participant, json={"eventId":1}).json()
    assert client.post(f"/reservations/{reservation['id']}/cancel", headers=participant).status_code == 200
    owner = login(client, "owner@test.com", "Owner123!")
    check_in = client.post("/attendance/check-in", headers=owner, json={"reservationId":reservation["id"]})
    assert check_in.status_code == 400
    attendance = client.get("/attendance/1", headers=owner)
    assert attendance.status_code == 200 and all(row["id"] != reservation["id"] for row in attendance.json())

def test_check_in_rejects_receipt_for_another_event(client):
    participant = login(client)
    reservation = client.post("/reservations", headers=participant, json={"eventId":1}).json()
    owner = login(client, "owner@test.com", "Owner123!")
    response = client.post("/attendance/check-in", headers=owner, json={"reservationId":reservation["id"], "eventId":999})
    assert response.status_code == 400

def test_concurrent_last_cup_allows_only_one(client):
    def reserve(email):
        return client.post("/reservations", headers=login(client, email, "Guest123!"), json={"eventId": 1}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(reserve, ["guest@test.com", "guest2@test.com"]))
    assert sorted(results) == [200, 409]

def test_waitlist_promotes_first_user_when_a_cup_is_released(client):
    first = login(client)
    second = login(client, "guest2@test.com", "Guest123!")
    reservation = client.post("/reservations", headers=first, json={"eventId":1}).json()
    joined = client.post("/events/1/waitlist", headers=second)
    assert joined.status_code == 200 and joined.json()["position"] == 1
    assert client.get("/waitlist", headers=second).json()[0]["id"] == joined.json()["id"]
    assert client.post(f"/reservations/{reservation['id']}/cancel", headers=first).status_code == 200
    reservations = client.get("/reservations", headers=second).json()
    assert len(reservations) == 1 and reservations[0]["state"] == "Confirmada"
    assert client.get("/waitlist", headers=second).json() == []

def test_notifications_are_persisted_and_export_is_real(client):
    participant = login(client)
    reservation = client.post("/reservations", headers=participant, json={"eventId": 1}).json()
    notifications = client.get("/notifications", headers=participant)
    assert notifications.status_code == 200 and notifications.json()[0]["type"] == "confirmacion"
    assert client.patch(f"/notifications/{notifications.json()[0]['id']}/read", headers=participant).json()["read"] is True
    organizer = login(client, "owner@test.com", "Owner123!")
    export = client.get("/reports/export?format=CSV", headers=organizer)
    assert export.status_code == 200 and "evento,categoria" in export.text
    assert export.headers["content-disposition"].endswith('reporte-siger.csv"')
    for format_name, media_type in [("EXCEL", "spreadsheetml"), ("PDF", "application/pdf")]:
        response = client.get(f"/reports/export?format={format_name}", headers=organizer)
        assert response.status_code == 200 and media_type in response.headers["content-type"] and len(response.content) > 100

def test_event_rules_reject_past_and_protect_capacity(client):
    owner = login(client, "owner@test.com", "Owner123!")
    past = client.post("/events", headers=owner, json={"title":"Past", "type":"Taller", "date":"2020-01-01", "time":"09:00", "location":"A", "capacity":2, "status":"Publicado"})
    assert past.status_code == 400
    created = client.post("/events", headers=owner, json={"title":"Capacity test", "type":"Taller", "date":"2027-01-01", "time":"09:00", "location":"A", "capacity":2, "status":"Publicado"}).json()
    participant = login(client)
    assert client.post("/reservations", headers=participant, json={"eventId":created["id"]}).status_code == 200
    second = login(client, "guest2@test.com", "Guest123!")
    assert client.post("/reservations", headers=second, json={"eventId":created["id"]}).status_code == 200
    reduced = client.patch(f"/events/{created['id']}", headers=owner, json={"title":"Capacity test", "type":"Taller", "date":"2027-01-01", "time":"09:00", "location":"A", "capacity":1, "status":"Publicado"})
    assert reduced.status_code == 400

def test_event_can_be_rescheduled_and_cancelled_explicitly(client):
    owner = login(client, "owner@test.com", "Owner123!")
    moved = client.post("/events/1/reschedule", headers=owner, json={"date":"2027-02-01", "time":"11:30"})
    assert moved.status_code == 200 and moved.json()["status"] == "Reprogramado"
    canceled = client.post("/events/1/cancel", headers=owner)
    assert canceled.status_code == 200 and canceled.json()["status"] == "Cancelado"
    assert client.get("/events/1", headers=login(client)).status_code == 404
