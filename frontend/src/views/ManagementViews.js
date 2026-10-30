import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { EmptyState, Icon, Metric, PageHeader, Panel } from '../components/common';
import { formatDate, formatTime, roleLabel } from '../utils/formatters';

export function Reservations({ reservations, cancelReservation, reserve, setView, openTicket, currentUser, loading }) {
  const isParticipant = currentUser?.role === 'participant';
  const activeReservations = reservations.filter((reservation) => reservation.state !== 'Cancelada');

  return (
    <section className="page-stack">
      <PageHeader eyebrow={isParticipant ? 'Tu agenda' : 'Operación'} title={isParticipant ? 'Mis reservaciones' : 'Reservaciones recibidas'} description={isParticipant ? 'Consulta tus eventos, horarios y pases desde un solo lugar.' : 'Revisa las reservaciones de los eventos que administras y su estado de ingreso.'} />
      <div className="reservation-overview">
        <div><span>{isParticipant ? 'Próximos eventos' : 'Reservaciones activas'}</span><strong>{activeReservations.length}</strong></div>
        <div><span>Reservaciones canceladas</span><strong>{reservations.length - activeReservations.length}</strong></div>
        {isParticipant && <button className="ghost-button" onClick={() => setView('events')} type="button"><Icon name="calendar_month" />Explorar eventos</button>}
      </div>
      <Panel title={isParticipant ? 'Tus pases' : 'Reservaciones del equipo'}>
        <div className="reservation-list">
          {reservations.map((reservation) => (
            <article className={`reservation-card ${reservation.state === 'Cancelada' ? 'reservation-cancelled' : ''}`} key={reservation.id}>
              <div className="reservation-card-header"><div><span className="eyebrow">Evento</span><strong>{reservation.event}</strong></div><em className={reservation.state === 'Confirmada' ? 'good' : reservation.state === 'Cancelada' ? 'danger' : 'warning'}>{reservation.state}</em></div>
              <div className="reservation-card-details"><span><Icon name="calendar_today" /><b>{formatDate(reservation.date)}</b>{reservation.eventDetail?.time && ` · ${reservation.eventDetail.time.slice(0, 5)}`}</span><span><Icon name="location_on" />{reservation.eventDetail?.location || 'Ubicación pendiente'}</span></div>
              <div className="reservation-card-footer"><small>Comprobante: <strong>{reservation.id}</strong></small><small>{reservation.state === 'Confirmada' ? 'Pase listo para usar' : reservation.state === 'Cancelada' ? 'Cupo disponible nuevamente' : 'Pendiente de confirmación'}</small><div className="table-actions">
                {isParticipant && reservation.state === 'Confirmada' && <button className="text-button" onClick={() => openTicket(reservation)} type="button">Ver pase</button>}
                {reservation.state === 'Confirmada' && !reservation.checkedIn && <button className="ghost-button" disabled={loading} onClick={() => cancelReservation(reservation)} type="button">Cancelar</button>}
                {isParticipant && reservation.state === 'Cancelada' && <button className="primary-button" disabled={loading} onClick={() => reserve(reservation.eventDetail)} type="button">Reactivar</button>}
              </div></div>
            </article>
          ))}
        </div>
        {reservations.length === 0 && (
          <EmptyState
            iconName="confirmation_number"
            title="Todavía no tienes planes guardados"
            description="Cuando encuentres un evento que te guste, tu pase aparecerá aquí."
          />
        )}
      </Panel>
    </section>
  );
}

export function Attendance({ reservations, checkIn, loading }) {
  const attendeeReservations = reservations.filter((reservation) => reservation.state !== 'Cancelada');
  const [reservationId, setReservationId] = useState(attendeeReservations[0]?.id || '');
  const [eventFilter, setEventFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const scannerRef = useRef(null);
  const selectedReservation = reservations.find((reservation) => reservation.id === reservationId);
  const eventOptions = Array.from(new Map(attendeeReservations.map((reservation) => [reservation.eventId, reservation.event])).entries());
  const visibleReservations = attendeeReservations.filter((reservation) => {
    const matchesEvent = eventFilter === 'all' || String(reservation.eventId) === eventFilter;
    const matchesQuery = `${reservation.guest} ${reservation.id}`.toLowerCase().includes(query.toLowerCase());
    return matchesEvent && matchesQuery;
  });
  const checkedInCount = attendeeReservations.filter((reservation) => reservation.checkedIn).length;

  useEffect(() => {
    if (!cameraOpen) return undefined;
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;
    let active = true;
    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      (decodedText) => {
        if (!active) return;
        try {
          const payload = JSON.parse(decodedText);
          setReservationId(payload.reservationId || decodedText);
          if (payload.eventId) setEventFilter(String(payload.eventId));
          setScanMessage('QR leído. Confirma la llegada del asistente.');
        } catch {
          setReservationId(decodedText);
          setScanMessage('Código leído. Confirma la llegada del asistente.');
        }
        setCameraOpen(false);
      },
      () => {},
    ).catch(() => setScanMessage('No se pudo abrir la cámara. Puedes ingresar el comprobante manualmente.'));
    return () => {
      active = false;
      if (scannerRef.current?.isScanning) scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    };
  }, [cameraOpen]);

  return (
    <section className="attendance-layout">
      <PageHeader eyebrow="Operación" title="Registra la llegada" description="Valida cada pase y mantén el conteo de asistentes actualizado por evento." action={<button className="primary-button" onClick={() => { setScanMessage(''); setCameraOpen(true); }} type="button"><Icon name="photo_camera" />Abrir escáner QR</button>} />
      <div className="attendance-summary">
        <div><span>Asistentes</span><strong>{attendeeReservations.length}</strong></div>
        <div><span>Ya ingresaron</span><strong>{checkedInCount}</strong></div>
        <div><span>Pendientes</span><strong>{attendeeReservations.length - checkedInCount}</strong></div>
      </div>
      {cameraOpen && <div className="qr-modal-backdrop" role="presentation"><section className="qr-modal" role="dialog" aria-modal="true" aria-labelledby="qr-modal-title"><div className="qr-modal-header"><div><span className="eyebrow">Acceso</span><h2 id="qr-modal-title">Escanea el pase del participante</h2></div><button className="icon-button" onClick={() => setCameraOpen(false)} type="button" aria-label="Cerrar escáner"><Icon name="close" /></button></div><p>Centra el código QR dentro del recuadro. La validación se hará contra el evento seleccionado.</p><div id="qr-reader" className="qr-reader" aria-label="Lector de código QR" /><small className="scan-message">{scanMessage || 'Solicita permiso para usar la cámara si el navegador lo pide.'}</small><button className="ghost-button" onClick={() => setCameraOpen(false)} type="button">Usar entrada manual</button></section></div>}
      <Panel title="Validar un pase" className="scanner-panel">
        <div className="scanner-box">
          <span className="scanner-icon"><Icon name="confirmation_number" /></span>
          <span className="eyebrow">Validación manual</span>
          <strong>{selectedReservation?.id || 'Sin comprobante seleccionado'}</strong>
          <small>{selectedReservation ? `${selectedReservation.guest} · ${selectedReservation.event}` : 'Busca un comprobante para registrar la llegada'}</small>
          <label className="scanner-input">
            Código de reservación
            <input value={reservationId} onChange={(event) => setReservationId(event.target.value.toUpperCase())} placeholder="RSV-1048" aria-label="Código de reservación" />
          </label>
          {scanMessage && <small className="scan-message">{scanMessage}</small>}
          <small className="scanner-helper">También puedes escribir el comprobante manualmente si el participante no puede mostrar su QR.</small>
          <button className="primary-button full" disabled={loading || !selectedReservation || selectedReservation.checkedIn} onClick={() => checkIn(reservationId, selectedReservation?.eventId)} type="button">
            <Icon name="how_to_reg" />{selectedReservation?.checkedIn ? 'Ingreso registrado' : 'Confirmar llegada'}
          </button>
        </div>
      </Panel>
      <Panel title={`Asistentes${eventFilter === 'all' ? '' : ` · ${eventOptions.find(([id]) => String(id) === eventFilter)?.[1] || ''}`}`}>
        <div className="attendance-filters">
          <select value={eventFilter} onChange={(event) => setEventFilter(event.target.value)} aria-label="Filtrar por evento">
            <option value="all">Todos los eventos</option>
            {eventOptions.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
          </select>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nombre o comprobante" aria-label="Buscar asistente" />
        </div>
        <div className="attendance-list">
          {visibleReservations.map((reservation) => (
            <div className={`attendance-person ${reservation.checkedIn ? 'attendance-done' : ''} ${reservation.id === reservationId ? 'attendance-selected' : ''}`} key={reservation.id}>
              <div className="attendance-avatar">{reservation.guest.charAt(0).toUpperCase()}</div>
              <div className="attendance-person-main"><strong>{reservation.guest}</strong><small>{reservation.id} · {reservation.event}</small><span><Icon name="calendar_today" />{formatDate(reservation.date)} · {formatTime(reservation.eventDetail?.time)}</span></div>
              <em className={reservation.checkedIn ? 'good' : 'warning'}>{reservation.checkedIn ? 'Ingresó' : 'Pendiente'}</em>
              <div className="attendance-actions"><button className="text-button" disabled={loading} onClick={() => setReservationId(reservation.id)} type="button">{reservation.id === reservationId ? 'Seleccionado' : 'Seleccionar'}</button><button className="ghost-button" disabled={loading || reservation.checkedIn} onClick={() => checkIn(reservation.id, reservation.eventId)} type="button">{reservation.checkedIn ? 'Registrado' : 'Registrar llegada'}</button></div>
            </div>
          ))}
          {visibleReservations.length === 0 && <EmptyState iconName="person_search" title="No encontramos asistentes" description="Prueba con otro nombre, comprobante o evento." />}
        </div>
      </Panel>
    </section>
  );
}

export function Users({ users, updateUser, loading, currentUser }) {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const filteredUsers = users.filter((user) => {
    const matchesQuery = `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesState = stateFilter === 'all' || user.state === stateFilter;
    return matchesQuery && matchesRole && matchesState;
  });

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Administración" title="Personas y accesos" description="Consulta quién usa SIGER y controla el acceso de cada cuenta." />
      <div className="user-summary">
        <div><span>Total de cuentas</span><strong>{users.length}</strong></div>
        <div><span>Cuentas activas</span><strong>{users.filter((user) => user.state === 'Activo').length}</strong></div>
        <div><span>Organizadores</span><strong>{users.filter((user) => user.role === 'organizer').length}</strong></div>
      </div>
      <Panel title="Directorio de usuarios">
        <div className="user-filters">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o correo" aria-label="Buscar usuario" />
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filtrar por rol"><option value="all">Todos los roles</option><option value="admin">Administradores</option><option value="organizer">Organizadores</option><option value="participant">Participantes</option></select>
          <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)} aria-label="Filtrar por estado"><option value="all">Todos los estados</option><option value="Activo">Activos</option><option value="Bloqueado">Bloqueados</option></select>
        </div>
        <div className="user-list">
          {filteredUsers.map((user) => (
            <article className="user-card" key={user.email}>
              <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
              <div className="user-identity"><strong>{user.name}</strong><small>{user.email}</small><select className="user-role-select" aria-label={`Rol de ${user.name}`} disabled={user.id === currentUser?.id || loading} value={user.role} onChange={(event) => updateUser(user.id, { role: event.target.value })}><option value="admin">Administrador</option><option value="organizer">Organizador</option><option value="participant">Participante</option></select></div>
              <div className="user-state"><em className={user.state === 'Activo' ? 'good' : 'danger'}>{user.state}</em><small>{user.state === 'Activo' ? 'Puede ingresar' : 'Acceso detenido'}</small></div>
              <button className="ghost-button" disabled={loading} onClick={() => updateUser(user.id, { state: user.state === 'Activo' ? 'Bloqueado' : 'Activo' })} type="button">
                {user.state === 'Activo' ? 'Bloquear acceso' : 'Restaurar acceso'}
              </button>
            </article>
          ))}
          {filteredUsers.length === 0 && <EmptyState iconName="person_search" title="No encontramos usuarios" description="Prueba con otro nombre, rol o estado." />}
        </div>
      </Panel>
    </section>
  );
}

export function Reports({ report, downloadReport, loading }) {
  const categories = Object.entries(report.categories || {});
  const monthLabels = ['Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Analítica" title="Reportes y Estadísticas" description="Indicadores de ocupación, demanda por categoría y conversión de reservas."
        action={<div className="button-pair"><button className="ghost-button" disabled={loading} onClick={() => downloadReport('CSV')} type="button">CSV</button><button className="ghost-button" disabled={loading} onClick={() => downloadReport('EXCEL')} type="button">Excel</button><button className="primary-button" disabled={loading} onClick={() => downloadReport('PDF')} type="button">PDF</button></div>} />
      <div className="metric-grid">
        <Metric iconName="event" label="Eventos monitoreados" value={report.activeEvents} trend="Calendario vigente" />
        <Metric iconName="verified" label="Reservas confirmadas" value={report.confirmedReservations} trend={`${report.reservations} solicitudes`} />
        <Metric iconName="groups" label="Usuarios registrados" value={report.users} trend="Base activa" />
        <Metric iconName="monitoring" label="Ocupación global" value={`${report.occupancyRate}%`} trend="Promedio del sistema" />
      </div>
      <div className="dashboard-grid">
        <Panel title="Ocupación mensual" className="span-7">
          <div className="bar-chart" aria-label="Gráfico de ocupación mensual">
            {[58, 72, 46, report.occupancyRate, 65, 91, 77].map((height, index) => (
              <span key={height + index} style={{ height: `${Math.max(height, 12)}%` }}>
                <i>{height}%</i>
                <small>{monthLabels[index]}</small>
              </span>
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

export function Notifications({ notifications, markRead, currentUser }) {
  const isParticipant = currentUser?.role === 'participant';
  const notificationTypes = {
    confirmacion: { label: 'Reserva confirmada', icon: 'check_circle' },
    cambio: { label: 'Cambio en un evento', icon: 'edit_calendar' },
    cancelacion: { label: 'Reserva cancelada', icon: 'event_busy' },
    recordatorio: { label: 'Recordatorio', icon: 'notifications_active' },
  };
  return (
    <section className="page-stack">
      <PageHeader eyebrow={isParticipant ? 'Tu actividad' : 'Centro de actividad'} title={isParticipant ? 'Tus notificaciones' : 'Actividad de SIGER'} description={isParticipant ? 'Aquí encontrarás confirmaciones, cambios y avisos sobre tus eventos.' : 'Consulta los cambios y avisos relacionados con tus eventos y reservaciones.'} />
      <Panel title={isParticipant ? 'Avisos para ti' : 'Avisos recientes'}>
        <div className="notification-list">
          {notifications.map((notification) => (
            <article className={`notification-card ${notification.read ? '' : 'notification-unread'}`} key={notification.id}>
              <div className="notification-icon"><Icon name={notificationTypes[notification.type]?.icon || 'notifications'} /></div>
              <div className="notification-copy"><strong>{notificationTypes[notification.type]?.label || 'Aviso de SIGER'}</strong><p>{notification.message}</p><small>{notification.sentAt ? 'Enviado' : 'Pendiente de envío'}</small></div>
              {!notification.read ? <button className="text-button" onClick={() => markRead(notification)} type="button">Marcar como leída</button> : <span className="notification-read">Leída</span>}
            </article>
          ))}
        </div>
        {notifications.length === 0 && <EmptyState iconName="notifications_off" title="Sin notificaciones" description="Aquí aparecerán las actualizaciones de tus reservas y eventos." />}
      </Panel>
    </section>
  );
}

export function Security({ changePassword, loading }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmation: '' });
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.newPassword !== form.confirmation) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }
    try {
      await changePassword(form.currentPassword, form.newPassword);
      setForm({ currentPassword: '', newPassword: '', confirmation: '' });
    } catch (changeError) {
      setError(changeError.message);
    }
  };

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Cuenta" title="Seguridad" description="Actualiza tu contraseña y protege el acceso a tu cuenta." />
      <Panel title="Cambiar contraseña">
        <form className="auth-card security-form" onSubmit={submit}>
          <label>Contraseña actual<input required value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} type="password" autoComplete="current-password" /></label>
          <label>Nueva contraseña<input required minLength="8" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} type="password" autoComplete="new-password" /></label>
          <small className="auth-hint">Usa al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.</small>
          <label>Confirmar nueva contraseña<input required minLength="8" value={form.confirmation} onChange={(event) => setForm({ ...form, confirmation: event.target.value })} type="password" autoComplete="new-password" /></label>
          {error && <p className="danger">{error}</p>}
          <button className="primary-button" disabled={loading} type="submit">Actualizar contraseña</button>
        </form>
      </Panel>
    </section>
  );
}

export function Waitlist({ entries, leaveWaitlist, loading }) {
  return (
    <section className="page-stack">
      <PageHeader eyebrow="Tus planes" title="Lista de espera" description="Revisa los eventos que te interesan y tu lugar en cada fila." />
      <Panel title="Eventos que estás siguiendo">
        {entries.length > 0 ? <div className="waitlist-list">{entries.map((entry) => (
          <article className="waitlist-card" key={entry.id}>
            <div className="waitlist-position"><strong>{entry.position}</strong><span>en fila</span></div>
            <div><strong>{entry.event}</strong><small>Te avisaremos si se libera un lugar.</small></div>
            <button className="ghost-button" disabled={loading} onClick={() => leaveWaitlist(entry)} type="button">Salir de la lista</button>
          </article>
        ))}</div> : <EmptyState iconName="hourglass_empty" title="No estás esperando ningún evento" description="Cuando un evento esté lleno, puedes pedir que te avisemos si se libera un lugar." />}
      </Panel>
    </section>
  );
}

export function Profile({ currentUser, setView }) {
  const initial = currentUser?.name?.charAt(0).toUpperCase() || 'U';
  return (
    <section className="page-stack">
      <PageHeader eyebrow="Tu cuenta" title="Mi perfil" description="Aquí puedes consultar la información con la que participas en SIGER." />
      <div className="profile-card">
        <div className="profile-avatar">{initial}</div>
        <div className="profile-details"><span className="eyebrow">Cuenta activa</span><h2>{currentUser?.name}</h2><p>{currentUser?.email}</p><strong>{roleLabel(currentUser?.role)}</strong></div>
        <button className="ghost-button" onClick={() => setView('security')} type="button"><Icon name="lock" />Cambiar contraseña</button>
      </div>
    </section>
  );
}
