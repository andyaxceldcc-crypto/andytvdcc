const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { registerValidation, loginValidation } = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');

// Registro
router.post('/register', registerValidation, authController.register);

// Login normal
router.post('/login', loginValidation, authController.login);

// Login con Google
router.post('/google', authController.googleLogin);

// Cerrar sesión
router.post('/logout', authenticate, authController.logout);

// Recuperar contraseña (solicitar)
router.post('/forgot-password', authController.forgotPassword);

// Restablecer contraseña
router.post('/reset-password', authController.resetPassword);

// Verificar email
router.get('/verify-email', authController.verifyEmail);

module.exports = router;
