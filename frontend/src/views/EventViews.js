import { useState } from 'react';
import { EmptyState, Icon, Meta, PageHeader } from '../components/common';
import { formatDate, formatTime, getOccupancy } from '../utils/formatters';

export function Catalog({ category, setCategory, events, openDetail, reserve, joinWaitlist, currentUser, loading }) {
  const categories = ['Todos', 'Conferencia', 'Taller', 'Networking', 'Seminario'];
  const isStaff = ['admin', 'organizer'].includes(currentUser?.role);

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow={isStaff ? 'Operación' : 'Para ti'}
        title={isStaff ? 'Gestiona tus eventos' : 'Encuentra algo que te interese'}
        description={isStaff ? 'Consulta el calendario y revisa el estado de los eventos que coordinas.' : 'Explora experiencias, talleres y encuentros. Cuando encuentres uno, guarda tu lugar.'}
      />
      <div className="chip-row">
        {categories.map((item) => (
          <button className={`chip ${category === item ? 'selected' : ''}`} key={item} onClick={() => setCategory(item)} type="button">
            {item}
          </button>
        ))}
      </div>
      <div className="catalog-summary"><strong>{events.length} {events.length === 1 ? 'evento' : 'eventos'}</strong><span>{isStaff ? 'Eventos dentro de tu ámbito de gestión.' : 'Ordenados para que encuentres tu próximo plan.'}</span></div>
      <div className="event-grid">
        {events.map((event) => (
          <article className="event-card" key={event.id}>
            <button className="event-image" onClick={() => openDetail(event)} type="button">
              <img src={event.image || '/logo512.png'} alt={event.title} />
              <span>{event.type}</span>
              {event.available === 0 && <b className="sold-out-label">Lista de espera</b>}
            </button>
            <div className="event-card-body">
              <h3>{event.title}</h3>
              <Meta iconName="calendar_today" text={`${formatDate(event.date)} · ${formatTime(event.time)}`} />
              <Meta iconName="location_on" text={event.location} />
              <Meta iconName="person_outline" text={`${event.available} lugares disponibles`} />
              <div className="capacity-meter" aria-label={`Ocupación ${getOccupancy(event)}%`}>
                <span><i style={{ width: `${getOccupancy(event)}%` }} /></span>
                <small>{event.available > 0 ? `${event.available} lugares para ti` : 'El cupo está completo'}</small>
              </div>
              <div className="button-pair">
                <button className="ghost-button" onClick={() => openDetail(event)} type="button">Detalle</button>
                {isStaff ? <button className="primary-button" onClick={() => openDetail(event)} type="button">Gestionar evento</button> : event.available > 0 ? <button className="primary-button" disabled={loading} onClick={() => reserve(event)} type="button">Quiero asistir</button> : <button className="primary-button" disabled={loading} onClick={() => joinWaitlist(event)} type="button">Avisarme si hay cupo</button>}
              </div>
            </div>
          </article>
        ))}
      </div>
      {events.length === 0 && (
        <EmptyState
          iconName="event_busy"
          title="No hay eventos para este filtro"
          description="Prueba con otra categoría o ajusta la búsqueda superior."
        />
      )}
    </section>
  );
}

export function EventDetail({ event, reserve, joinWaitlist, loading, canManage, editEvent, cancelEvent }) {
  const isClosed = ['Cancelado', 'Finalizado'].includes(event.status);
  return (
    <section className="detail-layout">
      <div className="detail-hero">
        <img src={event.image || '/logo512.png'} alt={event.title} />
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
        <div className="booking-note">
          <Icon name={event.available > 0 ? 'check_circle' : 'hourglass_top'} />
          <div><strong>{event.available > 0 ? 'Todavía estás a tiempo' : 'Este evento está completo'}</strong><span>{event.available > 0 ? `${event.available} lugares disponibles. Tu comprobante aparecerá al confirmar.` : 'Puedes unirte a la lista y te avisaremos si se libera un lugar.'}</span></div>
        </div>
        {canManage ? <div className="button-pair hero-action">
          <button className="ghost-button" disabled={loading} onClick={() => editEvent(event)} type="button"><Icon name="edit" />Editar / reprogramar</button>
          {event.status !== 'Cancelado' && <button className="primary-button" disabled={loading} onClick={() => cancelEvent(event)} type="button"><Icon name="event_busy" />Cancelar evento</button>}
        </div> : isClosed ? <div className="event-closed"><Icon name="event_busy" /><strong>Este evento ya no está disponible</strong><span>Consulta el catálogo para encontrar otras opciones.</span></div> : event.available > 0 ? <button className="primary-button hero-action" disabled={loading} onClick={() => reserve(event)} type="button">
          <Icon name="bookmark_added" />Confirmar reservación
        </button> : <button className="primary-button hero-action" disabled={loading || event.status === 'Cancelado'} onClick={() => joinWaitlist(event)} type="button">
          <Icon name="hourglass_top" />Unirme a lista de espera
        </button>}
      </div>
    </section>
  );
}

export function CreateEvent({ createEvent, loading, initialEvent, saveLabel = 'Publicar evento' }) {
  const [form, setForm] = useState(() => initialEvent ? { ...initialEvent } : {
    title: '', type: 'Conferencia', date: '', time: '', description: '', capacity: 1,
    location: '', status: 'Borrador', image: '',
  });

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <section className="page-stack">
      <PageHeader eyebrow={initialEvent ? 'Edición' : 'Organizador'} title={initialEvent ? 'Editar evento' : 'Crear evento'} description="Configura la información que necesitan las personas para decidir si asistir." />
      <form className="form-panel" onSubmit={(event) => { event.preventDefault(); createEvent(form); }}>
        <label>Nombre del evento<input required maxLength="150" value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Ej. Taller de liderazgo" /></label>
        <label>Categoría<select required value={form.type} onChange={(event) => update('type', event.target.value)}><option>Conferencia</option><option>Taller</option><option>Networking</option><option>Seminario</option></select></label>
        <label>Fecha<input required type="date" min={new Date().toISOString().split('T')[0]} value={form.date} onChange={(event) => update('date', event.target.value)} /></label>
        <label>Hora<input required type="time" value={form.time} onChange={(event) => update('time', event.target.value)} /></label>
        <label className="wide">Descripción<textarea value={form.description} onChange={(event) => update('description', event.target.value)} /></label>
        <label>Capacidad<input required min="1" max="100000" type="number" value={form.capacity} onChange={(event) => update('capacity', Number(event.target.value))} /></label>
        <label>Ubicación<input required maxLength="200" value={form.location} onChange={(event) => update('location', event.target.value)} placeholder="Ej. Auditorio principal" /></label>
        <label>Estado<select value={form.status} onChange={(event) => update('status', event.target.value)}><option>Publicado</option><option>Borrador</option><option>Reprogramado</option><option>Cancelado</option></select></label>
        <label className="wide">Imagen del evento<input value={form.image} onChange={(event) => update('image', event.target.value)} placeholder="https://..." /></label>
        <button className="primary-button wide" disabled={loading} type="submit"><Icon name="publish" />{saveLabel}</button>
      </form>
    </section>
  );
}
