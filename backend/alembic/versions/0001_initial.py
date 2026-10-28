from alembic import op
from app.database import Base
from app import models  # noqa: F401 - registers all seven tables

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    Base.metadata.create_all(bind=op.get_bind())

def downgrade():
    for table in (models.Attendance, models.Reservation, models.Event, models.Category, models.Notification, models.Report, models.User):
        table.__table__.drop(op.get_bind(), checkfirst=True)
