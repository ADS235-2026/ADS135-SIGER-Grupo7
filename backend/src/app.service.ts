import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { Role } from './auth.decorators';

type UserState = 'Activo' | 'Bloqueado';
type EventStatus = 'Publicado' | 'Borrador' | 'Casi lleno';
type ReservationState = 'Confirmada' | 'Pendiente' | 'En revisión' | 'Cancelada';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  state: UserState;
  passwordHash: string;
}

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  state: UserState;
}

export interface EventItem {
  id: number;
  title: string;
  type: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
  available: number;
  status: EventStatus;
  organizerId: number;
  organizer: string;
  image: string;
  description: string;
}

export interface Reservation {
  id: string;
  eventId: number;
  event: string;
  userId: number;
  guest: string;
  state: ReservationState;
  date: string;
  checkedIn: boolean;
}

interface TokenPayload {
  sub: number;
  email: string;
  role: Role;
  exp: number;
}

const secret = process.env.JWT_SECRET ?? 'siger-dev-secret-change-me';

@Injectable()
export class AppService {
  private nextUserId = 4;
  private nextEventId = 5;
  private nextReservationNumber = 1049;

  private readonly users: User[] = [
    this.createSeedUser(1, 'Admin SIGER', 'admin@siger.edu', 'Admin123!', 'admin'),
    this.createSeedUser(2, 'Andrea Ruiz', 'organizador@siger.edu', 'Organizador123!', 'organizer'),
    this.createSeedUser(3, 'Carlos Mendoza', 'carlos@siger.edu', 'Carlos123!', 'participant'),
  ];

  private readonly events: EventItem[] = [
    {
      id: 1,
      title: 'Liderazgo en la Era Digital',
      type: 'Conferencia',
      date: '2026-10-24',
      time: '09:00',
      location: 'Auditorio Principal',
      capacity: 120,
      available: 12,
      status: 'Publicado',
      organizerId: 2,
      organizer: 'Andrea Ruiz',
      image:
        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
      description:
        'Una jornada para equipos ejecutivos sobre estrategia, cultura digital y toma de decisiones con datos.',
    },
    {
      id: 2,
      title: 'Design Thinking Avanzado',
      type: 'Taller',
      date: '2026-10-29',
      time: '14:00',
      location: 'Sala Boreal',
      capacity: 40,
      available: 5,
      status: 'Casi lleno',
      organizerId: 2,
      organizer: 'Andrea Ruiz',
      image:
        'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
      description:
        'Sesión práctica para mapear problemas, prototipar soluciones y validar experiencias centradas en usuarios.',
    },
    {
      id: 3,
      title: 'Networking para Innovadores',
      type: 'Networking',
      date: '2026-11-03',
      time: '18:00',
      location: 'Terraza Norte',
      capacity: 80,
      available: 28,
      status: 'Publicado',
      organizerId: 1,
      organizer: 'Admin SIGER',
      image:
        'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
      description:
        'Encuentro curado para conectar patrocinadores, emprendedores y responsables de innovación corporativa.',
    },
    {
      id: 4,
      title: 'Analítica para Gestión de Eventos',
      type: 'Seminario',
      date: '2026-11-10',
      time: '10:30',
      location: 'Laboratorio Data',
      capacity: 55,
      available: 19,
      status: 'Borrador',
      organizerId: 1,
      organizer: 'Admin SIGER',
      image:
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
      description:
        'Seminario sobre indicadores, predicción de demanda y tableros de seguimiento para eventos institucionales.',
    },
  ];

  private readonly reservations: Reservation[] = [
    this.createReservationRecord('RSV-1048', 1, 3, 'Confirmada', false),
    this.createReservationRecord('RSV-1047', 2, 3, 'Pendiente', false),
  ];

  health() {
    return {
      name: 'SIGER API',
      status: 'ok',
      version: '1.0.0',
    };
  }

  register(input: {
    name?: string;
    email?: string;
    password?: string;
    role?: Role;
  }) {
    const name = input.name?.trim();
    const email = input.email?.trim().toLowerCase();
    const password = input.password ?? '';
    const role = input.role ?? 'participant';

    if (!name || !email || password.length < 8) {
      throw new BadRequestException(
        'Nombre, correo y contraseña de al menos 8 caracteres son requeridos',
      );
    }

    if (!['admin', 'organizer', 'participant'].includes(role)) {
      throw new BadRequestException('Rol no válido');
    }

    if (this.users.some((user) => user.email === email)) {
      throw new ConflictException('El correo ya está registrado');
    }

    const user: User = {
      id: this.nextUserId++,
      name,
      email,
      role,
      state: 'Activo',
      passwordHash: this.hashPassword(password),
    };

    this.users.push(user);
    return this.authResponse(user);
  }

  login(input: { email?: string; password?: string }) {
    const email = input.email?.trim().toLowerCase();
    const user = this.users.find((candidate) => candidate.email === email);

    if (!user || !this.verifyPassword(input.password ?? '', user.passwordHash)) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.state !== 'Activo') {
      throw new UnauthorizedException('Usuario bloqueado');
    }

    return this.authResponse(user);
  }

  verifyToken(token: string): PublicUser {
    const [encodedPayload, signature] = token.split('.');

    if (!encodedPayload || !signature) {
      throw new UnauthorizedException('Token inválido');
    }

    const expected = this.sign(encodedPayload);

    if (!this.safeEquals(signature, expected)) {
      throw new UnauthorizedException('Token inválido');
    }

    const payload = JSON.parse(this.fromBase64Url(encodedPayload)) as TokenPayload;

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Sesión expirada');
    }

    const user = this.users.find((candidate) => candidate.id === payload.sub);

    if (!user || user.state !== 'Activo') {
      throw new UnauthorizedException('Usuario no disponible');
    }

    return this.toPublicUser(user);
  }

  me(user: PublicUser) {
    return user;
  }

  listUsers() {
    return this.users.map((user) => this.toPublicUser(user));
  }

  listEvents() {
    return this.events.map((event) => this.decorateEvent(event));
  }

  getEvent(id: number) {
    const event = this.events.find((candidate) => candidate.id === id);

    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    return this.decorateEvent(event);
  }

  createEvent(
    input: Partial<EventItem>,
    user: PublicUser,
  ) {
    if (!input.title || !input.type || !input.date || !input.time || !input.location) {
      throw new BadRequestException('Faltan datos obligatorios del evento');
    }

    const event: EventItem = {
      id: this.nextEventId++,
      title: input.title,
      type: input.type,
      date: input.date,
      time: input.time,
      location: input.location,
      capacity: Number(input.capacity ?? 100),
      available: Number(input.capacity ?? 100),
      status: input.status ?? 'Borrador',
      organizerId: user.id,
      organizer: user.name,
      image:
        input.image ??
        'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80',
      description: input.description ?? 'Evento creado desde SIGER.',
    };

    this.events.push(event);
    return this.decorateEvent(event);
  }

  listReservations(user: PublicUser) {
    const data =
      user.role === 'participant'
        ? this.reservations.filter((reservation) => reservation.userId === user.id)
        : this.reservations;

    return data.map((reservation) => this.decorateReservation(reservation));
  }

  createReservation(input: { eventId?: number }, user: PublicUser) {
    const event = this.events.find((candidate) => candidate.id === Number(input.eventId));

    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    if (event.available <= 0) {
      throw new BadRequestException('El evento ya no tiene cupos disponibles');
    }

    const existing = this.reservations.find(
      (reservation) => reservation.eventId === event.id && reservation.userId === user.id,
    );

    if (existing) {
      throw new ConflictException('Ya tienes una reservación para este evento');
    }

    event.available -= 1;

    if (event.available <= 5 && event.status === 'Publicado') {
      event.status = 'Casi lleno';
    }

    const reservation = this.createReservationRecord(
      `RSV-${this.nextReservationNumber++}`,
      event.id,
      user.id,
      'Confirmada',
      false,
    );

    this.reservations.unshift(reservation);
    return this.decorateReservation(reservation);
  }

  updateReservationStatus(id: string, state: ReservationState) {
    const reservation = this.findReservation(id);

    if (!['Confirmada', 'Pendiente', 'En revisión', 'Cancelada'].includes(state)) {
      throw new BadRequestException('Estado de reservación no válido');
    }

    reservation.state = state;
    return this.decorateReservation(reservation);
  }

  checkIn(input: { reservationId?: string }) {
    const reservation = this.findReservation(input.reservationId ?? '');

    if (reservation.state !== 'Confirmada') {
      throw new BadRequestException('Solo las reservaciones confirmadas pueden ingresar');
    }

    reservation.checkedIn = true;
    return this.decorateReservation(reservation);
  }

  attendance(eventId: number) {
    return this.reservations
      .filter((reservation) => reservation.eventId === eventId)
      .map((reservation) => this.decorateReservation(reservation));
  }

  reports() {
    const totalCapacity = this.events.reduce((sum, event) => sum + event.capacity, 0);
    const totalAvailable = this.events.reduce((sum, event) => sum + event.available, 0);
    const confirmedReservations = this.reservations.filter(
      (reservation) => reservation.state === 'Confirmada',
    ).length;

    return {
      activeEvents: this.events.length,
      reservations: this.reservations.length,
      users: this.users.length,
      confirmedReservations,
      occupancyRate: Math.round(((totalCapacity - totalAvailable) / totalCapacity) * 100),
      categories: this.events.reduce<Record<string, number>>((acc, event) => {
        acc[event.type] = (acc[event.type] ?? 0) + 1;
        return acc;
      }, {}),
    };
  }

  private authResponse(user: User) {
    const publicUser = this.toPublicUser(user);
    return {
      token: this.issueToken(user),
      user: publicUser,
    };
  }

  private issueToken(user: User) {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
    };
    const encodedPayload = this.toBase64Url(JSON.stringify(payload));
    return `${encodedPayload}.${this.sign(encodedPayload)}`;
  }

  private sign(value: string) {
    return createHmac('sha256', secret).update(value).digest('base64url');
  }

  private hashPassword(password: string) {
    const salt = randomBytes(16).toString('base64url');
    const hash = scryptSync(password, salt, 64).toString('base64url');
    return `${salt}.${hash}`;
  }

  private verifyPassword(password: string, storedHash: string) {
    const [salt, hash] = storedHash.split('.');

    if (!salt || !hash) {
      return false;
    }

    const attemptedHash = scryptSync(password, salt, 64).toString('base64url');
    return this.safeEquals(hash, attemptedHash);
  }

  private safeEquals(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }

  private toBase64Url(value: string) {
    return Buffer.from(value).toString('base64url');
  }

  private fromBase64Url(value: string) {
    return Buffer.from(value, 'base64url').toString('utf8');
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      state: user.state,
    };
  }

  private createSeedUser(
    id: number,
    name: string,
    email: string,
    password: string,
    role: Role,
  ): User {
    return {
      id,
      name,
      email,
      role,
      state: 'Activo',
      passwordHash: this.hashPassword(password),
    };
  }

  private decorateEvent(event: EventItem) {
    const reserved = event.capacity - event.available;
    return {
      ...event,
      reserved,
      occupancyRate: Math.round((reserved / event.capacity) * 100),
    };
  }

  private createReservationRecord(
    id: string,
    eventId: number,
    userId: number,
    state: ReservationState,
    checkedIn: boolean,
  ): Reservation {
    const event = this.events.find((candidate) => candidate.id === eventId);
    const user = this.users.find((candidate) => candidate.id === userId);

    if (!event || !user) {
      throw new Error('Invalid seed reservation');
    }

    return {
      id,
      eventId,
      event: event.title,
      userId,
      guest: user.name,
      state,
      date: event.date,
      checkedIn,
    };
  }

  private decorateReservation(reservation: Reservation) {
    const event = this.getEvent(reservation.eventId);
    return {
      ...reservation,
      eventDetail: event,
    };
  }

  private findReservation(id: string) {
    const reservation = this.reservations.find((candidate) => candidate.id === id);

    if (!reservation) {
      throw new NotFoundException('Reservación no encontrada');
    }

    return reservation;
  }
}
