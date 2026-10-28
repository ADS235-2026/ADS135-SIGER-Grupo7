from datetime import date, time, datetime
from pydantic import BaseModel, ConfigDict, Field, EmailStr

class AuthInput(BaseModel):
    email: EmailStr
    password: str

class RegisterInput(AuthInput):
    name: str = Field(min_length=1, max_length=120)
    role: str | None = None

class PublicUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; name: str; email: str; role: str; state: str

class UserAdminUpdate(BaseModel):
    role: str | None = None
    state: str | None = None

class AuthResponse(BaseModel):
    token: str; user: PublicUser

class EventInput(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    type: str = Field(min_length=1, max_length=80)
    date: date
    time: time
    location: str = Field(min_length=1, max_length=180)
    capacity: int = Field(gt=0, le=100000)
    status: str = "Borrador"
    categoryId: int | None = None
    image: str = ""
    description: str = ""

class EventOut(BaseModel):
    id: int; title: str; type: str; date: date; time: time; location: str; capacity: int
    available: int; reserved: int; occupancyRate: int; status: str; organizerId: int; organizer: str
    image: str; description: str

class ReservationInput(BaseModel):
    eventId: int
    receipt: str | None = None

class ReservationStateInput(BaseModel):
    state: str

class ReservationOut(BaseModel):
    id: str; eventId: int; event: str; userId: int; guest: str; state: str; date: date
    checkedIn: bool; checkedInAt: datetime | None = None; eventDetail: EventOut
