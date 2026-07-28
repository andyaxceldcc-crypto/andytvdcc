const jwt = require('jsonwebtoken');
const { query } = require('../config/database'); // Ajusta la ruta si es necesario
const authConfig = require('../config/auth.config');

// Middleware de autenticación JWT
const authenticateJWT = async (req, res, next) => {
    try {
        let token = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({ error: 'Acceso denegado. Se requiere autenticación.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            issuer: authConfig.jwt.issuer,
            audience: authConfig.jwt.audience
        });

        const users = await query(
            'SELECT id, nombre, usuario, correo, rol, foto_perfil FROM usuarios WHERE id = ? AND cuenta_activa = TRUE',
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado o cuenta desactivada' });
        }

        req.user = users[0];
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expirado. Inicia sesión de nuevo.' });
        }
        return res.status(403).json({ error: 'Token inválido' });
    }
};

// Middleware de autenticación por sesión (alternativo)
const authenticateSession = (req, res, next) => {
    if (req.session && req.session.userId) {
        req.user = req.session.user;
        return next();
    }
    return res.status(401).json({ error: 'Se requiere iniciar sesión' });
};

// Middleware combinado (prueba JWT, luego sesión)
const authenticate = async (req, res, next) => {
    // Intenta JWT primero
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authenticateJWT(req, res, next);
    }
    // Si no, intenta sesión
    return authenticateSession(req, res, next);
};

module.exports = {
    authenticateJWT,
    authenticateSession,
    authenticate
};
