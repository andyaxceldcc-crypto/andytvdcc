const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const userModel = require('../models/user.model');
const sessionModel = require('../models/session.model');
const emailService = require('../utils/email.service');
const { generateJWT, hashPassword, comparePassword } = require('../utils/helpers');
const authConfig = require('../config/auth.config');

exports.register = async (req, res) => {
    try {
        const { nombre, usuario, correo, contraseña, telefono } = req.body;

        // Verificar si ya existe
        const existente = await userModel.findByEmailOrUsername(correo, usuario);
        if (existente) {
            return res.status(400).json({ error: 'El correo o usuario ya está registrado' });
        }

        const hashed = await hashPassword(contraseña);
        const token = crypto.randomBytes(32).toString('hex');

        const userId = await userModel.create({
            nombre,
            usuario,
            correo: correo.toLowerCase().trim(),
            contraseña_hash: hashed,
            telefono: telefono || null,
            token_verificacion: token
        });

        // Enviar email de verificación (opcional, no bloqueante)
        emailService.sendVerificationEmail(correo, nombre, token).catch(err => {
            console.error('Error enviando email de verificación:', err);
        });

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            data: { id: userId, nombre, usuario, correo: correo.toLowerCase().trim() }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
};

exports.login = async (req, res) => {
    try {
        const { correo, contraseña, recordar } = req.body;
        const user = await userModel.findByEmail(correo.toLowerCase().trim());

        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        if (!user.cuenta_activa) {
            return res.status(403).json({ error: 'Cuenta desactivada' });
        }

        const valid = await comparePassword(contraseña, user.contraseña_hash);
        if (!valid) {
            await sessionModel.logAttempt(user.id, correo, req.ip, false);
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Actualizar último acceso
        await userModel.updateLastLogin(user.id);

        // Generar tokens
        const token = generateJWT(user);
        const refreshToken = recordar ? generateJWT(user, '7d') : null;

        if (refreshToken) {
            await sessionModel.saveRefreshToken(user.id, refreshToken);
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000,
                sameSite: 'lax'
            });
        }

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });

        await sessionModel.logAttempt(user.id, correo, req.ip, true);

        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id, nombre: user.nombre, usuario: user.usuario,
                    correo: user.correo, rol: user.rol, foto_perfil: user.foto_perfil
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
};

exports.googleLogin = async (req, res) => {
    try {
        const { token } = req.body;
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        let user = await userModel.findByGoogleId(googleId) || await userModel.findByEmail(email);

        if (!user) {
            const username = email.split('@')[0] + '_' + Date.now().toString().slice(-4);
            const randomPass = await hashPassword(crypto.randomBytes(20).toString('hex'));
            const newUserId = await userModel.create({
                nombre: name,
                usuario: username,
                correo: email,
                contraseña_hash: randomPass,
                google_id: googleId,
                foto_perfil: picture,
                verificado: true
            });
            user = { id: newUserId, nombre: name, usuario: username, correo: email, rol: 'USUARIO', foto_perfil: picture };
        } else {
            if (!user.google_id) {
                await userModel.updateGoogleInfo(user.id, googleId, picture);
            }
        }

        const jwtToken = generateJWT(user);
        res.cookie('token', jwtToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });

        res.json({
            success: true,
            data: {
                token: jwtToken,
                user: {
                    id: user.id, nombre: user.nombre, usuario: user.usuario,
                    correo: user.correo, rol: user.rol, foto_perfil: user.foto_perfil
                }
            }
        });
    } catch (error) {
        console.error('Google login error:', error);
        res.status(500).json({ error: 'Error al iniciar sesión con Google' });
    }
};

exports.logout = async (req, res) => {
    try {
        if (req.cookies.refreshToken) {
            await sessionModel.revokeRefreshToken(req.cookies.refreshToken);
        }
        res.clearCookie('token');
        res.clearCookie('refreshToken');
        req.session.destroy(() => {});
        res.json({ success: true, message: 'Sesión cerrada' });
    } catch (error) {
        res.status(500).json({ error: 'Error al cerrar sesión' });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { correo } = req.body;
        const user = await userModel.findByEmail(correo);
        if (user) {
            const resetToken = crypto.randomBytes(32).toString('hex');
            await userModel.setResetToken(user.id, resetToken);
            await emailService.sendPasswordResetEmail(user.correo, user.nombre, resetToken);
        }
        res.json({ success: true, message: 'Si el correo existe, recibirás instrucciones' });
    } catch (error) {
        res.status(500).json({ error: 'Error al procesar solicitud' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, nueva_contraseña } = req.body;
        const user = await userModel.findByResetToken(token);
        if (!user) return res.status(400).json({ error: 'Token inválido o expirado' });

        const hashed = await hashPassword(nueva_contraseña);
        await userModel.updatePassword(user.id, hashed);
        await sessionModel.revokeAllUserTokens(user.id);

        res.json({ success: true, message: 'Contraseña restablecida' });
    } catch (error) {
        res.status(500).json({ error: 'Error al restablecer contraseña' });
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        const user = await userModel.findByVerificationToken(token);
        if (!user) return res.status(400).json({ error: 'Token inválido' });

        await userModel.verifyAccount(user.id);
        res.json({ success: true, message: 'Cuenta verificada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al verificar cuenta' });
    }
};
