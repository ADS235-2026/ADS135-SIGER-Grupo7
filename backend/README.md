# SIGER Backend

API de SIGER construida con FastAPI. Expone autenticación, eventos, reservaciones, asistencia, usuarios y reportes para el frontend React.

## Ejecución

Desde `backend/`:

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python -m scripts.seed
uvicorn app.main:app --reload --port 4000
```

La API escucha en `http://localhost:4000` por defecto.

Pruebas: `pytest -q`. La documentación interactiva está disponible en `/docs`.

## Variables de Entorno

- `PORT`: puerto de la API. Por defecto `4000`.
- `JWT_SECRET`: secreto requerido para firmar tokens.
- `FRONTEND_ORIGIN`: origen permitido por CORS. Puede recibir varios origenes separados por coma.

Ejemplo:

```bash
PORT=4000
JWT_SECRET=replace-with-a-long-random-secret
FRONTEND_ORIGIN=http://localhost:8081,http://localhost:3000
```

## Endpoints Principales

Publicos:

- `GET /` y `GET /health`: estado de la API.
- `POST /auth/login`: inicio de sesion.
- `POST /auth/register`: registro de usuario.

Protegidos:

- `GET /auth/me`: usuario autenticado.
- `GET /events`: listado de eventos.
- `GET /events/:id`: detalle de evento.
- `POST /events`: crear evento, solo administrador u organizador.
- `GET /reservations`: reservaciones del usuario o todas segun rol.
- `POST /reservations`: crear reservacion.
- `PATCH /reservations/:id/status`: actualizar estado, solo administrador u organizador.
- `POST /attendance/check-in`: registrar asistencia.
- `GET /attendance/:eventId`: asistencia por evento.
- `GET /users`: usuarios, solo administrador.
- `GET /reports/summary`: resumen estadistico.

## Usuarios Seed

| Rol | Correo | Contrasena |
| --- | --- | --- |
| Administrador | `admin@siger.edu` | `Admin123!` |
| Organizador | `organizador@siger.edu` | `Organizador123!` |
| Participante | `carlos@siger.edu` | `Carlos123!` |

## Persistencia

La API usa repositorios SQLAlchemy y MariaDB. Los datos sobreviven al reinicio. El JWT usa HS256 con expiración y las contraseñas usan scrypt con sal.

## Docker

Desde la raíz del repositorio:

```bash
docker compose up --build api
```

Health check:

```bash
curl -i http://localhost:4000/health
```
