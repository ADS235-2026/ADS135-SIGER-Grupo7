from alembic import op
import sqlalchemy as sa
revision = "0001_initial"; down_revision = None; branch_labels = None; depends_on = None
def upgrade():
    op.create_table("users", sa.Column("id", sa.Integer, primary_key=True), sa.Column("name", sa.String(120), nullable=False), sa.Column("email", sa.String(255), nullable=False, unique=True), sa.Column("role", sa.String(20), nullable=False), sa.Column("state", sa.String(20), nullable=False), sa.Column("password_hash", sa.String(255), nullable=False))
    op.create_table("events", sa.Column("id", sa.Integer, primary_key=True), sa.Column("title", sa.String(180), nullable=False), sa.Column("type", sa.String(80), nullable=False), sa.Column("date", sa.Date, nullable=False), sa.Column("time", sa.Time, nullable=False), sa.Column("location", sa.String(180), nullable=False), sa.Column("capacity", sa.Integer, nullable=False), sa.Column("status", sa.String(20), nullable=False), sa.Column("organizer_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False), sa.Column("image", sa.String(500), nullable=False), sa.Column("description", sa.Text, nullable=False))
    op.create_table("reservations", sa.Column("id", sa.String(30), primary_key=True), sa.Column("event_id", sa.Integer, sa.ForeignKey("events.id"), nullable=False), sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False), sa.Column("state", sa.String(20), nullable=False), sa.Column("receipt", sa.String(120), unique=True), sa.Column("created_at", sa.DateTime, nullable=False), sa.Column("canceled_at", sa.DateTime))
    op.create_index("ix_reservation_event_user_state", "reservations", ["event_id", "user_id", "state"])
    op.create_table("attendance", sa.Column("id", sa.Integer, primary_key=True), sa.Column("reservation_id", sa.String(30), sa.ForeignKey("reservations.id"), nullable=False, unique=True), sa.Column("checked_in_at", sa.DateTime, nullable=False))
def downgrade():
    op.drop_table("attendance"); op.drop_index("ix_reservation_event_user_state", "reservations"); op.drop_table("reservations"); op.drop_table("events"); op.drop_table("users")
