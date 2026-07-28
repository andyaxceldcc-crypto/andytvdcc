const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isGmail = (email) => email.endsWith('@gmail.com');
const isStrongPassword = (password) => {
    return {
        isValid: password.length >= 8 &&
            /[A-Z]/.test(password) &&
            /[a-z]/.test(password) &&
            /[0-9]/.test(password) &&
            /[!@#$%^&*(),.?":{}|<>]/.test(password),
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
};
const isValidUsername = (username) => /^[a-zA-Z0-9._-]{3,50}$/.test(username);
const isValidPhone = (phone) => !phone || /^\+?[0-9]{7,15}$/.test(phone);
const sanitize = (text) => text.replace(/[<>]/g, '');

module.exports = { isValidEmail, isGmail, isStrongPassword, isValidUsername, isValidPhone, sanitize };
