import { Icon } from './common';
import { roleLabel } from '../utils/formatters';

export function Sidebar({ view, setView, items, logout, currentUser }) {
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => setView('dashboard')} type="button">
        <span className="brand-mark"><Icon name="shield_person" /></span>
        <span>
          <strong>SIGER</strong>
          <small>Gestión Inteligente</small>
        </span>
      </button>
      <nav className="nav-list" aria-label="Navegación principal">
        {items.map((item) => (
          <button
            className={`nav-item ${view === item.id ? 'active' : ''}`}
            key={item.id}
            onClick={() => setView(item.id)}
            type="button"
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        {currentUser?.role !== 'participant' && (
          <button className="primary-button full" onClick={() => setView('create')} type="button">
            <Icon name="add" />
            Crear evento
          </button>
        )}
        <button className="ghost-button full" onClick={logout} type="button">
          <Icon name="logout" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

export function Topbar({ query, setQuery, setView, currentUser, unreadCount = 0 }) {
  return (
    <header className="topbar">
      <label className="search-field">
        <Icon name="search" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar eventos, usuarios o reservaciones..."
        />
      </label>
      <div className="topbar-actions">
        <button className="icon-button" onClick={() => setView('notifications')} type="button" aria-label="Notificaciones">
          <Icon name="notifications" />
          {unreadCount > 0 && <span className="signal" />}
        </button>
        <button className="icon-button" type="button" aria-label="Ayuda">
          <Icon name="help_outline" />
        </button>
        <button className="profile" onClick={() => setView('security')} type="button">
          <span>
            <strong>{currentUser?.name || 'SIGER'}</strong>
            <small>{roleLabel(currentUser?.role)}</small>
          </span>
          <img alt="Perfil de usuario" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80" />
        </button>
      </div>
    </header>
  );
}
