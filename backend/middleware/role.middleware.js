/**
 * Middleware para verificar roles de usuario
 */

const hasRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Autenticación requerida' });
        }

        if (!roles.includes(req.user.rol)) {
            return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
        }

        next();
    };
};

const isAdmin = hasRole('ADMIN');
const isUser = hasRole('USUARIO', 'ADMIN');

module.exports = {
    hasRole,
    isAdmin,
    isUser
};
