import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Icon } from '../components/common';

export function Confirmation({ event, reservation, setView }) {
  const qrValue = JSON.stringify({ reservationId: reservation?.id, eventId: event.id });
  return (
    <section className="confirmation">
      <div className="confirmation-card">
        <span className="success-mark"><Icon name="check" /></span>
        <span className="eyebrow">Reservación Confirmada</span>
        <h1>{event.title}</h1>
        <p>Tu pase digital fue generado correctamente. Presenta el código de reservación en el acceso del evento.</p>
        <div className="ticket-code">{reservation?.id || 'Comprobante pendiente'}</div>
        {reservation?.id && <div className="confirmation-qr"><QRCodeSVG value={qrValue} size={190} bgColor="#ffffff" fgColor="#5b0309" includeMargin /></div>}
        <small className="qr-caption">Muestra este código en el acceso del evento.</small>
        <button className="primary-button" onClick={() => setView('reservations')} type="button">Ver mis reservaciones</button>
      </div>
    </section>
  );
}

export function TicketView({ reservation }) {
  const event = reservation?.eventDetail;
  const qrValue = JSON.stringify({ reservationId: reservation?.id, eventId: reservation?.eventId });
  if (!reservation || !event) return null;
  return (
    <section className="ticket-view">
      <div className="ticket-view-header"><span className="eyebrow">Pase digital</span><h1>{event.title}</h1><p>Presenta este código en el acceso. El equipo validará tu llegada al evento.</p></div>
      <div className="ticket-layout">
        <div className="ticket-qr-card"><QRCodeSVG value={qrValue} size={260} bgColor="#ffffff" fgColor="#5b0309" includeMargin /><strong>{reservation.id}</strong><small>Comprobante de reservación</small></div>
        <div className="ticket-info-card"><span className="status-pill-static">{reservation.state}</span><h2>Información del evento</h2><div className="ticket-facts"><span><Icon name="calendar_today" />{event.date} · {event.time.slice(0, 5)}</span><span><Icon name="location_on" />{event.location}</span><span><Icon name="person" />Organiza {event.organizer}</span></div><div className="ticket-help"><Icon name="info" /><span>Guarda este pase y muéstralo al llegar. El código solo corresponde a esta reservación.</span></div></div>
      </div>
    </section>
  );
}

export function AuthScreen({ mode, setView, onSubmit, loading }) {
  const isLogin = mode === 'login';
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'participant',
  });

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <section className="auth-screen">
      <div className="auth-brand">
        <span className="brand-mark"><Icon name="shield_person" /></span>
        <h1>SIGER</h1>
        <p>Plataforma de gestión de eventos, reservaciones y asistencia.</p>
      </div>
      <form className="auth-card" onSubmit={(event) => { event.preventDefault(); onSubmit(mode, form); }}>
        <span className="eyebrow">{isLogin ? 'Bienvenido' : 'Nuevo usuario'}</span>
        <h2>{isLogin ? 'Iniciar Sesión' : 'Registro de Usuario'}</h2>
        {!isLogin && <label>Nombre completo<input required value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="María López" autoComplete="name" /></label>}
        <label>Correo institucional<input required value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="usuario@siger.edu" type="email" autoComplete="email" /></label>
        <label>Contraseña<input required value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="••••••••" type="password" autoComplete={isLogin ? 'current-password' : 'new-password'} /></label>
        {!isLogin && <small className="auth-hint">El registro público crea cuentas de participante. Los demás roles los gestiona un administrador.</small>}
        <button className="primary-button full" disabled={loading} type="submit">
          {isLogin ? 'Entrar' : 'Crear cuenta'}
        </button>
        <button className="text-button" onClick={() => setView(isLogin ? 'register' : 'login')} type="button">
          {isLogin ? 'Crear una cuenta' : 'Ya tengo una cuenta'}
        </button>
      </form>
    </section>
  );
}
