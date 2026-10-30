export const TOKEN_KEY = 'siger_token';

export const navItems = [
  { id: 'notifications', label: 'Notificaciones', icon: 'notifications', roles: ['admin', 'organizer', 'participant'] },
  { id: 'security', label: 'Seguridad', icon: 'lock', roles: ['admin', 'organizer', 'participant'] },
  { id: 'dashboard', label: 'Panel de Control', icon: 'dashboard', roles: ['admin', 'organizer'] },
  { id: 'organizer', label: 'Organizador', icon: 'event_available', roles: ['admin', 'organizer'] },
  { id: 'events', label: 'Eventos', icon: 'calendar_month', roles: ['admin', 'organizer', 'participant'] },
  { id: 'reservations', label: 'Reservaciones', icon: 'book_online', roles: ['admin', 'organizer', 'participant'] },
  { id: 'attendance', label: 'Asistencia', icon: 'fact_check', roles: ['admin', 'organizer'] },
  { id: 'users', label: 'Usuarios', icon: 'group', roles: ['admin'] },
  { id: 'reports', label: 'Reportes', icon: 'analytics', roles: ['admin', 'organizer'] },
];

export const seedEvents = [
  {
    id: 1,
    title: 'Liderazgo en la Era Digital',
    type: 'Conferencia',
    date: '2026-10-24',
    time: '09:00',
    location: 'Auditorio Principal',
    capacity: 120,
    available: 12,
    status: 'Publicado',
    organizer: 'Andrea Ruiz',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    description: 'Una jornada para equipos ejecutivos sobre estrategia, cultura digital y toma de decisiones con datos.',
  },
  {
    id: 2,
    title: 'Design Thinking Avanzado',
    type: 'Taller',
    date: '2026-10-29',
    time: '14:00',
    location: 'Sala Boreal',
    capacity: 40,
    available: 5,
    status: 'Casi lleno',
    organizer: 'Andrea Ruiz',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
    description: 'Sesión práctica para mapear problemas, prototipar soluciones y validar experiencias centradas en usuarios.',
  },
  {
    id: 3,
    title: 'Networking para Innovadores',
    type: 'Networking',
    date: '2026-11-03',
    time: '18:00',
    location: 'Terraza Norte',
    capacity: 80,
    available: 28,
    status: 'Publicado',
    organizer: 'Admin SIGER',
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
    description: 'Encuentro curado para conectar patrocinadores, emprendedores y responsables de innovación corporativa.',
  },
];

export const seedReservations = [
  { id: 'RSV-1048', event: 'Liderazgo en la Era Digital', guest: 'Carlos Mendoza', state: 'Confirmada', date: '2026-10-24', checkedIn: false },
  { id: 'RSV-1047', event: 'Design Thinking Avanzado', guest: 'Carlos Mendoza', state: 'Pendiente', date: '2026-10-29', checkedIn: false },
];

export const seedUsers = [
  { name: 'Admin SIGER', role: 'admin', email: 'admin@siger.edu', state: 'Activo' },
  { name: 'Andrea Ruiz', role: 'organizer', email: 'organizador@siger.edu', state: 'Activo' },
  { name: 'Carlos Mendoza', role: 'participant', email: 'carlos@siger.edu', state: 'Activo' },
];

export const seedReport = {
  activeEvents: 3,
  reservations: 2,
  users: 3,
  confirmedReservations: 1,
  occupancyRate: 76,
  categories: { Conferencia: 1, Taller: 1, Networking: 1, Seminario: 1 },
};
