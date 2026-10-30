import { render, screen } from '@testing-library/react';
import { AuthScreen } from './AuthViews';
import { Catalog, EventDetail } from './EventViews';
import { navItems } from '../data/seedData';

const event = {
  id: 1,
  title: 'Taller de prueba',
  type: 'Taller',
  date: '2027-01-01',
  time: '09:00',
  location: 'Auditorio',
  capacity: 20,
  available: 5,
  occupancyRate: 75,
  status: 'Publicado',
  organizerId: 2,
  organizer: 'Organizador',
  image: '',
  description: 'Descripción de prueba',
};

test('login no expone credenciales precargadas', () => {
  render(<AuthScreen mode="login" setView={() => {}} onSubmit={() => {}} loading={false} />);
  expect(screen.getByLabelText('Correo institucional')).toHaveValue('');
  expect(screen.getByLabelText('Contraseña')).toHaveValue('');
  expect(screen.queryByText(/admin@siger/i)).not.toBeInTheDocument();
});

test('el catálogo cambia la acción según el rol', () => {
  const { rerender } = render(<Catalog category="Todos" setCategory={() => {}} events={[event]} openDetail={() => {}} reserve={() => {}} joinWaitlist={() => {}} currentUser={{ role: 'participant' }} loading={false} />);
  expect(screen.getByRole('button', { name: 'Quiero asistir' })).toBeInTheDocument();

  rerender(<Catalog category="Todos" setCategory={() => {}} events={[event]} openDetail={() => {}} reserve={() => {}} joinWaitlist={() => {}} currentUser={{ role: 'admin' }} loading={false} />);
  expect(screen.getByRole('button', { name: 'Gestionar evento' })).toBeInTheDocument();
});

test('un evento cerrado no ofrece una reserva inválida', () => {
  render(<EventDetail event={{ ...event, status: 'Cancelado' }} reserve={() => {}} joinWaitlist={() => {}} loading={false} canManage={false} />);
  expect(screen.getByText('Este evento ya no está disponible')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /confirmar reservación/i })).not.toBeInTheDocument();
});

test('la navegación prioriza tareas y deja la cuenta al final', () => {
  const participantItems = navItems.filter((item) => item.roles.includes('participant')).map((item) => item.id);
  const adminItems = navItems.filter((item) => item.roles.includes('admin')).map((item) => item.id);

  expect(participantItems).toEqual(['dashboard', 'events', 'reservations', 'waitlist', 'notifications', 'profile', 'security']);
  expect(adminItems).toEqual(['dashboard', 'events', 'reservations', 'organizer', 'attendance', 'reports', 'users', 'notifications', 'profile', 'security']);
});
