import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { Sidebar, Topbar } from './components/layout';
import { Icon, LoadingState } from './components/common';
import { navItems, seedEvents, seedReport, seedReservations, seedUsers, TOKEN_KEY } from './data/seedData';
import { AuthScreen, Confirmation, TicketView } from './views/AuthViews';
import { AdminDashboard, OrganizerDashboard } from './views/DashboardViews';
import { Catalog, CreateEvent, EventDetail } from './views/EventViews';
import { Attendance, Notifications, Profile, Reports, Reservations, Security, Users, Waitlist } from './views/ManagementViews';

const runtimeConfig = window.__SIGER_CONFIG__ || {};
const API_BASE = runtimeConfig.API_URL || process.env.REACT_APP_API_URL || 'http://localhost:4000';

function App() {
  const [view, setActiveView] = useState(() => window.history.state?.sigerView || 'login');
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [booting, setBooting] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));
  const [currentUser, setCurrentUser] = useState(null);
  const [events, setEvents] = useState(seedEvents);
  const [reservations, setReservations] = useState(seedReservations);
  const [users, setUsers] = useState(seedUsers);
  const [report, setReport] = useState(seedReport);
  const [selectedEvent, setSelectedEvent] = useState(seedEvents[0]);
  const [category, setCategory] = useState('Todos');
  const [query, setQuery] = useState('');
  const [reservedReservation, setReservedReservation] = useState(null);
  const [ticketReservation, setTicketReservation] = useState(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [waitlist, setWaitlist] = useState([]);

  useEffect(() => {
    if (!window.history.state?.sigerView) {
      window.history.replaceState({ sigerView: view }, '', window.location.href);
    }
    const handlePopState = (event) => {
      setActiveView(event.state?.sigerView || (token ? 'dashboard' : 'login'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [token, view]);

  const setView = (nextView) => {
    if (nextView === view) return;
    window.history.pushState({ sigerView: nextView }, '', window.location.href);
    setActiveView(nextView);
  };

  const goBack = () => {
    if (window.history.state?.sigerView && window.history.length > 1) {
      window.history.back();
    } else {
      setView(currentUser ? 'dashboard' : 'login');
    }
  };

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

    if (response.status === 401 && token) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setCurrentUser(null);
      setView('login');
    }
    if (!response.ok) {
      const detail = Array.isArray(data.detail)
        ? data.detail.map((item) => item.msg).join('. ')
        : data.detail || data.message;
      const error = new Error(detail || 'No se pudo completar la operación');
      error.status = response.status;
      throw error;
    }

    return data;
  };

  const loadProtectedData = async () => {
    if (!token) {
      setBooting(false);
      return;
    }

    try {
      const me = await api('/auth/me');
      setCurrentUser(me);
      if (['login', 'register'].includes(view)) {
        setView('dashboard');
      }

      const [eventsData, reservationsData, notificationsData, waitlistData] = await Promise.all([
        api('/events'),
        api('/reservations'),
        api('/notifications'),
        api('/waitlist'),
      ]);
      setEvents(eventsData);
      setReservations(reservationsData);
      setNotifications(notificationsData);
      setWaitlist(waitlistData);
      setSelectedEvent(eventsData[0] || seedEvents[0]);

      if (['admin', 'organizer'].includes(me.role)) {
        setReport(await api('/reports/summary'));
      }

      if (me.role === 'admin') {
        setUsers(await api('/users'));
      }
    } catch (error) {
      if (error.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setCurrentUser(null);
        setView('login');
      }
      setNotice(error.message || 'No se pudo cargar la información');
    } finally {
      setBooting(false);
    }
  };

  useEffect(() => {
    setBooting(Boolean(token));
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

  const openTicket = (reservation) => {
    setTicketReservation(reservation);
    setView('ticket');
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
      setReservedReservation(reservation);
      setReservations((items) => [reservation, ...items.filter((item) => item.reservationId !== reservation.reservationId)]);
      setEvents(await api('/events'));
      setView('confirmation');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const joinWaitlist = async (event) => {
    setLoading(true);
    setNotice('');
    try {
      const entry = await api(`/events/${event.id}/waitlist`, { method: 'POST' });
      setNotice(`Te agregamos a la lista de espera en la posición ${entry.position}`);
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

  const checkIn = async (reservationId, eventId) => {
    setLoading(true);
    setNotice('');

    try {
      const checked = await api('/attendance/check-in', {
        method: 'POST',
        body: JSON.stringify({ reservationId, eventId }),
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

  const cancelReservation = async (reservation) => {
    setLoading(true);
    try {
      const updated = await api(`/reservations/${encodeURIComponent(reservation.id)}/cancel`, { method: 'POST' });
      setReservations((items) => items.map((item) => item.id === updated.id ? updated : item));
      setNotice('Reservación cancelada. El cupo fue liberado.');
    } catch (error) { setNotice(error.message); } finally { setLoading(false); }
  };

  const markNotificationRead = async (notification) => {
    try {
      const updated = await api(`/notifications/${notification.id}/read`, { method: 'PATCH' });
      setNotifications((items) => items.map((item) => item.id === updated.id ? updated : item));
    } catch (error) { setNotice(error.message); }
  };

  const downloadReport = async (format) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/reports/export?format=${format}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('No se pudo generar el reporte');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = `reporte-siger.${format === 'EXCEL' ? 'xlsx' : format.toLowerCase()}`; link.click(); URL.revokeObjectURL(url);
      setNotice(`Reporte ${format} generado correctamente`);
    } catch (error) { setNotice(error.message); } finally { setLoading(false); }
  };

  const updateUser = async (userId, payload) => {
    setLoading(true);
    try {
      const updated = await api(`/users/${userId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      setUsers((items) => items.map((item) => item.id === updated.id ? updated : item));
    } catch (error) { setNotice(error.message); } finally { setLoading(false); }
  };

  const changePassword = async (currentPassword, newPassword) => {
    setLoading(true);
    try {
      const data = await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      setNotice('Contraseña actualizada correctamente');
    } finally {
      setLoading(false);
    }
  };

  const leaveWaitlist = async (entry) => {
    setLoading(true);
    try {
      await api(`/waitlist/${entry.id}`, { method: 'DELETE' });
      setWaitlist((items) => items.filter((item) => item.id !== entry.id));
      setNotice('Saliste de la lista de espera');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateEvent = async (event) => {
    setLoading(true);
    try {
      const updated = await api(`/events/${event.id}`, { method: 'PATCH', body: JSON.stringify(event) });
      setEvents((items) => items.map((item) => item.id === updated.id ? updated : item));
      setSelectedEvent(updated); setView('detail'); setNotice('Evento actualizado correctamente');
    } catch (error) { setNotice(error.message); } finally { setLoading(false); }
  };

  const cancelEvent = async (event) => {
    if (!window.confirm(`¿Cancelar “${event.title}”?`)) return;
    setLoading(true);
    try {
      const updated = await api(`/events/${event.id}/cancel`, { method: 'POST' });
      setEvents((items) => items.map((item) => item.id === updated.id ? updated : item));
      setSelectedEvent(updated); setNotice('Evento cancelado correctamente');
    } catch (error) { setNotice(error.message); } finally { setLoading(false); }
  };

  const showShell = Boolean(currentUser) && !['login', 'register'].includes(view);
  const visibleNavItems = navItems.filter((item) => item.roles.includes(currentUser?.role || 'participant'));

  return (
    <div className="app-shell">
      {showShell && <Sidebar view={view} setView={setView} items={visibleNavItems} logout={logout} currentUser={currentUser} />}
      <div className={showShell ? 'workspace' : 'auth-workspace'}>
        {showShell && <Topbar query={query} setQuery={setQuery} setView={setView} currentUser={currentUser} unreadCount={notifications.filter((item) => !item.read).length} />}
        {notice && <div className="notice" role="status"><span>{notice}</span><button onClick={() => setNotice('')} type="button" aria-label="Cerrar aviso"><Icon name="close" /></button></div>}
        <main className={showShell ? 'content' : 'auth-content'}>
          {token && booting && !currentUser && <LoadingState />}
          {!booting && (
            <>
          {showShell && view !== 'dashboard' && <button className="back-button" onClick={goBack} type="button"><Icon name="arrow_back" />Atrás</button>}
          {view === 'dashboard' && <AdminDashboard setView={setView} events={events} reservations={reservations} report={report} currentUser={currentUser} />}
          {view === 'organizer' && <OrganizerDashboard events={events} openDetail={openDetail} />}
          {view === 'events' && (
            <Catalog
              category={category}
              setCategory={setCategory}
              events={filteredEvents}
              openDetail={openDetail}
              reserve={reserve}
              joinWaitlist={joinWaitlist}
              currentUser={currentUser}
              loading={loading}
            />
          )}
          {view === 'detail' && <EventDetail event={selectedEvent} reserve={reserve} joinWaitlist={joinWaitlist} loading={loading}
            canManage={['admin', 'organizer'].includes(currentUser?.role) && (currentUser?.role === 'admin' || selectedEvent.organizerId === currentUser.id)}
            editEvent={(event) => { setSelectedEvent(event); setView('edit'); }} cancelEvent={cancelEvent} />}
          {view === 'reservations' && <Reservations reservations={reservations} cancelReservation={cancelReservation} reserve={reserve} setView={setView} openTicket={openTicket} currentUser={currentUser} loading={loading} />}
          {view === 'attendance' && <Attendance reservations={reservations} checkIn={checkIn} loading={loading} />}
          {view === 'users' && <Users users={users} updateUser={updateUser} loading={loading} currentUser={currentUser} />}
          {view === 'reports' && <Reports report={report} downloadReport={downloadReport} loading={loading} />}
          {view === 'notifications' && <Notifications notifications={notifications} markRead={markNotificationRead} currentUser={currentUser} />}
          {view === 'security' && <Security changePassword={changePassword} loading={loading} />}
          {view === 'waitlist' && <Waitlist entries={waitlist} leaveWaitlist={leaveWaitlist} loading={loading} />}
          {view === 'profile' && <Profile currentUser={currentUser} setView={setView} />}
          {view === 'create' && <CreateEvent createEvent={createEvent} loading={loading} />}
          {view === 'edit' && <CreateEvent initialEvent={selectedEvent} createEvent={updateEvent} saveLabel="Guardar cambios" loading={loading} />}
          {view === 'confirmation' && <Confirmation event={reservedReservation?.eventDetail || selectedEvent} reservation={reservedReservation} setView={setView} />}
          {view === 'ticket' && <TicketView reservation={ticketReservation} />}
          {view === 'login' && <AuthScreen mode="login" setView={setView} onSubmit={handleAuth} loading={loading} />}
          {view === 'register' && <AuthScreen mode="register" setView={setView} onSubmit={handleAuth} loading={loading} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
