-- ============================================================
-- ANDYAXCEL - ESQUEMA DE BASE DE DATOS
-- ============================================================

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS andyaxcel 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

USE andyaxcel;

-- ============================================================
-- TABLA: usuarios
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'ID único del usuario',
    nombre VARCHAR(255) NOT NULL COMMENT 'Nombre completo del usuario',
    usuario VARCHAR(100) NOT NULL UNIQUE COMMENT 'Nombre de usuario único',
    correo VARCHAR(255) NOT NULL UNIQUE COMMENT 'Correo electrónico único',
    contraseña_hash VARCHAR(255) NOT NULL COMMENT 'Hash bcrypt de la contraseña',
    telefono VARCHAR(20) DEFAULT NULL COMMENT 'Número de teléfono opcional',
    foto_perfil VARCHAR(500) DEFAULT '/uploads/default-avatar.png' COMMENT 'Ruta de la foto de perfil',
    rol ENUM('ADMIN', 'USUARIO') NOT NULL DEFAULT 'USUARIO' COMMENT 'Rol del usuario',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de registro',
    ultimo_acceso TIMESTAMP NULL COMMENT 'Último inicio de sesión',
    cuenta_activa BOOLEAN DEFAULT TRUE COMMENT 'Si la cuenta está activa',
    verificado BOOLEAN DEFAULT FALSE COMMENT 'Si el email está verificado',
    token_verificacion VARCHAR(255) DEFAULT NULL COMMENT 'Token para verificar email',
    token_recuperacion VARCHAR(255) DEFAULT NULL COMMENT 'Token para recuperar contraseña',
    token_recuperacion_expiracion TIMESTAMP NULL COMMENT 'Expiración del token de recuperación',
    google_id VARCHAR(255) DEFAULT NULL COMMENT 'ID de Google OAuth',
    google_token TEXT DEFAULT NULL COMMENT 'Token de acceso de Google',
    
    -- Índices para búsquedas rápidas
    INDEX idx_correo (correo),
    INDEX idx_usuario (usuario),
    INDEX idx_google_id (google_id),
    INDEX idx_rol (rol),
    INDEX idx_fecha_registro (fecha_registro),
    INDEX idx_verificado (verificado),
    INDEX idx_cuenta_activa (cuenta_activa)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Tabla principal de usuarios';

-- ============================================================
-- TABLA: sessions (para express-session)
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(128) NOT NULL COMMENT 'ID de sesión',
    expires INT UNSIGNED NOT NULL COMMENT 'Timestamp de expiración',
    data MEDIUMTEXT COMMENT 'Datos de sesión serializados',
    PRIMARY KEY (session_id),
    INDEX idx_expires (expires)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Almacenamiento de sesiones';

-- ============================================================
-- TABLA: refresh_tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    expiracion TIMESTAMP NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revocado BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_expiracion (expiracion)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Tokens de refresco JWT';

-- ============================================================
-- TABLA: login_attempts
-- ============================================================
CREATE TABLE IF NOT EXISTS login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT DEFAULT NULL,
    correo VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT DEFAULT NULL,
    exito BOOLEAN DEFAULT FALSE,
    intento_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_correo_time (correo, intento_en),
    INDEX idx_ip_time (ip_address, intento_en),
    INDEX idx_exito (exito)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Registro de intentos de inicio de sesión';

-- ============================================================
-- TABLA: activity_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    accion VARCHAR(100) NOT NULL,
    descripcion TEXT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario_time (usuario_id, creado_en),
    INDEX idx_accion (accion),
    INDEX idx_creado_en (creado_en)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Registro de actividad de usuarios';

-- ============================================================
-- TABLA: password_resets
-- ============================================================
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    expiracion TIMESTAMP NOT NULL,
    usado BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_usuario_expiracion (usuario_id, expiracion)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Solicitudes de restablecimiento de contraseña';

-- ============================================================
-- TABLA: email_verifications
-- ============================================================
CREATE TABLE IF NOT EXISTS email_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    expiracion TIMESTAMP NOT NULL,
    verificado BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_usuario_id (usuario_id)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Verificaciones de correo electrónico';

-- ============================================================
-- TABLA: user_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS user_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL UNIQUE,
    notificaciones_email BOOLEAN DEFAULT TRUE,
    notificaciones_push BOOLEAN DEFAULT TRUE,
    tema VARCHAR(20) DEFAULT 'light',
    idioma VARCHAR(10) DEFAULT 'es',
    privacidad_perfil VARCHAR(20) DEFAULT 'publico',
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Configuraciones de usuario';

-- ============================================================
-- TABLA: migrations (control de versiones de BD)
-- ============================================================
CREATE TABLE IF NOT EXISTS migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    version VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT DEFAULT NULL,
    aplicada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_version (version)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Control de migraciones de base de datos';

-- ============================================================
-- INSERTAR DATOS INICIALES
-- ============================================================

-- Admin por defecto (contraseña: Admin123!)
-- El hash bcrypt se generó con 12 rounds de sal
INSERT INTO usuarios (
    nombre, 
    usuario, 
    correo, 
    contraseña_hash, 
    rol, 
    verificado, 
    cuenta_activa
) VALUES (
    'Administrador Principal',
    'admin',
    'admin@andyaxcel.com',
    '$2a$12$LJ3m4ys3Lk0TSwHwY4NcEehDGb5xJmNTwH7hBpyVOODGOiFTkHReC',
    'ADMIN',
    TRUE,
    TRUE
) ON DUPLICATE KEY UPDATE rol = 'ADMIN';

-- Configuración por defecto para el admin
INSERT INTO user_settings (usuario_id, tema, idioma)
SELECT id, 'light', 'es' FROM usuarios WHERE correo = 'admin@andyaxcel.com'
ON DUPLICATE KEY UPDATE tema = 'light';

-- Registrar migración inicial
INSERT INTO migrations (version, descripcion) 
VALUES ('001_initial', 'Creación inicial de tablas del sistema')
ON DUPLICATE KEY UPDATE descripcion = 'Creación inicial de tablas del sistema';

-- ============================================================
-- TRIGGERS
-- ============================================================

DELIMITER //

-- Trigger: Registrar actividad al crear usuario
CREATE TRIGGER after_user_insert
AFTER INSERT ON usuarios
FOR EACH ROW
BEGIN
    INSERT INTO activity_logs (usuario_id, accion, descripcion)
    VALUES (NEW.id, 'REGISTER', 'Usuario registrado');
    
    -- Crear configuración por defecto
    INSERT INTO user_settings (usuario_id) VALUES (NEW.id);
END//

-- Trigger: Registrar cambio de contraseña
CREATE TRIGGER after_password_update
AFTER UPDATE ON usuarios
FOR EACH ROW
BEGIN
    IF NEW.contraseña_hash != OLD.contraseña_hash THEN
        INSERT INTO activity_logs (usuario_id, accion, descripcion)
        VALUES (NEW.id, 'PASSWORD_CHANGE', 'Contraseña actualizada');
    END IF;
END//

-- Trigger: Prevenir eliminación del último admin
CREATE TRIGGER before_admin_delete
BEFORE DELETE ON usuarios
FOR EACH ROW
BEGIN
    DECLARE admin_count INT;
    
    IF OLD.rol = 'ADMIN' THEN
        SELECT COUNT(*) INTO admin_count 
        FROM usuarios 
        WHERE rol = 'ADMIN' AND cuenta_activa = TRUE AND id != OLD.id;
        
        IF admin_count = 0 THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'No se puede eliminar al último administrador activo';
        END IF;
    END IF;
END//

DELIMITER ;

-- ============================================================
-- VISTAS ÚTILES
-- ============================================================

-- Vista de usuarios activos
CREATE OR REPLACE VIEW v_usuarios_activos AS
SELECT id, nombre, usuario, correo, rol, fecha_registro, ultimo_acceso
FROM usuarios
WHERE cuenta_activa = TRUE;

-- Vista de estadísticas diarias
CREATE OR REPLACE VIEW v_estadisticas_diarias AS
SELECT 
    DATE(fecha_registro) as fecha,
    COUNT(*) as nuevos_usuarios,
    SUM(CASE WHEN verificado = TRUE THEN 1 ELSE 0 END) as verificados
FROM usuarios
GROUP BY DATE(fecha_registro)
ORDER BY fecha DESC;

-- ============================================================
-- FIN DEL ESQUEMA
-- ============================================================
