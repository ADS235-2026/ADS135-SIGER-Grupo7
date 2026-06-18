export function formatDate(value) {
  if (!value) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-SV', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

export function formatTime(value) {
  if (!value) {
    return 'Sin hora';
  }

  const [hours, minutes] = value.split(':');
  return new Intl.DateTimeFormat('es-SV', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(2026, 0, 1, Number(hours), Number(minutes || 0)));
}

export function getOccupancy(event) {
  if (typeof event.occupancyRate === 'number') {
    return event.occupancyRate;
  }

  return Math.round(((event.capacity - event.available) / event.capacity) * 100);
}

export function roleLabel(role) {
  const labels = {
    admin: 'Administrador',
    organizer: 'Organizador',
    participant: 'Participante',
  };
  return labels[role] || 'Usuario';
}
