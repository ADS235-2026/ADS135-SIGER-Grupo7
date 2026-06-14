# Deploy de SIGER en Render

Esta configuración despliega dos servicios Docker:

- `siger-api`: API Nest en `backend`, escucha el `PORT` que Render inyecta.
- `siger-web`: frontend React servido por Nginx en `frontend`.

## Deploy con Blueprint

1. Sube el proyecto a GitHub.
2. En Render, elige **New +** y luego **Blueprint**.
3. Selecciona el repositorio.
4. Render leerá `render.yaml` y creará `siger-api` y `siger-web`.

Si Render asigna URLs distintas a las de `render.yaml`, actualiza estas variables:

- En `siger-api`: `FRONTEND_ORIGIN=https://URL-DE-TU-FRONTEND`
- En `siger-web`: `REACT_APP_API_URL=https://URL-DE-TU-BACKEND`

## Prueba local con Docker

```bash
docker compose up --build
```

Luego abre:

- Frontend: `http://localhost:8081`
- Backend health: `http://localhost:4000/health`

## Usuarios seed

- Admin: `admin@siger.edu` / `Admin123!`
- Organizador: `organizador@siger.edu` / `Organizador123!`
- Participante: `carlos@siger.edu` / `Carlos123!`

## Nota de persistencia

La API usa almacenamiento en memoria. En Render los datos se reinician cuando el servicio se reinicia. Para producción real, el siguiente paso es agregar PostgreSQL y persistir usuarios, eventos y reservaciones.
