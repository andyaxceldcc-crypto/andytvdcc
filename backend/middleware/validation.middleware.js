const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Error de validación',
            details: errors.array().map(err => ({
                campo: err.path,
                mensaje: err.msg
            }))
        });
    }
    next();
};

const registerValidation = [
    body('nombre')
        .trim()
        .notEmpty().withMessage('El nombre completo es requerido')
        .isLength({ min: 3, max: 255 }).withMessage('El nombre debe tener entre 3 y 255 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El nombre solo puede contener letras y espacios'),
    body('usuario')
        .trim()
        .notEmpty().withMessage('El nombre de usuario es requerido')
        .isLength({ min: 3, max: 50 }).withMessage('El usuario debe tener entre 3 y 50 caracteres')
        .matches(/^[a-zA-Z0-9._-]+$/).withMessage('Caracteres permitidos: letras, números, . _ -'),
    body('correo')
        .trim()
        .notEmpty().withMessage('El correo es requerido')
        .isEmail().withMessage('Debe ser un correo válido')
        .normalizeEmail()
        .custom(value => {
            if (!value.endsWith('@gmail.com')) throw new Error('Debe ser un correo de Gmail');
            return true;
        }),
    body('contraseña')
        .notEmpty().withMessage('La contraseña es requerida')
        .isLength({ min: 8, max: 128 }).withMessage('La contraseña debe tener entre 8 y 128 caracteres')
        .matches(/[A-Z]/).withMessage('Debe contener al menos una mayúscula')
        .matches(/[a-z]/).withMessage('Debe contener al menos una minúscula')
        .matches(/[0-9]/).withMessage('Debe contener al menos un número')
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Debe contener al menos un carácter especial'),
    body('confirmar_contraseña')
        .notEmpty().withMessage('Confirma tu contraseña')
        .custom((value, { req }) => {
            if (value !== req.body.contraseña) throw new Error('Las contraseñas no coinciden');
            return true;
        }),
    body('telefono')
        .optional({ checkFalsy: true })
        .matches(/^\+?[0-9]{7,15}$/).withMessage('Número de teléfono no válido'),
    validate
];

const loginValidation = [
    body('correo')
        .trim()
        .notEmpty().withMessage('El correo es requerido')
        .isEmail().withMessage('Debe ser un correo válido')
        .normalizeEmail(),
    body('contraseña')
        .notEmpty().withMessage('La contraseña es requerida'),
    validate
];

module.exports = {
    registerValidation,
    loginValidation
};
