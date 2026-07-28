const userModel = require('../models/user.model');
const { hashPassword, comparePassword } = require('../utils/helpers');

exports.getProfile = async (req, res) => {
    // req.user ya tiene los datos básicos gracias al middleware
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ success: true, data: user });
};

exports.updateProfile = async (req, res) => {
    try {
        const { nombre, telefono } = req.body;
        const updated = await userModel.update(req.user.id, { nombre, telefono });
        if (!updated) return res.status(400).json({ error: 'No se realizaron cambios' });
        res.json({ success: true, message: 'Perfil actualizado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { contraseña_actual, nueva_contraseña } = req.body;
        const user = await userModel.findWithPassword(req.user.id);
        const valid = await comparePassword(contraseña_actual, user.contraseña_hash);
        if (!valid) return res.status(400).json({ error: 'Contraseña actual incorrecta' });

        const newHash = await hashPassword(nueva_contraseña);
        await userModel.updatePassword(req.user.id, newHash);
        res.json({ success: true, message: 'Contraseña cambiada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al cambiar contraseña' });
    }
};

exports.deleteAccount = async (req, res) => {
    try {
        const { contraseña } = req.body;
        const user = await userModel.findWithPassword(req.user.id);
        const valid = await comparePassword(contraseña, user.contraseña_hash);
        if (!valid) return res.status(400).json({ error: 'Contraseña incorrecta' });

        await userModel.deactivate(req.user.id);
        res.json({ success: true, message: 'Cuenta eliminada' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar cuenta' });
    }
};
