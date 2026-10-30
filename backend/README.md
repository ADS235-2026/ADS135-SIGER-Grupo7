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
- `TIMEZONE`: zona horaria de negocio para validar eventos futuros; por defecto `America/El_Salvador`.

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
- `POST /auth/change-password`: cambia la contraseña del usuario autenticado y devuelve un token nuevo.

Protegidos:

- `GET /auth/me`: usuario autenticado.
- `GET /events`: listado de eventos.
- `GET /events/:id`: detalle de evento.
- `POST /events`: crear evento, solo administrador u organizador.
- `GET /reservations`: reservaciones del usuario o todas segun rol.
- `POST /reservations`: crear reservacion.
- `POST /events/:eventId/waitlist`: entrar a la lista de espera si el evento está lleno.
- `GET /waitlist`: consultar la lista de espera visible para el usuario.
- `DELETE /waitlist/:id`: retirar una entrada propia de la lista de espera.
- `PATCH /reservations/:id/status`: actualizar estado, solo administrador u organizador.
- `POST /attendance/check-in`: registrar asistencia.
- `GET /attendance/:eventId`: asistencia por evento.
- `GET /users`: usuarios, solo administrador.
- `GET /reports/summary`: resumen estadistico.
- `GET /reports/export?format=CSV|EXCEL|PDF`: genera y persiste un reporte descargable según el ámbito del usuario.
- `GET /notifications`: notificaciones internas del usuario.
- `PATCH /notifications/:id/read`: marca una notificación como leída.
- `POST /notifications/process-pending`: intenta entregar por SMTP las notificaciones pendientes; requiere configuración SMTP y rol administrador.

## Persistencia

La API usa repositorios SQLAlchemy y MariaDB. Los datos sobreviven al reinicio. El JWT usa HS256 con expiración y las contraseñas usan scrypt con sal. El registro y el cambio de contraseña exigen al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial. En producción se debe definir `ENVIRONMENT=production` y un `JWT_SECRET` aleatorio de al menos 32 caracteres.

Las notificaciones se guardan aunque SMTP no esté configurado. En ese caso permanecen pendientes y la API devuelve un error explícito al intentar entregarlas; no se anuncian correos enviados.

Alembic crea las siete tablas del diseño y `lista_espera`: `usuarios`, `categorias`, `eventos`, `reservaciones`, `asistencias`, `notificaciones`, `reportes` y `lista_espera`. La migración `0002` transforma el esquema temporal anterior si encuentra sus tablas, sin reinicializar la base; `0003` agrega la lista de espera.

## Docker

Desde la raíz del repositorio:

```bash
docker compose up --build api
```

Health check:

```bash
curl -i http://localhost:4000/health
```
