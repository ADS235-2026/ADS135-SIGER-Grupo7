import { Icon, Metric, PageHeader, Panel, EventRow, ReservationRow } from '../components/common';
import { formatDate } from '../utils/formatters';

export function AdminDashboard({ setView, events, reservations, report, currentUser }) {
  const isParticipant = currentUser?.role === 'participant';

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow={isParticipant ? 'Participante' : 'Panel Administrativo'}
        title={isParticipant ? 'Bienvenido a SIGER' : 'Panel de Control'}
        description={isParticipant ? 'Explora eventos, reserva tu cupo y revisa tus próximos accesos.' : 'Vista ejecutiva de actividad, ocupación y rendimiento de SIGER.'}
        action={<button className="primary-button" onClick={() => setView(isParticipant ? 'events' : 'create')} type="button"><Icon name={isParticipant ? 'calendar_month' : 'add'} />{isParticipant ? 'Ver eventos' : 'Crear evento'}</button>}
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

export function OrganizerDashboard({ events, openDetail }) {
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
