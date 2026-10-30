import { formatDate } from '../utils/formatters';

export const Icon = ({ name }) => <span className="material-symbols-outlined">{name}</span>;

export function PageHeader({ eyebrow, title, description, action }) {
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

export function Metric({ iconName, label, value, trend }) {
  return (
    <article className="metric-card">
      <span><Icon name={iconName} /></span>
      <small>{label}</small>
      <strong>{value}</strong>
      <em>{trend}</em>
    </article>
  );
}

export function Panel({ title, className = '', children }) {
  return (
    <section className={`panel ${className}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function EmptyState({ iconName, title, description }) {
  return (
    <div className="empty-state">
      <Icon name={iconName} />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function LoadingState({ label = 'Cargando información' }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <strong>{label}</strong>
      <p>Estamos preparando tu espacio en SIGER.</p>
    </div>
  );
}

export function EventRow({ event }) {
  return (
    <div className="event-row">
      <img alt="" src={event.image || '/logo512.png'} />
      <div>
        <strong>{event.title}</strong>
        <small>{formatDate(event.date)} · {event.location}</small>
      </div>
      <span>{event.available} cupos</span>
    </div>
  );
}

export function ReservationRow({ reservation }) {
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

export function Meta({ iconName, text }) {
  return (
    <div className="meta-line">
      <Icon name={iconName} />
      <span>{text}</span>
    </div>
  );
}
