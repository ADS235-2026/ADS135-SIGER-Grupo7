import { useState } from 'react';
import { EmptyState, Icon, Metric, PageHeader, Panel, ReservationRow } from '../components/common';
import { roleLabel } from '../utils/formatters';

export function Reservations({ reservations, cancelReservation, reserve, loading }) {
  return (
    <section className="page-stack">
      <PageHeader eyebrow="Participante" title="Mis Reservaciones" description="Consulta el estado de tus próximas asistencias y pases digitales." />
      <Panel title="Reservaciones recientes">
        <div className="table-list">
          {reservations.map((reservation) => (
            <div key={reservation.id}>
              <ReservationRow reservation={reservation} />
              <div className="button-pair table-actions">
                {reservation.state === 'Confirmada' && !reservation.checkedIn && <button className="ghost-button" disabled={loading} onClick={() => cancelReservation(reservation)} type="button">Cancelar</button>}
                {reservation.state === 'Cancelada' && <button className="primary-button" disabled={loading} onClick={() => reserve(reservation.eventDetail)} type="button">Reactivar</button>}
              </div>
            </div>
          ))}
        </div>
        {reservations.length === 0 && (
          <EmptyState
            iconName="confirmation_number"
            title="Sin reservaciones activas"
            description="Cuando reserves un evento, tu pase digital aparecerá en este módulo."
          />
        )}
      </Panel>
    </section>
  );
}

export function Attendance({ reservations, checkIn, loading }) {
  const [reservationId, setReservationId] = useState(reservations[0]?.id || '');
  const selectedReservation = reservations.find((reservation) => reservation.id === reservationId);

  return (
    <section className="attendance-layout">
      <PageHeader eyebrow="Control" title="Control de Asistencia" description="Registro rápido de ingreso, validación de QR y conteo en tiempo real." />
      <Panel title="Escáner de acceso" className="scanner-panel">
        <div className="scanner-box">
          <Icon name="qr_code_scanner" />
          <strong>{reservationId || 'RSV-0000'}</strong>
          <small>{selectedReservation ? selectedReservation.guest : 'Ingresa un código de reservación'}</small>
          <label className="scanner-input">
            Código de reservación
            <input value={reservationId} onChange={(event) => setReservationId(event.target.value.toUpperCase())} placeholder="RSV-1048" />
          </label>
          <button className="primary-button" disabled={loading || !selectedReservation || selectedReservation.checkedIn} onClick={() => checkIn(reservationId, selectedReservation?.eventId)} type="button">
            <Icon name="how_to_reg" />
            Registrar ingreso
          </button>
        </div>
      </Panel>
      <Panel title="Asistentes verificados">
        {reservations.map((reservation) => (
          <div className="person-row" key={reservation.id}>
            <span>{reservation.guest}</span>
            <strong className={reservation.checkedIn ? 'good' : 'warning'}>
              {reservation.checkedIn ? 'Ingresó' : 'Pendiente'}
            </strong>
            <button className="ghost-button" disabled={loading || reservation.checkedIn} onClick={() => checkIn(reservation.id, reservation.eventId)} type="button">
              Check-in
            </button>
          </div>
        ))}
      </Panel>
    </section>
  );
}

export function Users({ users, updateUser, loading }) {
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
              <button className="ghost-button" disabled={loading} onClick={() => updateUser(user.id, { state: user.state === 'Activo' ? 'Bloqueado' : 'Activo' })} type="button">
                {user.state === 'Activo' ? 'Bloquear' : 'Activar'}
              </button>
            </div>
          ))}
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

export function Notifications({ notifications, markRead }) {
  return (
    <section className="page-stack">
      <PageHeader eyebrow="Centro de actividad" title="Notificaciones" description="Consulta confirmaciones, cancelaciones y avisos de SIGER." />
      <Panel title="Mensajes recientes">
        <div className="table-list">
          {notifications.map((notification) => (
            <div className={`table-row ${notification.read ? '' : 'notification-unread'}`} key={notification.id}>
              <div><strong>{notification.type}</strong><small>{notification.message}</small></div>
              <span>{notification.sentAt ? 'Enviado' : 'Pendiente'}</span>
              {!notification.read && <button className="ghost-button" onClick={() => markRead(notification)} type="button">Marcar leída</button>}
            </div>
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
