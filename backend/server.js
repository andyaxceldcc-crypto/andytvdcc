require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

// ============================================================
// CONFIGURACION INICIAL
// ============================================================
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// BASE DE DATOS
// ============================================================
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'andyaxcel',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    charset: 'utf8mb4'
});

// Función helper para queries
const query = async (sql, params = []) => {
    try {
        const [results] = await pool.execute(sql, params);
        return results;
    } catch (error) {
        console.error(`[SQL Error] ${error.message}`);
        console.error(`[SQL Query] ${sql}`);
        console.error(`[SQL Params]`, params);
        throw error;
    }
};

// Probar conexión
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQL conectado exitosamente');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Error conectando a MySQL:', error.message);
        console.error('   Asegúrate de que MySQL esté corriendo');
        console.error('   y la base de datos "andyaxcel" exista');
        return false;
    }
};

// ============================================================
// MIDDLEWARES DE SEGURIDAD
// ============================================================

// Helmet para headers de seguridad
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://accounts.google.com", "https://apis.google.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            connectSrc: ["'self'", "https://accounts.google.com", "https://www.googleapis.com"],
            frameSrc: ["'self'", "https://accounts.google.com"],
            mediaSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5500',
            'http://127.0.0.1:5500',
            'http://localhost:8080',
            'http://127.0.0.1:8080'
        ];
        
        // Permitir requests sin origin (Postman, curl, etc)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`[CORS] Origen bloqueado: ${origin}`);
            callback(new Error('Origen no permitido por CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400
};
app.use(cors(corsOptions));

// Compresión gzip
app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    }
}));

// Logging
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

// Parseo de body
app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
        try { JSON.parse(buf); } 
        catch (e) { 
            res.status(400).json({ error: 'JSON inválido' }); 
            throw new Error('JSON inválido'); 
        }
    }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookies
app.use(cookieParser(process.env.SESSION_SECRET));

// Sesiones con MySQL
const MySQLStore = require('connect-mysql-session')(session);
const sessionStore = new MySQLStore({
    expiration: 86400000,
    createDatabaseTable: true,
    schema: {
        tableName: 'sessions',
        columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
        }
    }
}, pool);

app.use(session({
    key: 'andyaxcel_sid',
    secret: process.env.SESSION_SECRET || 'andyaxcel_session_secret_fallback',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
    }
}));

// ============================================================
// RATE LIMITING
// ============================================================

// Rate limiter general
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Demasiadas peticiones. Intenta de nuevo en 15 minutos.',
        retryAfter: 900
    },
    skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1'
});

// Rate limiter para auth
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    message: {
        success: false,
        error: 'AUTH_RATE_LIMIT',
        message: 'Demasiados intentos de inicio de sesión. Intenta en 15 minutos.'
    }
});

// Rate limiter para API
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: {
        success: false,
        error: 'API_RATE_LIMIT',
        message: 'Límite de API excedido. 60 peticiones por minuto.'
    }
});

app.use('/api/', generalLimiter);

// ============================================================
// FUNCIONES UTILITARIAS
// ============================================================

// Hash de contraseña
const hashPassword = async (password) => {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    return await bcrypt.hash(password, saltRounds);
};

// Comparar contraseña
const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

// Generar token aleatorio
const generateRandomToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

// Generar código de verificación
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generar JWT
const generateJWT = (user, expiresIn = '24h') => {
    return jwt.sign(
        {
            userId: user.id,
            email: user.correo,
            role: user.rol,
            iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET,
        {
            expiresIn: expiresIn,
            issuer: 'AndyAxcel',
            audience: 'AndyAxcel-Users'
        }
    );
};

// Verificar JWT
const verifyJWT = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET, {
            issuer: 'AndyAxcel',
            audience: 'AndyAxcel-Users'
        });
    } catch (error) {
        return null;
    }
};

// Validar email
const isValidEmail = (email) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
};

// Validar si es Gmail
const isGmail = (email) => {
    return email.endsWith('@gmail.com') || email.endsWith('@googlemail.com');
};

// Validar fortaleza de contraseña
const isStrongPassword = (password) => {
    const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    return {
        isValid: Object.values(checks).every(Boolean),
        checks
    };
};

// Sanitizar texto
const sanitize = (text) => {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .trim();
};

// Formatear respuesta exitosa
const successResponse = (data, message = 'Operación exitosa') => ({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
});

// Formatear respuesta de error
const errorResponse = (message, code = 'ERROR', statusCode = 400) => ({
    success: false,
    error: {
        code,
        message,
        statusCode
    },
    timestamp: new Date().toISOString()
});

// ============================================================
// MIDDLEWARE DE AUTENTICACION
// ============================================================
const authenticate = async (req, res, next) => {
    try {
        let token = null;
        
        // Intentar obtener de header Authorization
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
        
        // Si no hay en header, intentar de cookie
        if (!token && req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }
        
        // Si no hay token
        if (!token) {
            return res.status(401).json(
                errorResponse('Se requiere autenticación', 'AUTH_REQUIRED', 401)
            );
        }
        
        // Verificar token
        const decoded = verifyJWT(token);
        if (!decoded) {
            return res.status(401).json(
                errorResponse('Token inválido o expirado', 'INVALID_TOKEN', 401)
            );
        }
        
        // Buscar usuario
        const users = await query(
            `SELECT id, nombre, usuario, correo, telefono, foto_perfil, 
                    rol, fecha_registro, ultimo_acceso, cuenta_activa, verificado 
             FROM usuarios 
             WHERE id = ? AND cuenta_activa = TRUE`,
            [decoded.userId]
        );
        
        if (users.length === 0) {
            return res.status(401).json(
                errorResponse('Usuario no encontrado o cuenta desactivada', 'USER_NOT_FOUND', 401)
            );
        }
        
        // Asignar usuario al request
        req.user = users[0];
        req.userId = users[0].id;
        
        // Continuar
        next();
        
    } catch (error) {
        console.error('[Auth Middleware Error]', error);
        return res.status(500).json(
            errorResponse('Error de autenticación', 'AUTH_ERROR', 500)
        );
    }
};

// Middleware de rol
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json(
                errorResponse('Autenticación requerida', 'AUTH_REQUIRED', 401)
            );
        }
        
        if (!roles.includes(req.user.rol)) {
            return res.status(403).json(
                errorResponse('No tienes permisos para esta acción', 'FORBIDDEN', 403)
            );
        }
        
        next();
    };
};

const isAdmin = requireRole('ADMIN');

// ============================================================
// ARCHIVOS ESTATICOS
// ============================================================
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Crear directorio uploads si no existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Directorio uploads creado');
}

// ============================================================
// RUTA PRINCIPAL
// ============================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Health check
app.get('/api/health', async (req, res) => {
    const dbConnected = await testConnection();
    res.json({
        success: true,
        status: 'running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbConnected ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

// ============================================================
// API: AUTENTICACION
// ============================================================

// Registro
app.post('/api/auth/register', async (req, res) => {
    try {
        const { nombre, usuario, correo, contraseña, confirmar_contraseña, telefono } = req.body;
        
        // Validar campos requeridos
        if (!nombre || !usuario || !correo || !contraseña) {
            return res.status(400).json(
                errorResponse('Todos los campos marcados con * son requeridos', 'VALIDATION_ERROR')
            );
        }
        
        // Validar confirmación de contraseña
        if (confirmar_contraseña && contraseña !== confirmar_contraseña) {
            return res.status(400).json(
                errorResponse('Las contraseñas no coinciden', 'PASSWORD_MISMATCH')
            );
        }
        
        // Validar email
        if (!isValidEmail(correo)) {
            return res.status(400).json(
                errorResponse('El formato del correo no es válido', 'INVALID_EMAIL')
            );
        }
        
        // Validar Gmail
        if (!isGmail(correo)) {
            return res.status(400).json(
                errorResponse('Debes usar un correo de Gmail (@gmail.com)', 'NOT_GMAIL')
            );
        }
        
        // Validar nombre
        if (nombre.length < 3 || nombre.length > 255) {
            return res.status(400).json(
                errorResponse('El nombre debe tener entre 3 y 255 caracteres', 'INVALID_NAME')
            );
        }
        
        // Validar usuario
        if (usuario.length < 3 || usuario.length > 50) {
            return res.status(400).json(
                errorResponse('El usuario debe tener entre 3 y 50 caracteres', 'INVALID_USERNAME')
            );
        }
        
        if (!/^[a-zA-Z0-9._-]+$/.test(usuario)) {
            return res.status(400).json(
                errorResponse('El usuario solo puede contener letras, números, puntos, guiones y guiones bajos', 'INVALID_USERNAME_CHARS')
            );
        }
        
        // Validar contraseña
        const passwordCheck = isStrongPassword(contraseña);
        if (!passwordCheck.isValid) {
            const errors = [];
            if (!passwordCheck.checks.length) errors.push('al menos 8 caracteres');
            if (!passwordCheck.checks.uppercase) errors.push('una mayúscula');
            if (!passwordCheck.checks.lowercase) errors.push('una minúscula');
            if (!passwordCheck.checks.number) errors.push('un número');
            if (!passwordCheck.checks.special) errors.push('un carácter especial');
            
            return res.status(400).json(
                errorResponse(`La contraseña debe contener: ${errors.join(', ')}`, 'WEAK_PASSWORD')
            );
        }
        
        // Validar teléfono (opcional)
        if (telefono && !/^\+?[0-9]{7,15}$/.test(telefono)) {
            return res.status(400).json(
                errorResponse('El formato del teléfono no es válido', 'INVALID_PHONE')
            );
        }
        
        // Verificar si ya existe el correo
        const existingEmail = await query('SELECT id FROM usuarios WHERE correo = ?', [correo]);
        if (existingEmail.length > 0) {
            return res.status(409).json(
                errorResponse('El correo electrónico ya está registrado', 'EMAIL_EXISTS')
            );
        }
        
        // Verificar si ya existe el usuario
        const existingUser = await query('SELECT id FROM usuarios WHERE usuario = ?', [usuario]);
        if (existingUser.length > 0) {
            return res.status(409).json(
                errorResponse('El nombre de usuario ya está en uso', 'USERNAME_EXISTS')
            );
        }
        
        // Crear usuario
        const hashedPassword = await hashPassword(contraseña);
        const verificationToken = generateRandomToken();
        
        const result = await query(
            `INSERT INTO usuarios (nombre, usuario, correo, contraseña_hash, telefono, token_verificacion) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [sanitize(nombre), sanitize(usuario), correo.toLowerCase().trim(), hashedPassword, telefono || null, verificationToken]
        );
        
        const newUser = {
            id: result.insertId,
            nombre: sanitize(nombre),
            usuario: sanitize(usuario),
            correo: correo.toLowerCase().trim()
        };
        
        // Registrar actividad
        await query(
            'INSERT INTO activity_logs (usuario_id, accion, descripcion, ip_address) VALUES (?, ?, ?, ?)',
            [newUser.id, 'REGISTER', 'Nuevo registro de usuario', req.ip]
        );
        
        console.log(`✅ Nuevo usuario registrado: ${newUser.correo} (ID: ${newUser.id})`);
        
        res.status(201).json(
            successResponse(newUser, 'Usuario registrado exitosamente')
        );
        
    } catch (error) {
        console.error('[Register Error]', error);
        res.status(500).json(
            errorResponse('Error interno al registrar usuario', 'SERVER_ERROR', 500)
        );
    }
});

// Login
app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { correo, contraseña, recordar } = req.body;
        
        // Validar campos
        if (!correo || !contraseña) {
            return res.status(400).json(
                errorResponse('Correo y contraseña son requeridos', 'VALIDATION_ERROR')
            );
        }
        
        // Buscar usuario
        const users = await query(
            'SELECT * FROM usuarios WHERE correo = ?',
            [correo.toLowerCase().trim()]
        );
        
        if (users.length === 0) {
            return res.status(401).json(
                errorResponse('Credenciales inválidas', 'INVALID_CREDENTIALS', 401)
            );
        }
        
        const user = users[0];
        
        // Verificar cuenta activa
        if (!user.cuenta_activa) {
            return res.status(403).json(
                errorResponse('Tu cuenta ha sido desactivada. Contacta al administrador.', 'ACCOUNT_DISABLED', 403)
            );
        }
        
        // Verificar contraseña
        const isValidPassword = await comparePassword(contraseña, user.contraseña_hash);
        
        if (!isValidPassword) {
            // Registrar intento fallido
            await query(
                'INSERT INTO login_attempts (usuario_id, correo, ip_address, exito) VALUES (?, ?, ?, FALSE)',
                [user.id, correo, req.ip]
            );
            
            return res.status(401).json(
                errorResponse('Credenciales inválidas', 'INVALID_CREDENTIALS', 401)
            );
        }
        
        // Actualizar último acceso
        await query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?', [user.id]);
        
        // Registrar intento exitoso
        await query(
            'INSERT INTO login_attempts (usuario_id, correo, ip_address, exito) VALUES (?, ?, ?, TRUE)',
            [user.id, correo, req.ip]
        );
        
        // Generar tokens
        const token = generateJWT(user);
        const refreshToken = recordar ? generateJWT(user, '7d') : null;
        
        // Guardar refresh token si es necesario
        if (refreshToken) {
            await query(
                'INSERT INTO refresh_tokens (usuario_id, token, expiracion) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))',
                [user.id, refreshToken]
            );
        }
        
        // Configurar cookies
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax',
            path: '/'
        });
        
        if (refreshToken) {
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000,
                sameSite: 'lax',
                path: '/'
            });
        }
        
        // Datos del usuario a retornar
        const userData = {
            id: user.id,
            nombre: user.nombre,
            usuario: user.usuario,
            correo: user.correo,
            rol: user.rol,
            foto_perfil: user.foto_perfil
        };
        
        console.log(`✅ Login exitoso: ${user.correo}`);
        
        res.json(
            successResponse({
                token,
                refreshToken,
                user: userData
            }, 'Inicio de sesión exitoso')
        );
        
    } catch (error) {
        console.error('[Login Error]', error);
        res.status(500).json(
            errorResponse('Error interno al iniciar sesión', 'SERVER_ERROR', 500)
        );
    }
});

// Google Login
app.post('/api/auth/google', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json(
                errorResponse('Token de Google requerido', 'MISSING_TOKEN')
            );
        }
        
        // Verificar token con Google
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        
        let payload;
        try {
            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: process.env.GOOGLE_CLIENT_ID
            });
            payload = ticket.getPayload();
        } catch (googleError) {
            console.error('[Google Verify Error]', googleError);
            return res.status(400).json(
                errorResponse('Token de Google inválido', 'INVALID_GOOGLE_TOKEN')
            );
        }
        
        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name;
        const picture = payload.picture;
        const emailVerified = payload.email_verified;
        
        if (!emailVerified) {
            return res.status(400).json(
                errorResponse('El email no está verificado por Google', 'EMAIL_NOT_VERIFIED')
            );
        }
        
        // Buscar o crear usuario
        let users = await query(
            'SELECT * FROM usuarios WHERE google_id = ? OR correo = ?',
            [googleId, email]
        );
        
        let user;
        
        if (users.length > 0) {
            user = users[0];
            
            // Actualizar datos si es necesario
            if (!user.google_id || user.foto_perfil !== picture) {
                await query(
                    'UPDATE usuarios SET google_id = ?, foto_perfil = ?, verificado = TRUE WHERE id = ?',
                    [googleId, picture, user.id]
                );
                user.google_id = googleId;
                user.foto_perfil = picture;
            }
        } else {
            // Crear nuevo usuario
            const username = email.split('@')[0] + '_' + Date.now().toString().slice(-4);
            const randomPassword = await hashPassword(generateRandomToken(20));
            
            const result = await query(
                `INSERT INTO usuarios (nombre, usuario, correo, contraseña_hash, google_id, foto_perfil, verificado) 
                 VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
                [name, username, email, randomPassword, googleId, picture]
            );
            
            user = {
                id: result.insertId,
                nombre: name,
                usuario: username,
                correo: email,
                rol: 'USUARIO',
                foto_perfil: picture,
                cuenta_activa: true,
                verificado: true
            };
            
            console.log(`✅ Nuevo usuario Google: ${email}`);
        }
        
        // Generar JWT
        const jwtToken = generateJWT(user);
        
        res.cookie('token', jwtToken, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000
        });
        
        res.json(
            successResponse({
                token: jwtToken,
                user: {
                    id: user.id,
                    nombre: user.nombre,
                    usuario: user.usuario,
                    correo: user.correo,
                    rol: user.rol,
                    foto_perfil: user.foto_perfil
                }
            }, 'Inicio de sesión con Google exitoso')
        );
        
    } catch (error) {
        console.error('[Google Login Error]', error);
        res.status(500).json(
            errorResponse('Error al iniciar sesión con Google', 'SERVER_ERROR', 500)
        );
    }
});

// Logout
app.post('/api/auth/logout', authenticate, async (req, res) => {
    try {
        // Revocar refresh token si existe
        if (req.cookies.refreshToken) {
            await query(
                'UPDATE refresh_tokens SET revocado = TRUE WHERE token = ?',
                [req.cookies.refreshToken]
            );
        }
        
        // Limpiar cookies
        res.clearCookie('token', { path: '/' });
        res.clearCookie('refreshToken', { path: '/' });
        
        // Destruir sesión
        req.session.destroy((err) => {
            if (err) console.error('[Session Destroy Error]', err);
        });
        
        console.log(`✅ Logout: Usuario ID ${req.user.id}`);
        
        res.json(successResponse(null, 'Sesión cerrada exitosamente'));
        
    } catch (error) {
        console.error('[Logout Error]', error);
        res.status(500).json(
            errorResponse('Error al cerrar sesión', 'SERVER_ERROR', 500)
        );
    }
});

// ============================================================
// API: USUARIOS
// ============================================================

// Obtener perfil
app.get('/api/users/profile', authenticate, async (req, res) => {
    res.json(successResponse(req.user, 'Perfil obtenido exitosamente'));
});

// Actualizar perfil
app.put('/api/users/profile', authenticate, async (req, res) => {
    try {
        const { nombre, telefono } = req.body;
        
        const updates = [];
        const values = [];
        
        if (nombre) {
            if (nombre.length < 3 || nombre.length > 255) {
                return res.status(400).json(
                    errorResponse('El nombre debe tener entre 3 y 255 caracteres')
                );
            }
            updates.push('nombre = ?');
            values.push(sanitize(nombre));
        }
        
        if (telefono !== undefined) {
            if (telefono && !/^\+?[0-9]{7,15}$/.test(telefono)) {
                return res.status(400).json(
                    errorResponse('Formato de teléfono inválido')
                );
            }
            updates.push('telefono = ?');
            values.push(telefono || null);
        }
        
        if (updates.length === 0) {
            return res.status(400).json(
                errorResponse('No hay datos para actualizar')
            );
        }
        
        values.push(req.user.id);
        
        await query(
            `UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
        
        res.json(successResponse(null, 'Perfil actualizado exitosamente'));
        
    } catch (error) {
        console.error('[Update Profile Error]', error);
        res.status(500).json(
            errorResponse('Error al actualizar perfil', 'SERVER_ERROR', 500)
        );
    }
});

// ============================================================
// API: ADMIN
// ============================================================

// Listar usuarios
app.get('/api/admin/users', authenticate, isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        
        const users = await query(
            `SELECT id, nombre, usuario, correo, telefono, foto_perfil, 
                    rol, fecha_registro, ultimo_acceso, cuenta_activa, verificado 
             FROM usuarios 
             ORDER BY fecha_registro DESC 
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        
        const [countResult] = await query('SELECT COUNT(*) as total FROM usuarios');
        
        res.json(successResponse({
            users,
            pagination: {
                page,
                limit,
                total: countResult.total,
                pages: Math.ceil(countResult.total / limit)
            }
        }));
        
    } catch (error) {
        console.error('[Admin Users Error]', error);
        res.status(500).json(
            errorResponse('Error al obtener usuarios', 'SERVER_ERROR', 500)
        );
    }
});

// ============================================================
// MANEJO DE ERRORES
// ============================================================
app.use((req, res) => {
    res.status(404).json(
        errorResponse(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 'NOT_FOUND', 404)
    );
});

app.use((err, req, res, next) => {
    console.error('[Server Error]', err);
    res.status(500).json(
        errorResponse('Error interno del servidor', 'SERVER_ERROR', 500)
    );
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================
const startServer = async () => {
    // Probar conexión a BD
    const dbOk = await testConnection();
    
    if (!dbOk) {
        console.log('⚠️  El servidor iniciará pero sin conexión a base de datos');
        console.log('   Ejecuta: mysql -u root -p < backend/database/schema.sql');
    }
    
    app.listen(PORT, () => {
        console.log('');
        console.log('════════════════════════════════════════');
        console.log('  🎬 AndyAxcel Server');
        console.log(`  📍 URL: http://localhost:${PORT}`);
        console.log(`  🔧 Ambiente: ${process.env.NODE_ENV || 'development'}`);
        console.log(`  🗄️  Base de datos: ${dbOk ? '✅ Conectada' : '❌ Desconectada'}`);
        console.log('════════════════════════════════════════');
        console.log('');
    });
};

startServer();

module.exports = app;
