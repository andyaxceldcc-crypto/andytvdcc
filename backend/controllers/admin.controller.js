const userModel = require('../models/user.model');
const sessionModel = require('../models/session.model');
const pool = require('../config/database'); // para consultas directas

exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const users = await userModel.getAll(page, limit);
        const total = await userModel.countAll();
        res.json({
            success: true,
            data: {
                users,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) }
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
};

exports.getUser = async (req, res) => {
    try {
        const user = await userModel.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        const { rol } = req.body;
        if (!['ADMIN', 'USUARIO'].includes(rol)) {
            return res.status(400).json({ error: 'Rol inválido' });
        }
        await userModel.updateRole(req.params.id, rol);
        res.json({ success: true, message: 'Rol actualizado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar rol' });
    }
};

exports.toggleUserStatus = async (req, res) => {
    try {
        const user = await userModel.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
        const newStatus = !user.cuenta_activa;
        await userModel.toggleStatus(req.params.id, newStatus);
        res.json({ success: true, message: `Cuenta ${newStatus ? 'activada' : 'desactivada'}` });
    } catch (error) {
        res.status(500).json({ error: 'Error al cambiar estado' });
    }
};

exports.getStats = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM usuarios) as total,
                (SELECT COUNT(*) FROM usuarios WHERE verificado = TRUE) as verificados,
                (SELECT COUNT(*) FROM usuarios WHERE DATE(fecha_registro) = CURDATE()) as hoy
        `);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};

exports.getActivityLogs = async (req, res) => {
    try {
        const [logs] = await pool.query(
            `SELECT al.*, u.usuario FROM activity_logs al 
             JOIN usuarios u ON al.usuario_id = u.id 
             ORDER BY al.creado_en DESC LIMIT 100`
        );
        res.json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener logs' });
    }
};
