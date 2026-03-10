-- Crear BD (phpMyAdmin / XAMPP)
-- Usamos un nombre parecido a la carpeta pero sin guiones (MySQL no los lleva bien si no se escapan)
CREATE DATABASE IF NOT EXISTS horse_race_game_main
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE horse_race_game_main;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  puntos INT NOT NULL DEFAULT 1000,
  fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS compras_puntos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  puntos INT NOT NULL,
  monto INT NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_compras_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS partidas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ganador_caballo VARCHAR(2) NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS apuestas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  partida_id INT NOT NULL,
  usuario_id INT NOT NULL,
  caballo VARCHAR(2) NOT NULL,
  monto INT NOT NULL,
  resultado ENUM('ganada','perdida') NULL,
  pago INT NOT NULL DEFAULT 0,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_apuestas_partida
    FOREIGN KEY (partida_id) REFERENCES partidas(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_apuestas_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Nota: la restricción de "máximo 4 usuarios" se aplica en el backend (server.js)
