const pool = require('../config/database');

const UserModel = {
    async create(data) {
        const sql = `INSERT INTO usuarios (nombre, usuario, correo, contraseña_hash, telefono, token_verificacion, google_id, foto_perfil, verificado)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const [result] = await pool.execute(sql, [
            data.nombre, data.usuario, data.correo, data.contraseña_hash,
            data.telefono || null, data.token_verificacion || null,
            data.google_id || null, data.foto_perfil || '/uploads/default-avatar.png',
            data.verificado || false
        ]);
        return result.insertId;
    },
    async findByEmail(email) {
        const [rows] = await pool.execute('SELECT * FROM usuarios WHERE correo = ?', [email]);
        return rows[0] || null;
    },
    async findByUsername(username) {
        const [rows] = await pool.execute('SELECT * FROM usuarios WHERE usuario = ?', [username]);
        return rows[0] || null;
    },
    async findByEmailOrUsername(email, username) {
        const [rows] = await pool.execute('SELECT * FROM usuarios WHERE correo = ? OR usuario = ?', [email, username]);
        return rows[0] || null;
    },
    async findById(id) {
        const [rows] = await pool.execute('SELECT id, nombre, usuario, correo, telefono, foto_perfil, rol, fecha_registro, ultimo_acceso, cuenta_activa, verificado FROM usuarios WHERE id = ?', [id]);
        return rows[0] || null;
    },
    async findWithPassword(id) {
        const [rows] = await pool.execute('SELECT * FROM usuarios WHERE id = ?', [id]);
        return rows[0] || null;
    },
    async findByGoogleId(googleId) {
        const [rows] = await pool.execute('SELECT * FROM usuarios WHERE google_id = ?', [googleId]);
        return rows[0] || null;
    },
    async updateLastLogin(id) {
        await pool.execute('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?', [id]);
    },
    async update(id, fields) {
        const sets = [];
        const values = [];
        if (fields.nombre !== undefined) { sets.push('nombre = ?'); values.push(fields.nombre); }
        if (fields.telefono !== undefined) { sets.push('telefono = ?'); values.push(fields.telefono); }
        if (fields.foto_perfil) { sets.push('foto_perfil = ?'); values.push(fields.foto_perfil); }
        if (sets.length === 0) return false;
        values.push(id);
        await pool.execute(`UPDATE usuarios SET ${sets.join(', ')} WHERE id = ?`, values);
        return true;
    },
    async updatePassword(id, newHash) {
        await pool.execute('UPDATE usuarios SET contraseña_hash = ?, token_recuperacion = NULL WHERE id = ?', [newHash, id]);
    },
    async setResetToken(id, token) {
        await pool.execute('UPDATE usuarios SET token_recuperacion = ?, token_recuperacion_expiracion = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = ?', [token, id]);
    },
    async findByResetToken(token) {
        const [rows] = await pool.execute('SELECT * FROM usuarios WHERE token_recuperacion = ? AND token_recuperacion_expiracion > NOW()', [token]);
        return rows[0] || null;
    },
    async findByVerificationToken(token) {
        const [rows] = await pool.execute('SELECT * FROM usuarios WHERE token_verificacion = ?', [token]);
        return rows[0] || null;
    },
    async verifyAccount(id) {
        await pool.execute('UPDATE usuarios SET verificado = TRUE, token_verificacion = NULL WHERE id = ?', [id]);
    },
    async deactivate(id) {
        await pool.execute('UPDATE usuarios SET cuenta_activa = FALSE WHERE id = ?', [id]);
    },
    async toggleStatus(id, status) {
        await pool.execute('UPDATE usuarios SET cuenta_activa = ? WHERE id = ?', [status, id]);
    },
    async updateRole(id, rol) {
        await pool.execute('UPDATE usuarios SET rol = ? WHERE id = ?', [rol, id]);
    },
    async updateGoogleInfo(id, googleId, photo) {
        await pool.execute('UPDATE usuarios SET google_id = ?, foto_perfil = ? WHERE id = ?', [googleId, photo, id]);
    },
    async getAll(page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const [rows] = await pool.execute(
            'SELECT id, nombre, usuario, correo, telefono, foto_perfil, rol, fecha_registro, ultimo_acceso, cuenta_activa, verificado FROM usuarios ORDER BY fecha_registro DESC LIMIT ? OFFSET ?',
            [limit, offset]
        );
        return rows;
    },
    async countAll() {
        const [rows] = await pool.execute('SELECT COUNT(*) as total FROM usuarios');
        return rows[0].total;
    }
};

module.exports = UserModel;
