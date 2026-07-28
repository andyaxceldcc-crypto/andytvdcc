const pool = require('../config/database');

const SessionModel = {
    async saveRefreshToken(userId, token) {
        await pool.execute(
            'INSERT INTO refresh_tokens (usuario_id, token, expiracion) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))',
            [userId, token]
        );
    },
    async revokeRefreshToken(token) {
        await pool.execute('UPDATE refresh_tokens SET revocado = TRUE WHERE token = ?', [token]);
    },
    async revokeAllUserTokens(userId) {
        await pool.execute('UPDATE refresh_tokens SET revocado = TRUE WHERE usuario_id = ?', [userId]);
    },
    async logAttempt(userId, correo, ip, success) {
        await pool.execute(
            'INSERT INTO login_attempts (usuario_id, correo, ip_address, exito) VALUES (?, ?, ?, ?)',
            [userId, correo, ip, success]
        );
    }
};

module.exports = SessionModel;
