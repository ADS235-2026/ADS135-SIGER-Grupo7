-- SIGER - Esquema relacional para MariaDB 11+
-- Este archivo documenta la estructura física equivalente al modelo SQLAlchemy.
-- Uso sugerido desde la raíz del repositorio:
--   mariadb -u siger -p siger < backend/sql/siger.sql

CREATE DATABASE IF NOT EXISTS siger
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE siger;

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL,
  apellido VARCHAR(50) NOT NULL DEFAULT '',
  correo VARCHAR(100) NOT NULL,
  contrasena VARCHAR(255) NOT NULL,
  rol ENUM('administrador', 'organizador', 'participante') NOT NULL DEFAULT 'participante',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_registro DATETIME NOT NULL,
  PRIMARY KEY (id_usuario),
  UNIQUE KEY uq_usuarios_correo (correo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categorias (
  id_categoria INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255) NULL,
  PRIMARY KEY (id_categoria),
  UNIQUE KEY uq_categorias_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS eventos (
  id_evento INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  ubicacion VARCHAR(200) NOT NULL,
  capacidad_max INT NOT NULL,
  id_organizador INT NOT NULL,
  id_categoria INT NOT NULL,
  estado ENUM('borrador', 'activo', 'cancelado', 'reprogramado', 'finalizado') NOT NULL DEFAULT 'borrador',
  image VARCHAR(500) NOT NULL DEFAULT '',
  PRIMARY KEY (id_evento),
  CONSTRAINT ck_event_capacity_positive CHECK (capacidad_max > 0),
  CONSTRAINT fk_eventos_organizador
    FOREIGN KEY (id_organizador) REFERENCES usuarios (id_usuario),
  CONSTRAINT fk_eventos_categoria
    FOREIGN KEY (id_categoria) REFERENCES categorias (id_categoria),
  KEY ix_event_status_date (estado, fecha)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reservaciones (
  id_reservacion INT NOT NULL AUTO_INCREMENT,
  id_evento INT NOT NULL,
  id_usuario INT NOT NULL,
  fecha_reservacion DATETIME NOT NULL,
  estado ENUM('pendiente', 'confirmada', 'cancelada') NOT NULL DEFAULT 'confirmada',
  codigo_comprobante VARCHAR(36) NOT NULL,
  PRIMARY KEY (id_reservacion),
  UNIQUE KEY uq_reservation_user_event (id_usuario, id_evento),
  UNIQUE KEY uq_reservaciones_comprobante (codigo_comprobante),
  CONSTRAINT fk_reservaciones_evento
    FOREIGN KEY (id_evento) REFERENCES eventos (id_evento),
  CONSTRAINT fk_reservaciones_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
  KEY ix_reservation_event_state (id_evento, estado)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS asistencias (
  id_asistencia INT NOT NULL AUTO_INCREMENT,
  id_reservacion INT NOT NULL,
  hora_registro DATETIME NOT NULL,
  validada BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id_asistencia),
  UNIQUE KEY uq_asistencias_reservacion (id_reservacion),
  CONSTRAINT fk_asistencias_reservacion
    FOREIGN KEY (id_reservacion) REFERENCES reservaciones (id_reservacion)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lista_espera (
  id_lista_espera INT NOT NULL AUTO_INCREMENT,
  id_evento INT NOT NULL,
  id_usuario INT NOT NULL,
  fecha_registro DATETIME NOT NULL,
  PRIMARY KEY (id_lista_espera),
  UNIQUE KEY uq_waitlist_user_event (id_usuario, id_evento),
  CONSTRAINT fk_waitlist_evento
    FOREIGN KEY (id_evento) REFERENCES eventos (id_evento),
  CONSTRAINT fk_waitlist_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
  KEY ix_waitlist_event_created (id_evento, fecha_registro)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notificaciones (
  id_notificacion INT NOT NULL AUTO_INCREMENT,
  id_usuario INT NOT NULL,
  tipo ENUM('confirmacion', 'cambio', 'cancelacion', 'recordatorio') NOT NULL,
  mensaje VARCHAR(255) NOT NULL,
  fecha_envio DATETIME NULL,
  leida BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id_notificacion),
  CONSTRAINT fk_notificaciones_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reportes (
  id_reporte INT NOT NULL AUTO_INCREMENT,
  tipo VARCHAR(50) NOT NULL,
  fecha_generacion DATETIME NOT NULL,
  datos JSON NULL,
  formato ENUM('PDF', 'EXCEL', 'CSV') NOT NULL,
  id_generador INT NOT NULL,
  PRIMARY KEY (id_reporte),
  CONSTRAINT fk_reportes_generador
    FOREIGN KEY (id_generador) REFERENCES usuarios (id_usuario)
) ENGINE=InnoDB;

INSERT INTO categorias (nombre, descripcion) VALUES
  ('Conferencia', 'Eventos de Conferencia'),
  ('Taller', 'Eventos de Taller'),
  ('Networking', 'Eventos de Networking'),
  ('Seminario', 'Eventos de Seminario')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

