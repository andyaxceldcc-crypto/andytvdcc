const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth.config');

const hashPassword = async (password) => {
    return await bcrypt.hash(password, authConfig.bcrypt.saltRounds);
};

const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

const generateJWT = (user, expiresIn = authConfig.jwt.expiresIn) => {
    return jwt.sign(
        { userId: user.id, email: user.correo, role: user.rol },
        authConfig.jwt.secret,
        { expiresIn, issuer: authConfig.jwt.issuer, audience: authConfig.jwt.audience }
    );
};

module.exports = { hashPassword, comparePassword, generateJWT };
