from datetime import date, time, datetime
from pydantic import BaseModel, ConfigDict, Field, EmailStr, field_validator
from .security import validate_password

class AuthInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

class RegisterInput(AuthInput):
    name: str = Field(min_length=1, max_length=120)
    role: str | None = None

    @field_validator("password")
    @classmethod
    def password_policy(cls, value: str) -> str:
        return validate_password(value)

class ChangePasswordInput(BaseModel):
    currentPassword: str = Field(min_length=1, max_length=128)
    newPassword: str = Field(min_length=8, max_length=128)

    @field_validator("newPassword")
    @classmethod
    def new_password_policy(cls, value: str) -> str:
        return validate_password(value)

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

class EventRescheduleInput(BaseModel):
    date: date
    time: time

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
