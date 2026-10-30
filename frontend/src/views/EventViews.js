import { useState } from 'react';
import { EmptyState, Icon, Meta, PageHeader } from '../components/common';
import { formatDate, formatTime, getOccupancy } from '../utils/formatters';

export function Catalog({ category, setCategory, events, openDetail, reserve, loading }) {
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
              <div className="capacity-meter" aria-label={`Ocupación ${getOccupancy(event)}%`}>
                <span><i style={{ width: `${getOccupancy(event)}%` }} /></span>
                <small>{getOccupancy(event)}% reservado</small>
              </div>
              <div className="button-pair">
                <button className="ghost-button" onClick={() => openDetail(event)} type="button">Detalle</button>
                <button className="primary-button" disabled={loading} onClick={() => reserve(event)} type="button">Reservar</button>
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

export function EventDetail({ event, reserve, loading, canManage, editEvent, cancelEvent }) {
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
        {canManage ? <div className="button-pair hero-action">
          <button className="ghost-button" disabled={loading} onClick={() => editEvent(event)} type="button"><Icon name="edit" />Editar / reprogramar</button>
          {event.status !== 'Cancelado' && <button className="primary-button" disabled={loading} onClick={() => cancelEvent(event)} type="button"><Icon name="event_busy" />Cancelar evento</button>}
        </div> : <button className="primary-button hero-action" disabled={loading || event.status === 'Cancelado'} onClick={() => reserve(event)} type="button">
          <Icon name="bookmark_added" />Confirmar reservación
        </button>}
      </div>
    </section>
  );
}

export function CreateEvent({ createEvent, loading, initialEvent, saveLabel = 'Publicar evento' }) {
  const [form, setForm] = useState(() => initialEvent ? { ...initialEvent } : {
    title: 'Foro de Innovación 2026', type: 'Conferencia', date: '2026-11-18', time: '09:00',
    description: 'Encuentro institucional para compartir tendencias, proyectos y resultados de innovación.', capacity: 150,
    location: 'Auditorio Principal', status: 'Publicado', image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80',
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
        <label>Estado<select value={form.status} onChange={(event) => update('status', event.target.value)}><option>Publicado</option><option>Borrador</option><option>Reprogramado</option><option>Cancelado</option></select></label>
        <label className="wide">Imagen del evento<input value={form.image} onChange={(event) => update('image', event.target.value)} placeholder="https://..." /></label>
        <button className="primary-button wide" disabled={loading} type="submit"><Icon name="publish" />{saveLabel}</button>
      </form>
    </section>
  );
}
