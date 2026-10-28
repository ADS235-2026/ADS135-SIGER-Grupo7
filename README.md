# SIGER

Sistema Inteligente de Gestion de Eventos y Reservaciones. SIGER es una plataforma web para publicar eventos, reservar cupos, administrar usuarios, controlar asistencia y consultar reportes operativos.

## Modulos Principales

- Autenticacion con roles de administrador, organizador y participante.
- Catalogo de eventos con filtros, detalle y reservacion.
- Panel administrativo con metricas de ocupacion y actividad reciente.
- Modulo de organizador para seguimiento de eventos.
- Control de asistencia por codigo de reservacion.
- Gestion de usuarios y reportes estadisticos.

## Estructura del Proyecto

```text
SIGER/
  backend/             API FastAPI
  frontend/            Aplicacion React servida por Nginx en Docker
  docker-compose.yml   Entorno local con API y frontend
  render.yaml          Blueprint para desplegar en Render
  DEPLOY_RENDER.md     Guia corta de deploy
```

## Stack Tecnologico

- Frontend: React 19, Create React App, CSS modular por convencion de clases.
- Backend: FastAPI sobre Python, SQLAlchemy, Alembic y MariaDB.
- Deploy: Docker, Docker Compose y Render Blueprint.
- Persistencia: MariaDB mediante SQLAlchemy; el volumen `siger-db` conserva los datos al reiniciar.

## Ejecucion Local con Docker

Desde la raiz del proyecto:

```bash
docker compose up --build
```

Luego abre:

- Frontend: `http://localhost:8081`
- Backend health: `http://localhost:4000/health`

Para levantar servicios ya construidos:

```bash
docker compose up -d api web
```

Para detenerlos:

```bash
docker compose down
```

## Comandos con mise

Con [mise](https://mise.jdx.dev/) instalado, el flujo principal es:

```bash
mise dev
```

También están disponibles `mise test`, `mise migrate`, `mise seed`, `mise logs`, `mise up` y `mise down`.

## Usuarios de Prueba

| Rol | Correo | Contrasena |
| --- | --- | --- |
| Administrador | `admin@siger.edu` | `Admin123!` |
| Organizador | `organizador@siger.edu` | `Organizador123!` |
| Participante | `carlos@siger.edu` | `Carlos123!` |

## Variables de Entorno

Backend:

- `PORT`: puerto de escucha, por defecto `4000`.
- `JWT_SECRET`: secreto para firmar tokens.
- `FRONTEND_ORIGIN`: origen permitido por CORS. Acepta varios valores separados por coma.

Frontend:

- `REACT_APP_API_URL`: URL publica de la API.

El frontend resuelve la API en este orden: `window.__SIGER_CONFIG__.API_URL`, `REACT_APP_API_URL`, `http://localhost:4000`.

## Deploy en Render

El archivo `render.yaml` crea dos servicios Docker:

- `siger-api`: servicio web para `backend`.
- `siger-web`: servicio web para `frontend`.

Pasos:

1. Subir el repositorio a GitHub.
2. Crear un Blueprint en Render.
3. Seleccionar el repositorio.
4. Verificar las variables `FRONTEND_ORIGIN` y `REACT_APP_API_URL` con las URLs reales asignadas por Render.

Mas detalle en `DEPLOY_RENDER.md`.

## Desarrollo y pruebas

Desde `backend/`: `python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt`.
Aplicar migraciones con `alembic upgrade head`, cargar datos sintéticos con `python -m scripts.seed` y ejecutar pruebas con `pytest -q`.

El frontend conserva las rutas y nombres de campos del prototipo. Los eventos borrador se excluyen del catálogo del participante y los errores HTTP se muestran mediante el aviso existente. Notificaciones externas, exportaciones y comprobantes descargables no estaban implementados, por lo que no se simulan.
