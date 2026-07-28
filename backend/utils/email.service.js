const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const sendVerificationEmail = async (to, name, token) => {
    const url = `${process.env.APP_URL}/api/auth/verify-email?token=${token}`;
    await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject: 'Verifica tu cuenta en AndyAxcel',
        html: `<h1>Hola ${name}</h1><p>Haz clic <a href="${url}">aquí</a> para verificar tu cuenta.</p>`
    });
};

const sendPasswordResetEmail = async (to, name, token) => {
    const url = `${process.env.APP_URL}/api/auth/reset-password?token=${token}`;
    await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject: 'Restablece tu contraseña - AndyAxcel',
        html: `<h1>Hola ${name}</h1><p>Haz clic <a href="${url}">aquí</a> para restablecer tu contraseña.</p>`
    });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
