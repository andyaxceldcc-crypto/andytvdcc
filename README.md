# 🎬 AndyAxcel - Sistema de Usuarios

![AndyAxcel](https://img.shields.io/badge/AndyAxcel-v1.0.0-red)
![Node](https://img.shields.io/badge/Node.js-18+-green)
![MySQL](https://img.shields.io/badge/MySQL-8.0+-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

Sistema completo de autenticación y gestión de usuarios para la plataforma **AndyAxcel**. Desarrollado con Node.js, Express, MySQL y JavaScript vanilla.

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Requisitos](#-requisitos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Base de Datos](#-base-de-datos)
- [API Endpoints](#-api-endpoints)
- [Roles de Usuario](#-roles-de-usuario)
- [Seguridad](#-seguridad)
- [Google OAuth](#-google-oauth)
- [Docker](#-docker)
- [Despliegue](#-despliegue)
- [Solución de Problemas](#-solución-de-problemas)
- [Contribuir](#-contribuir)
- [Licencia](#-licencia)

---

## 🚀 Características

### Autenticación
- ✅ Registro de usuarios con validación completa
- ✅ Inicio de sesión con email y contraseña
- ✅ Autenticación con Google OAuth 2.0
- ✅ Cierre de sesión seguro
- ✅ Recuperación de contraseña por email
- ✅ Verificación de cuenta por email
- ✅ Opción "Recordar sesión"
- ✅ Tokens JWT con refresh token

### Gestión de Usuarios
- ✅ Perfil de usuario personalizable
- ✅ Foto de perfil
- ✅ Número de teléfono opcional
- ✅ Panel de administración
- ✅ Roles de usuario (Admin/Usuario)
- ✅ Activación/desactivación de cuentas
- ✅ Cambio de roles por administrador
- ✅ Estadísticas del sistema

### Seguridad
- ✅ Contraseñas hasheadas con bcrypt (12 rounds)
- ✅ Protección contra SQL Injection
- ✅ Rate limiting en endpoints
- ✅ Headers de seguridad con Helmet
- ✅ Validación de datos de entrada
- ✅ Sanitización de texto
- ✅ Cookies HTTP-only
- ✅ CORS configurado
- ✅ Sesiones almacenadas en MySQL

### UX/UI
- ✅ Diseño responsive (móvil, tablet, desktop)
- ✅ Animaciones suaves
- ✅ Mensajes de error claros
- ✅ Indicadores de carga
- ✅ Validación en tiempo real
- ✅ Tema claro/oscuro (preparado)

---

## 💻 Tecnologías

### Frontend
| Tecnología | Uso |
|------------|-----|
| HTML5 | Estructura de páginas |
| CSS3 | Estilos y animaciones |
| JavaScript (Vanilla) | Lógica del cliente |
| Fetch API | Peticiones HTTP |

### Backend
| Tecnología | Uso |
|------------|-----|
| Node.js | Entorno de ejecución |
| Express.js | Framework web |
| MySQL2 | Driver de base de datos |
| bcryptjs | Hash de contraseñas |
| jsonwebtoken | Tokens JWT |
| express-session | Manejo de sesiones |
| google-auth-library | Google OAuth 2.0 |
| nodemailer | Envío de emails |
| helmet | Seguridad HTTP |
| express-rate-limit | Control de peticiones |

### Base de Datos
| Tecnología | Uso |
|------------|-----|
| MySQL 8.0 | Base de datos relacional |
| InnoDB | Motor de almacenamiento |
| utf8mb4 | Codificación de caracteres |

---

## 📦 Requisitos

### Software Necesario
- **Node.js** v18.0.0 o superior
- **MySQL** v8.0 o superior
- **npm** v9.0.0 o superior
- **Git** (opcional, para clonar)

### Hardware Recomendado
- RAM: 512MB mínimo, 2GB recomendado
- Disco: 500MB espacio libre
- CPU: 1 núcleo mínimo

---

## 🔧 Instalación

### Método 1: Instalación Manual

```bash
# 1. Clonar el repositorio (o crear carpeta manualmente)
mkdir AndyAxcel
cd AndyAxcel

# 2. Crear estructura de carpetas
mkdir -p backend/database backend/uploads frontend/css frontend/js frontend/assets/images

# 3. Copiar todos los archivos del proyecto a sus ubicaciones

# 4. Entrar al directorio backend
cd backend

# 5. Instalar dependencias
npm install

# 6. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 7. Crear base de datos
mysql -u root -p < database/schema.sql

# 8. Iniciar servidor en desarrollo
npm run dev

# O en producción
npm start
