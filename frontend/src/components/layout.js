import { Fragment, useEffect, useState } from 'react';
import { Icon } from './common';
import { roleLabel } from '../utils/formatters';

export function Sidebar({ view, setView, items, logout, currentUser }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const mobilePrimaryCount = items.length > 7 ? 5 : 4;
  const mobilePrimaryItems = items.slice(0, mobilePrimaryCount);
  const mobileExtraItems = items.slice(mobilePrimaryCount);
  const extraViewIsActive = mobileExtraItems.some((item) => item.id === view);
  useEffect(() => {
    if (extraViewIsActive) setMoreOpen(true);
  }, [extraViewIsActive]);

  const navigate = (nextView) => {
    setMoreOpen(false);
    setView(nextView);
  };
  const renderNavItem = (item) => (
    <button
      className={`nav-item ${view === item.id ? 'active' : ''}`}
      key={item.id}
      onClick={() => navigate(item.id)}
      type="button"
    >
      <Icon name={item.icon} />
      <span>{item.label}</span>
    </button>
  );

  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => setView('dashboard')} type="button">
        <span className="brand-mark"><Icon name="shield_person" /></span>
        <span>
          <strong>SIGER</strong>
          <small>Gestión Inteligente</small>
        </span>
      </button>
      <nav className="nav-list desktop-nav-list" aria-label="Navegación principal">
        {items.map((item, index) => (
          <Fragment key={item.id}>
            {item.group !== items[index - 1]?.group && <span className="nav-section-label">{item.group}</span>}
            {renderNavItem(item)}
          </Fragment>
        ))}
      </nav>
      <nav className="nav-list mobile-nav-list" aria-label="Navegación móvil">
        {mobilePrimaryItems.map(renderNavItem)}
        <button className={`nav-item mobile-more-button ${moreOpen ? 'active' : ''}`} onClick={() => setMoreOpen((open) => !open)} type="button" aria-expanded={moreOpen} aria-controls="mobile-more-panel">
          <Icon name={moreOpen ? 'close' : 'more_horiz'} />
          <span>Más</span>
        </button>
      </nav>
      {moreOpen && (
        <div className="mobile-more-panel" id="mobile-more-panel" role="dialog" aria-label="Más opciones de navegación">
          <span className="mobile-more-title">Más opciones</span>
          {mobileExtraItems.map(renderNavItem)}
          {currentUser?.role !== 'participant' && <button className="ghost-button full" onClick={() => navigate('create')} type="button"><Icon name="add" />Crear evento</button>}
          <button className="ghost-button full" onClick={() => { setMoreOpen(false); logout(); }} type="button"><Icon name="logout" />Cerrar sesión</button>
        </div>
      )}
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
  const initials = currentUser?.name?.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'S';
  const isParticipant = currentUser?.role === 'participant';
  return (
    <header className="topbar">
      <label className="search-field">
        <Icon name="search" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={isParticipant ? 'Buscar eventos...' : 'Buscar eventos, usuarios o reservaciones...'}
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
        <button className="profile" onClick={() => setView('profile')} type="button">
          <span>
            <strong>{currentUser?.name || 'SIGER'}</strong>
            <small>{roleLabel(currentUser?.role)}</small>
          </span>
          <span className="topbar-avatar" aria-hidden="true">{initials}</span>
        </button>
      </div>
    </header>
  );
}
