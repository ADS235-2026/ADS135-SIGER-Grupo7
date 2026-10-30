import { EmptyState, Icon, Metric, PageHeader, Panel, EventRow, ReservationRow } from '../components/common';
import { formatDate } from '../utils/formatters';

export function AdminDashboard({ setView, events, reservations, report, currentUser }) {
  const isParticipant = currentUser?.role === 'participant';
  const isOrganizer = currentUser?.role === 'organizer';
  const firstName = currentUser?.name?.split(' ')[0] || 'aquí';
  const upcomingReservations = reservations
    .filter((reservation) => reservation.state !== 'Cancelada')
    .slice(0, 3);

  if (isParticipant) {
    return (
      <section className="page-stack">
        <div className="welcome-card">
          <div>
            <span className="eyebrow">Tu espacio en SIGER</span>
            <h1>Hola, {firstName}</h1>
            <p>Encuentra algo que te inspire, guarda tu lugar y llega listo para disfrutarlo.</p>
            <button className="primary-button" onClick={() => setView('events')} type="button"><Icon name="explore" />Explorar eventos</button>
          </div>
          <div className="welcome-art" aria-hidden="true"><Icon name="event_available" /></div>
        </div>
        <div className="metric-grid participant-metrics">
          <Metric iconName="event_available" label="Próximos eventos" value={upcomingReservations.length} trend="En tu agenda" />
          <Metric iconName="confirmation_number" label="Pases confirmados" value={reservations.filter((item) => item.state === 'Confirmada').length} trend="Listos para usar" />
          <Metric iconName="travel_explore" label="Eventos disponibles" value={events.length} trend="Para descubrir" />
        </div>
        <div className="dashboard-grid">
          <Panel title="Tu próxima agenda" className="span-7">
            {upcomingReservations.length > 0 ? upcomingReservations.map((reservation) => <ReservationRow key={reservation.id} reservation={reservation} />) : (
              <div className="human-empty"><Icon name="calendar_add_on" /><strong>Tu agenda está esperando algo especial</strong><p>Explora el catálogo y encuentra tu próximo evento.</p><button className="ghost-button" onClick={() => setView('events')} type="button">Ver eventos</button></div>
            )}
          </Panel>
          <Panel title="Una idea para hoy" className="span-5 inspiration-panel">
            <Icon name="lightbulb" />
            <strong>Tu tiempo también merece buenos planes.</strong>
            <p>Revisa los eventos disponibles y reserva en pocos segundos.</p>
            <button className="text-button" onClick={() => setView('events')} type="button">Ver catálogo <Icon name="arrow_forward" /></button>
          </Panel>
        </div>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow={isOrganizer ? `Hola, ${firstName}` : 'Administración'}
        title={isOrganizer ? 'Tu operación de eventos' : 'Vista general de SIGER'}
        description={isOrganizer ? 'Revisa la ocupación y el movimiento de los eventos que coordinas.' : 'Aquí tienes una lectura global de eventos, reservaciones y actividad del sistema.'}
        action={<button className="primary-button" onClick={() => setView('create')} type="button"><Icon name="add" />Crear evento</button>}
      />
      <div className="metric-grid">
        <Metric iconName="event" label={isOrganizer ? 'Mis eventos activos' : 'Eventos activos'} value={report.activeEvents} trend={`${report.occupancyRate}% ocupación`} />
        <Metric iconName="book_online" label={isOrganizer ? 'Reservaciones recibidas' : 'Reservaciones'} value={report.reservations} trend={`${report.confirmedReservations} confirmadas`} />
        <Metric iconName="groups" label={isOrganizer ? 'Asistentes registrados' : 'Usuarios registrados'} value={isOrganizer ? report.confirmedReservations : report.users} trend={isOrganizer ? 'En tus eventos' : 'Roles activos'} />
        <Metric iconName="monitoring" label="Ocupación promedio" value={`${report.occupancyRate}%`} trend={isOrganizer ? 'De tus eventos' : 'Demanda global'} />
      </div>
      <div className="dashboard-grid">
        <Panel title={isOrganizer ? 'Mis eventos' : 'Eventos con mayor demanda'} className="span-7">
          {events.slice(0, 3).map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </Panel>
        <Panel title={isOrganizer ? 'Reservaciones recientes' : 'Actividad reciente'} className="span-5">
          {reservations.slice(0, 4).map((reservation) => (
            <ReservationRow key={reservation.id} reservation={reservation} />
          ))}
        </Panel>
      </div>
    </section>
  );
}

export function OrganizerDashboard({ events, openDetail }) {
  const stages = [
    { title: 'Planificación', statuses: ['Borrador'] },
    { title: 'Inscripciones', statuses: ['Publicado', 'Reprogramado'] },
    { title: 'Cerrados', statuses: ['Finalizado', 'Cancelado'] },
  ];
  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Organizador"
        title="Operación de Eventos"
        description="Seguimiento de logística, cupos, check-in y tareas pendientes por evento."
      />
      <div className="kanban-grid">
        {stages.map((stage) => {
          const stageEvents = events.filter((event) => stage.statuses.includes(event.status)).slice(0, 3);
          return (
          <Panel title={stage.title} key={stage.title}>
            {stageEvents.map((event) => (
              <button className="mini-event" key={`${stage.title}-${event.id}`} onClick={() => openDetail(event)} type="button">
                <img alt="" src={event.image || '/logo512.png'} />
                <span>
                  <strong>{event.title}</strong>
                  <small>{formatDate(event.date)} · {event.available} cupos</small>
                </span>
              </button>
            ))}
            {stageEvents.length === 0 && <EmptyState iconName="event_busy" title="Sin eventos" description="Los eventos aparecerán aquí según su estado." />}
          </Panel>
          );
        })}
      </div>
    </section>
  );
}
