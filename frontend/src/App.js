import { useEffect, useMemo, useState } from 'react';
import './App.css';

const runtimeConfig = window.__SIGER_CONFIG__ || {};
const API_BASE = runtimeConfig.API_URL || process.env.REACT_APP_API_URL || 'http://localhost:4000';
const TOKEN_KEY = 'siger_token';

const icon = (name) => <span className="material-symbols-outlined">{name}</span>;

const navItems = [
  { id: 'dashboard', label: 'Panel de Control', icon: 'dashboard', roles: ['admin', 'organizer'] },
  { id: 'organizer', label: 'Organizador', icon: 'event_available', roles: ['admin', 'organizer'] },
  { id: 'events', label: 'Eventos', icon: 'calendar_month', roles: ['admin', 'organizer', 'participant'] },
  { id: 'reservations', label: 'Reservaciones', icon: 'book_online', roles: ['admin', 'organizer', 'participant'] },
  { id: 'attendance', label: 'Asistencia', icon: 'fact_check', roles: ['admin', 'organizer'] },
  { id: 'users', label: 'Usuarios', icon: 'group', roles: ['admin'] },
  { id: 'reports', label: 'Reportes', icon: 'analytics', roles: ['admin', 'organizer'] },
];

const seedEvents = [
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
    image:
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    description:
      'Una jornada para equipos ejecutivos sobre estrategia, cultura digital y toma de decisiones con datos.',
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
    image:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
    description:
      'Sesión práctica para mapear problemas, prototipar soluciones y validar experiencias centradas en usuarios.',
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
    image:
      'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
    description:
      'Encuentro curado para conectar patrocinadores, emprendedores y responsables de innovación corporativa.',
  },
];

const seedReservations = [
  { id: 'RSV-1048', event: 'Liderazgo en la Era Digital', guest: 'Carlos Mendoza', state: 'Confirmada', date: '2026-10-24', checkedIn: false },
  { id: 'RSV-1047', event: 'Design Thinking Avanzado', guest: 'Carlos Mendoza', state: 'Pendiente', date: '2026-10-29', checkedIn: false },
];

const seedUsers = [
  { name: 'Admin SIGER', role: 'admin', email: 'admin@siger.edu', state: 'Activo' },
  { name: 'Andrea Ruiz', role: 'organizer', email: 'organizador@siger.edu', state: 'Activo' },
  { name: 'Carlos Mendoza', role: 'participant', email: 'carlos@siger.edu', state: 'Activo' },
];

const seedReport = {
  activeEvents: 3,
  reservations: 2,
  users: 3,
  confirmedReservations: 1,
  occupancyRate: 76,
  categories: { Conferencia: 1, Taller: 1, Networking: 1, Seminario: 1 },
};

function App() {
  const [view, setView] = useState('login');
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [currentUser, setCurrentUser] = useState(null);
  const [events, setEvents] = useState(seedEvents);
  const [reservations, setReservations] = useState(seedReservations);
  const [users, setUsers] = useState(seedUsers);
  const [report, setReport] = useState(seedReport);
  const [selectedEvent, setSelectedEvent] = useState(seedEvents[0]);
  const [category, setCategory] = useState('Todos');
  const [query, setQuery] = useState('');
  const [reservedEvent, setReservedEvent] = useState(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const api = async (path, options = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || 'No se pudo completar la operación');
    }

    return data;
  };

  const loadProtectedData = async () => {
    if (!token) {
      return;
    }

    try {
      const me = await api('/auth/me');
      setCurrentUser(me);
      setView((activeView) => (['login', 'register'].includes(activeView) ? 'dashboard' : activeView));

      const [eventsData, reservationsData] = await Promise.all([
        api('/events'),
        api('/reservations'),
      ]);
      setEvents(eventsData);
      setReservations(reservationsData);
      setSelectedEvent(eventsData[0] || seedEvents[0]);

      if (['admin', 'organizer'].includes(me.role)) {
        setReport(await api('/reports/summary'));
      }

      if (me.role === 'admin') {
        setUsers(await api('/users'));
      }
    } catch (error) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setCurrentUser(null);
      setView('login');
      setNotice(error.message);
    }
  };

  useEffect(() => {
    loadProtectedData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesCategory = category === 'Todos' || event.type === category;
      const matchesQuery = `${event.title} ${event.type} ${event.location}`
        .toLowerCase()
        .includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [category, events, query]);

  const openDetail = (event) => {
    setSelectedEvent(event);
    setView('detail');
  };

  const handleAuth = async (mode, payload) => {
    setLoading(true);
    setNotice('');

    try {
      const data = await api(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      setView('dashboard');
      setNotice(`Sesión iniciada como ${data.user.name}`);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setCurrentUser(null);
    setView('login');
    setNotice('');
  };

  const reserve = async (event) => {
    setLoading(true);
    setNotice('');

    try {
      const reservation = await api('/reservations', {
        method: 'POST',
        body: JSON.stringify({ eventId: event.id }),
      });
      setReservedEvent(reservation.eventDetail || event);
      setReservations((items) => [reservation, ...items]);
      setEvents(await api('/events'));
      setView('confirmation');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (payload) => {
    setLoading(true);
    setNotice('');

    try {
      const created = await api('/events', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setEvents((items) => [created, ...items]);
      setSelectedEvent(created);
      setView('detail');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkIn = async (reservationId) => {
    setLoading(true);
    setNotice('');

    try {
      const checked = await api('/attendance/check-in', {
        method: 'POST',
        body: JSON.stringify({ reservationId }),
      });
      setReservations((items) =>
        items.map((reservation) => (reservation.id === checked.id ? checked : reservation)),
      );
      setNotice(`${checked.guest} ingresó correctamente`);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const showShell = Boolean(currentUser) && !['login', 'register'].includes(view);
  const visibleNavItems = navItems.filter((item) => item.roles.includes(currentUser?.role || 'participant'));

  return (
    <div className="app-shell">
      {showShell && <Sidebar view={view} setView={setView} items={visibleNavItems} logout={logout} currentUser={currentUser} />}
      <div className={showShell ? 'workspace' : 'auth-workspace'}>
        {showShell && <Topbar query={query} setQuery={setQuery} setView={setView} currentUser={currentUser} />}
        {notice && <div className="notice" role="status">{notice}</div>}
        <main className={showShell ? 'content' : 'auth-content'}>
          {view === 'dashboard' && <AdminDashboard setView={setView} events={events} reservations={reservations} report={report} currentUser={currentUser} />}
          {view === 'organizer' && <OrganizerDashboard events={events} openDetail={openDetail} />}
          {view === 'events' && (
            <Catalog
              category={category}
              setCategory={setCategory}
              events={filteredEvents}
              openDetail={openDetail}
              reserve={reserve}
              loading={loading}
            />
          )}
          {view === 'detail' && <EventDetail event={selectedEvent} reserve={reserve} loading={loading} />}
          {view === 'reservations' && <Reservations reservations={reservations} />}
          {view === 'attendance' && <Attendance reservations={reservations} checkIn={checkIn} loading={loading} />}
          {view === 'users' && <Users users={users} />}
          {view === 'reports' && <Reports report={report} />}
          {view === 'create' && <CreateEvent createEvent={createEvent} loading={loading} />}
          {view === 'confirmation' && <Confirmation event={reservedEvent || selectedEvent} setView={setView} />}
          {view === 'login' && <AuthScreen mode="login" setView={setView} onSubmit={handleAuth} loading={loading} />}
          {view === 'register' && <AuthScreen mode="register" setView={setView} onSubmit={handleAuth} loading={loading} />}
        </main>
      </div>
    </div>
  );
}

function Sidebar({ view, setView, items, logout, currentUser }) {
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => setView('dashboard')} type="button">
        <span className="brand-mark">{icon('shield_person')}</span>
        <span>
          <strong>SIGER</strong>
          <small>Gestión Inteligente</small>
        </span>
      </button>
      <nav className="nav-list" aria-label="Navegación principal">
        {items.map((item) => (
          <button
            className={`nav-item ${view === item.id ? 'active' : ''}`}
            key={item.id}
            onClick={() => setView(item.id)}
            type="button"
          >
            {icon(item.icon)}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        {currentUser?.role !== 'participant' && (
          <button className="primary-button full" onClick={() => setView('create')} type="button">
            {icon('add')}
            Crear evento
          </button>
        )}
        <button className="ghost-button full" onClick={logout} type="button">
          {icon('logout')}
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

function Topbar({ query, setQuery, setView, currentUser }) {
  return (
    <header className="topbar">
      <label className="search-field">
        {icon('search')}
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar eventos, usuarios o reservaciones..."
        />
      </label>
      <div className="topbar-actions">
        <button className="icon-button" type="button" aria-label="Notificaciones">
          {icon('notifications')}
          <span className="signal" />
        </button>
        <button className="icon-button" type="button" aria-label="Ayuda">
          {icon('help_outline')}
        </button>
        <button className="profile" onClick={() => setView('users')} type="button">
          <span>
            <strong>{currentUser?.name || 'SIGER'}</strong>
            <small>{roleLabel(currentUser?.role)}</small>
          </span>
          <img alt="Perfil de usuario" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80" />
        </button>
      </div>
    </header>
  );
}

function AdminDashboard({ setView, events, reservations, report, currentUser }) {
  const isParticipant = currentUser?.role === 'participant';
  return (
    <section className="page-stack">
      <PageHeader
        eyebrow={isParticipant ? 'Participante' : 'Panel Administrativo'}
        title={isParticipant ? 'Bienvenido a SIGER' : 'Panel de Control'}
        description={isParticipant ? 'Explora eventos, reserva tu cupo y revisa tus próximos accesos.' : 'Vista ejecutiva de actividad, ocupación y rendimiento de SIGER.'}
        action={<button className="primary-button" onClick={() => setView(isParticipant ? 'events' : 'create')} type="button">{icon(isParticipant ? 'calendar_month' : 'add')}{isParticipant ? 'Ver eventos' : 'Crear evento'}</button>}
      />
      <div className="metric-grid">
        <Metric iconName="event" label="Eventos activos" value={report.activeEvents} trend={`${report.occupancyRate}% ocupación`} />
        <Metric iconName="book_online" label="Reservaciones" value={report.reservations} trend={`${report.confirmedReservations} confirmadas`} />
        <Metric iconName="groups" label="Usuarios registrados" value={report.users} trend="Roles activos" />
        <Metric iconName="payments" label="Cupos ocupados" value={`${report.occupancyRate}%`} trend="Demanda global" />
      </div>
      <div className="dashboard-grid">
        <Panel title="Eventos con mayor demanda" className="span-7">
          {events.slice(0, 3).map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </Panel>
        <Panel title="Actividad reciente" className="span-5">
          {reservations.slice(0, 4).map((reservation) => (
            <ReservationRow key={reservation.id} reservation={reservation} />
          ))}
        </Panel>
      </div>
    </section>
  );
}

function OrganizerDashboard({ events, openDetail }) {
  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Organizador"
        title="Operación de Eventos"
        description="Seguimiento de logística, cupos, check-in y tareas pendientes por evento."
      />
      <div className="kanban-grid">
        {['Planificación', 'Inscripción', 'En vivo'].map((stage, index) => (
          <Panel title={stage} key={stage}>
            {events.slice(index, index + 2).map((event) => (
              <button className="mini-event" key={`${stage}-${event.id}`} onClick={() => openDetail(event)} type="button">
                <img alt="" src={event.image} />
                <span>
                  <strong>{event.title}</strong>
                  <small>{formatDate(event.date)} · {event.available} cupos</small>
                </span>
              </button>
            ))}
          </Panel>
        ))}
      </div>
    </section>
  );
}

function Catalog({ category, setCategory, events, openDetail, reserve, loading }) {
  const categories = ['Todos', 'Conferencia', 'Taller', 'Networking', 'Seminario'];
  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Catálogo"
        title="Catálogo de Eventos"
        description="Explora y reserva tu lugar en los próximos eventos corporativos."
      />
      <div className="chip-row">
        {categories.map((item) => (
          <button className={`chip ${category === item ? 'selected' : ''}`} key={item} onClick={() => setCategory(item)} type="button">
            {item}
          </button>
        ))}
      </div>
      <div className="event-grid">
        {events.map((event) => (
          <article className="event-card" key={event.id}>
            <button className="event-image" onClick={() => openDetail(event)} type="button">
              <img src={event.image} alt={event.title} />
              <span>{event.type}</span>
            </button>
            <div className="event-card-body">
              <h3>{event.title}</h3>
              <Meta iconName="calendar_today" text={`${formatDate(event.date)} · ${formatTime(event.time)}`} />
              <Meta iconName="location_on" text={event.location} />
              <Meta iconName="person_outline" text={`${event.available} lugares disponibles`} />
              <div className="button-pair">
                <button className="ghost-button" onClick={() => openDetail(event)} type="button">Detalle</button>
                <button className="primary-button" disabled={loading} onClick={() => reserve(event)} type="button">Reservar</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function EventDetail({ event, reserve, loading }) {
  return (
    <section className="detail-layout">
      <div className="detail-hero">
        <img src={event.image} alt={event.title} />
        <span className="status-pill">{event.status}</span>
      </div>
      <div className="detail-copy">
        <span className="eyebrow">{event.type}</span>
        <h1>{event.title}</h1>
        <p>{event.description}</p>
        <div className="detail-facts">
          <Meta iconName="calendar_today" text={`${formatDate(event.date)} · ${formatTime(event.time)}`} />
          <Meta iconName="location_on" text={event.location} />
          <Meta iconName="groups" text={`${event.capacity - event.available}/${event.capacity} registrados`} />
          <Meta iconName="person" text={`Organiza ${event.organizer}`} />
        </div>
        <button className="primary-button hero-action" disabled={loading} onClick={() => reserve(event)} type="button">
          {icon('bookmark_added')}
          Confirmar reservación
        </button>
      </div>
    </section>
  );
}

function Reservations({ reservations }) {
  return (
    <section className="page-stack">
      <PageHeader eyebrow="Participante" title="Mis Reservaciones" description="Consulta el estado de tus próximas asistencias y pases digitales." />
      <Panel title="Reservaciones recientes">
        <div className="table-list">
          {reservations.map((reservation) => (
            <ReservationRow key={reservation.id} reservation={reservation} />
          ))}
        </div>
      </Panel>
    </section>
  );
}

function Attendance({ reservations, checkIn, loading }) {
  return (
    <section className="attendance-layout">
      <PageHeader eyebrow="Control" title="Control de Asistencia" description="Registro rápido de ingreso, validación de QR y conteo en tiempo real." />
      <Panel title="Escáner de acceso" className="scanner-panel">
        <div className="scanner-box">
          {icon('qr_code_scanner')}
          <strong>{reservations[0]?.id || 'RSV-0000'}</strong>
          <small>Validación lista para el ingreso</small>
        </div>
      </Panel>
      <Panel title="Asistentes verificados">
        {reservations.map((reservation) => (
          <div className="person-row" key={reservation.id}>
            <span>{reservation.guest}</span>
            <strong className={reservation.checkedIn ? 'good' : 'warning'}>
              {reservation.checkedIn ? 'Ingresó' : 'Pendiente'}
            </strong>
            <button className="ghost-button" disabled={loading || reservation.checkedIn} onClick={() => checkIn(reservation.id)} type="button">
              Check-in
            </button>
          </div>
        ))}
      </Panel>
    </section>
  );
}

function Users({ users }) {
  return (
    <section className="page-stack">
      <PageHeader eyebrow="Administración" title="Gestión de Usuarios" description="Roles, estados y accesos para administradores, organizadores y participantes." />
      <Panel title="Usuarios del sistema">
        <div className="table-list">
          {users.map((user) => (
            <div className="table-row" key={user.email}>
              <div>
                <strong>{user.name}</strong>
                <small>{user.email}</small>
              </div>
              <span>{roleLabel(user.role)}</span>
              <em className={user.state === 'Activo' ? 'good' : 'danger'}>{user.state}</em>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function Reports({ report }) {
  const categories = Object.entries(report.categories || {});
  return (
    <section className="page-stack">
      <PageHeader eyebrow="Analítica" title="Reportes y Estadísticas" description="Indicadores de ocupación, demanda por categoría y conversión de reservas." />
      <div className="dashboard-grid">
        <Panel title="Ocupación mensual" className="span-7">
          <div className="bar-chart" aria-label="Gráfico de ocupación mensual">
            {[58, 72, 46, report.occupancyRate, 65, 91, 77].map((height, index) => (
              <span key={height + index} style={{ height: `${Math.max(height, 12)}%` }} />
            ))}
          </div>
        </Panel>
        <Panel title="Categorías principales" className="span-5">
          {categories.map(([label, count], index) => (
            <div className="progress-row" key={label}>
              <span>{label} · {count}</span>
              <div><i style={{ width: `${82 - index * 13}%` }} /></div>
            </div>
          ))}
        </Panel>
      </div>
    </section>
  );
}

function CreateEvent({ createEvent, loading }) {
  const [form, setForm] = useState({
    title: 'Foro de Innovación 2026',
    type: 'Conferencia',
    date: '2026-11-18',
    time: '09:00',
    description: 'Encuentro institucional para compartir tendencias, proyectos y resultados de innovación.',
    capacity: 150,
    location: 'Auditorio Principal',
    status: 'Publicado',
  });

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Organizador" title="Crear Evento" description="Configura información general, capacidad y publicación del evento." />
      <form className="form-panel" onSubmit={(event) => { event.preventDefault(); createEvent(form); }}>
        <label>Nombre del evento<input value={form.title} onChange={(event) => update('title', event.target.value)} /></label>
        <label>Categoría<select value={form.type} onChange={(event) => update('type', event.target.value)}><option>Conferencia</option><option>Taller</option><option>Networking</option><option>Seminario</option></select></label>
        <label>Fecha<input type="date" value={form.date} onChange={(event) => update('date', event.target.value)} /></label>
        <label>Hora<input type="time" value={form.time} onChange={(event) => update('time', event.target.value)} /></label>
        <label className="wide">Descripción<textarea value={form.description} onChange={(event) => update('description', event.target.value)} /></label>
        <label>Capacidad<input type="number" value={form.capacity} onChange={(event) => update('capacity', Number(event.target.value))} /></label>
        <label>Ubicación<input value={form.location} onChange={(event) => update('location', event.target.value)} /></label>
        <button className="primary-button wide" disabled={loading} type="submit">{icon('publish')}Publicar evento</button>
      </form>
    </section>
  );
}

function Confirmation({ event, setView }) {
  return (
    <section className="confirmation">
      <div className="confirmation-card">
        <span className="success-mark">{icon('check')}</span>
        <span className="eyebrow">Reservación Confirmada</span>
        <h1>{event.title}</h1>
        <p>Tu pase digital fue generado correctamente. Presenta el código de reservación en el acceso del evento.</p>
        <div className="ticket-code">SIGER-{event.id}048</div>
        <button className="primary-button" onClick={() => setView('reservations')} type="button">Ver mis reservaciones</button>
      </div>
    </section>
  );
}

function AuthScreen({ mode, setView, onSubmit, loading }) {
  const isLogin = mode === 'login';
  const [form, setForm] = useState({
    name: '',
    email: isLogin ? 'admin@siger.edu' : '',
    password: isLogin ? 'Admin123!' : '',
    role: 'participant',
  });

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <section className="auth-screen">
      <div className="auth-brand">
        <span className="brand-mark">{icon('shield_person')}</span>
        <h1>SIGER</h1>
        <p>Plataforma de gestión de eventos, reservaciones y asistencia.</p>
      </div>
      <form className="auth-card" onSubmit={(event) => { event.preventDefault(); onSubmit(mode, form); }}>
        <span className="eyebrow">{isLogin ? 'Bienvenido' : 'Nuevo usuario'}</span>
        <h2>{isLogin ? 'Iniciar Sesión' : 'Registro de Usuario'}</h2>
        {!isLogin && <label>Nombre completo<input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="María López" /></label>}
        <label>Correo institucional<input value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="usuario@siger.edu" type="email" /></label>
        <label>Contraseña<input value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="••••••••" type="password" /></label>
        {!isLogin && <label>Rol<select value={form.role} onChange={(event) => update('role', event.target.value)}><option value="participant">Participante</option><option value="organizer">Organizador</option></select></label>}
        <button className="primary-button full" disabled={loading} type="submit">
          {isLogin ? 'Entrar' : 'Crear cuenta'}
        </button>
        <button className="text-button" onClick={() => setView(isLogin ? 'register' : 'login')} type="button">
          {isLogin ? 'Crear una cuenta' : 'Ya tengo una cuenta'}
        </button>
        {isLogin && <small className="auth-hint">Admin: admin@siger.edu / Admin123!</small>}
      </form>
    </section>
  );
}

function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function Metric({ iconName, label, value, trend }) {
  return (
    <article className="metric-card">
      <span>{icon(iconName)}</span>
      <small>{label}</small>
      <strong>{value}</strong>
      <em>{trend}</em>
    </article>
  );
}

function Panel({ title, className = '', children }) {
  return (
    <section className={`panel ${className}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function EventRow({ event }) {
  return (
    <div className="event-row">
      <img alt="" src={event.image} />
      <div>
        <strong>{event.title}</strong>
        <small>{formatDate(event.date)} · {event.location}</small>
      </div>
      <span>{event.available} cupos</span>
    </div>
  );
}

function ReservationRow({ reservation }) {
  return (
    <div className="table-row">
      <div>
        <strong>{reservation.event}</strong>
        <small>{reservation.id} · {reservation.guest}</small>
      </div>
      <span>{formatDate(reservation.date)}</span>
      <em className={reservation.state === 'Confirmada' ? 'good' : 'warning'}>{reservation.state}</em>
    </div>
  );
}

function Meta({ iconName, text }) {
  return (
    <div className="meta-line">
      {icon(iconName)}
      <span>{text}</span>
    </div>
  );
}

function formatDate(value) {
  if (!value) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-SV', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function formatTime(value) {
  if (!value) {
    return 'Sin hora';
  }

  const [hours, minutes] = value.split(':');
  return new Intl.DateTimeFormat('es-SV', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(2026, 0, 1, Number(hours), Number(minutes || 0)));
}

function roleLabel(role) {
  const labels = {
    admin: 'Administrador',
    organizer: 'Organizador',
    participant: 'Participante',
  };
  return labels[role] || 'Usuario';
}

export default App;
