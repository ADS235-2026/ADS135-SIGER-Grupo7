import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { AppService } from './app.service';
import { Public, Roles } from './auth.decorators';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  health() {
    return this.appService.health();
  }

  @Public()
  @Get('health')
  getHealth() {
    return this.appService.health();
  }

  @Public()
  @Post('auth/login')
  login(@Body() body: { email?: string; password?: string }) {
    return this.appService.login(body);
  }

  @Public()
  @Post('auth/register')
  register(
    @Body()
    body: {
      name?: string;
      email?: string;
      password?: string;
      role?: 'admin' | 'organizer' | 'participant';
    },
  ) {
    return this.appService.register(body);
  }

  @Get('auth/me')
  me(@Req() request) {
    return this.appService.me(request.user);
  }

  @Roles('admin')
  @Get('users')
  listUsers() {
    return this.appService.listUsers();
  }

  @Get('events')
  listEvents() {
    return this.appService.listEvents();
  }

  @Get('events/:id')
  getEvent(@Param('id') id: string) {
    return this.appService.getEvent(Number(id));
  }

  @Roles('admin', 'organizer')
  @Post('events')
  createEvent(@Body() body, @Req() request) {
    return this.appService.createEvent(body, request.user);
  }

  @Get('reservations')
  listReservations(@Req() request) {
    return this.appService.listReservations(request.user);
  }

  @Post('reservations')
  createReservation(@Body() body: { eventId?: number }, @Req() request) {
    return this.appService.createReservation(body, request.user);
  }

  @Roles('admin', 'organizer')
  @Patch('reservations/:id/status')
  updateReservationStatus(
    @Param('id') id: string,
    @Body() body: { state: 'Confirmada' | 'Pendiente' | 'En revisión' | 'Cancelada' },
  ) {
    return this.appService.updateReservationStatus(id, body.state);
  }

  @Roles('admin', 'organizer')
  @Post('attendance/check-in')
  checkIn(@Body() body: { reservationId?: string }) {
    return this.appService.checkIn(body);
  }

  @Roles('admin', 'organizer')
  @Get('attendance/:eventId')
  attendance(@Param('eventId') eventId: string) {
    return this.appService.attendance(Number(eventId));
  }

  @Roles('admin', 'organizer')
  @Get('reports/summary')
  reports() {
    return this.appService.reports();
  }
}
