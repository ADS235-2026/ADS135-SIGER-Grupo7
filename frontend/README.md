# SIGER Frontend

Aplicacion web de SIGER construida con React. El frontend presenta las pantallas de autenticacion, panel administrativo, catalogo de eventos, reservaciones, asistencia, usuarios y reportes.

## Estructura

```text
src/
  App.js                    Coordinacion de estado, API y vistas
  App.css                   Estilos globales de la interfaz
  components/
    common.js               Componentes reutilizables
    layout.js               Sidebar y topbar
  data/
    seedData.js             Datos iniciales y navegacion
  utils/
    formatters.js           Formato de fechas, horas, roles y ocupacion
  views/
    AuthViews.js            Login, registro y confirmacion
    DashboardViews.js       Panel administrativo y organizador
    EventViews.js           Catalogo, detalle y creacion de eventos
    ManagementViews.js      Reservaciones, asistencia, usuarios y reportes
```

## Scripts

Desde `frontend/`:

```bash
npm install
npm start
```

La aplicacion de desarrollo abre en `http://localhost:3000`.

Para compilar:

```bash
npm run build
```

Para pruebas:

```bash
npm test
```

## Configuracion de API

El frontend toma la URL de la API en este orden:

1. `window.__SIGER_CONFIG__.API_URL`
2. `process.env.REACT_APP_API_URL`
3. `http://localhost:4000`

En Docker, Nginx genera `env.js` a partir de `public/env.template.js`, usando `REACT_APP_API_URL`.

## Docker

Desde la raiz del repositorio:

```bash
docker compose up --build web
```

El frontend queda disponible en `http://localhost:8081`.

## Pantallas

- Login y registro de usuario.
- Panel de control con metricas y actividad.
- Vista de organizador por etapas.
- Catalogo con filtros y medidor de ocupacion.
- Detalle de evento y confirmacion de reservacion.
- Mis reservaciones.
- Control de asistencia por codigo.
- Gestion de usuarios.
- Reportes y estadisticas.
