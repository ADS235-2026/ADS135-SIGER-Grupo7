import { useState } from 'react';
import { Icon } from '../components/common';

export function Confirmation({ event, setView }) {
  return (
    <section className="confirmation">
      <div className="confirmation-card">
        <span className="success-mark"><Icon name="check" /></span>
        <span className="eyebrow">Reservación Confirmada</span>
        <h1>{event.title}</h1>
        <p>Tu pase digital fue generado correctamente. Presenta el código de reservación en el acceso del evento.</p>
        <div className="ticket-code">SIGER-{event.id}048</div>
        <button className="primary-button" onClick={() => setView('reservations')} type="button">Ver mis reservaciones</button>
      </div>
    </section>
  );
}

export function AuthScreen({ mode, setView, onSubmit, loading }) {
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
        <span className="brand-mark"><Icon name="shield_person" /></span>
        <h1>SIGER</h1>
        <p>Plataforma de gestión de eventos, reservaciones y asistencia.</p>
      </div>
      <form className="auth-card" onSubmit={(event) => { event.preventDefault(); onSubmit(mode, form); }}>
        <span className="eyebrow">{isLogin ? 'Bienvenido' : 'Nuevo usuario'}</span>
        <h2>{isLogin ? 'Iniciar Sesión' : 'Registro de Usuario'}</h2>
        {!isLogin && <label>Nombre completo<input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="María López" /></label>}
        <label>Correo institucional<input value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="usuario@siger.edu" type="email" /></label>
        <label>Contraseña<input value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="••••••••" type="password" /></label>
        {!isLogin && <small className="auth-hint">El registro público crea cuentas de participante. Los demás roles los gestiona un administrador.</small>}
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
