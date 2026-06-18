# SIGER Backend

API de SIGER construida con NestJS. Expone autenticacion, eventos, reservaciones, asistencia, usuarios y reportes para el frontend React.

## Scripts

Desde `backend/`:

```bash
npm install
npm run start:dev
```

La API escucha en `http://localhost:4000` por defecto.

Comandos utiles:

```bash
npm run build
npm run start:prod
npm run test
npm run test:e2e
```

## Variables de Entorno

- `PORT`: puerto de la API. Por defecto `4000`.
- `JWT_SECRET`: secreto para firmar tokens. En desarrollo usa un valor interno por defecto.
- `FRONTEND_ORIGIN`: origen permitido por CORS. Puede recibir varios origenes separados por coma.

Ejemplo:

```bash
PORT=4000
JWT_SECRET=siger-local-secret
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

La API usa datos en memoria para el prototipo academico. Los usuarios, eventos y reservaciones creadas durante la ejecucion se pierden al reiniciar el proceso. Para una version productiva se recomienda agregar PostgreSQL y repositorios persistentes.

## Docker

Desde la raiz del repositorio:

```bash
docker compose up --build api
```

Health check:

```bash
curl -i http://localhost:4000/health
```
