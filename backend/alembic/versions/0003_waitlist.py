from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "0003_waitlist"
down_revision = "0002_relational_design"
branch_labels = None
depends_on = None

def upgrade():
    if "lista_espera" in inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        "lista_espera",
        sa.Column("id_lista_espera", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("id_evento", sa.Integer(), nullable=False),
        sa.Column("id_usuario", sa.Integer(), nullable=False),
        sa.Column("fecha_registro", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["id_evento"], ["eventos.id_evento"]),
        sa.ForeignKeyConstraint(["id_usuario"], ["usuarios.id_usuario"]),
        sa.PrimaryKeyConstraint("id_lista_espera"),
        sa.UniqueConstraint("id_usuario", "id_evento", name="uq_waitlist_user_event"),
    )
    op.create_index("ix_waitlist_event_created", "lista_espera", ["id_evento", "fecha_registro"])

def downgrade():
    op.drop_index("ix_waitlist_event_created", table_name="lista_espera")
    op.drop_table("lista_espera")
