/**
 * ============================================================
 * ANDYAXCEL - JAVASCRIPT PRINCIPAL
 * ============================================================
 */

// ============================================================
// CONFIGURACION
// ============================================================
const CONFIG = {
    API_URL: window.location.origin + '/api',
    TOKEN_KEY: 'token',
    USER_KEY: 'userData',
    REFRESH_TOKEN_KEY: 'refreshToken',
    SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 horas
};

// ============================================================
// GESTOR DE COOKIES
// ============================================================
const CookieManager = {
    set(name, value, days = 7) {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
    },
    
    get(name) {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : null;
    },
    
    delete(name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    },
    
    exists(name) {
        return this.get(name) !== null;
    }
};

// ============================================================
// GESTOR DE ALMACENAMIENTO LOCAL
// ============================================================
const StorageManager = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Error guardando en localStorage:', e);
            return false;
        }
    },
    
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Error leyendo de localStorage:', e);
            return defaultValue;
        }
    },
    
    remove(key) {
        localStorage.removeItem(key);
    },
    
    clear() {
        localStorage.clear();
    }
};

// ============================================================
// GESTOR DE SESION
// ============================================================
const SessionManager = {
    isAuthenticated() {
        return CookieManager.exists(CONFIG.TOKEN_KEY);
    },
    
    getToken() {
        return CookieManager.get(CONFIG.TOKEN_KEY);
    },
    
    getUserData() {
        return StorageManager.get(CONFIG.USER_KEY);
    },
    
    setSession(token, userData) {
        CookieManager.set(CONFIG.TOKEN_KEY, token, 1);
        StorageManager.set(CONFIG.USER_KEY, userData);
    },
    
    clearSession() {
        CookieManager.delete(CONFIG.TOKEN_KEY);
        CookieManager.delete(CONFIG.REFRESH_TOKEN_KEY);
        StorageManager.remove(CONFIG.USER_KEY);
        sessionStorage.clear();
    },
    
    isAdmin() {
        const userData = this.getUserData();
        return userData && userData.rol === 'ADMIN';
    },
    
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    },
    
    requireAdmin() {
        if (!this.requireAuth()) return false;
        if (!this.isAdmin()) {
            window.location.href = '/index.html';
            return false;
        }
        return true;
    }
};

// ============================================================
// GESTOR DE API
// ============================================================
const ApiManager = {
    async request(endpoint, options = {}) {
        const token = SessionManager.getToken();
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        };
        
        if (token) {
            defaultOptions.headers['Authorization'] = `Bearer ${token}`;
        }
        
        const config = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };
        
        try {
            const response = await fetch(`${CONFIG.API_URL}${endpoint}`, config);
            const data = await response.json();
            
            if (!response.ok) {
                // Si es error de autenticación, limpiar sesión
                if (response.status === 401) {
                    SessionManager.clearSession();
                    window.location.href = '/login.html';
                }
                
                throw new Error(data.error?.message || data.error || 'Error en la petición');
            }
            
            return data;
        } catch (error) {
            console.error(`[API Error] ${endpoint}:`, error);
            throw error;
        }
    },
    
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },
    
    post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};

// ============================================================
// GESTOR DE UI
// ============================================================
const UIManager = {
    showToast(message, type = 'info', duration = 3000) {
        // Crear contenedor si no existe
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(container);
        }
        
        // Colores según tipo
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        
        // Crear toast
        const toast = document.createElement('div');
        toast.style.cssText = `
            background-color: white;
            color: #333;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-left: 4px solid ${colors[type] || colors.info};
            min-width: 300px;
            max-width: 400px;
            animation: slideIn 0.3s ease;
            font-size: 0.95rem;
        `;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        // Eliminar después del tiempo
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },
    
    showLoading() {
        let loader = document.getElementById('global-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'global-loader';
            loader.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.3);
                z-index: 9998;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            loader.innerHTML = '<div style="background:white;padding:20px;border-radius:10px;">Cargando...</div>';
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
    },
    
    hideLoading() {
        const loader = document.getElementById('global-loader');
        if (loader) loader.style.display = 'none';
    },
    
    showModal(title, content, onConfirm) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 9997;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        modal.innerHTML = `
            <div style="background:white;padding:24px;border-radius:12px;max-width:500px;width:90%;">
                <h3>${title}</h3>
                <p>${content}</p>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
                    <button class="btn btn-outline" id="modal-cancel">Cancelar</button>
                    <button class="btn btn-primary" id="modal-confirm">Confirmar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('modal-cancel').onclick = () => modal.remove();
        document.getElementById('modal-confirm').onclick = () => {
            if (onConfirm) onConfirm();
            modal.remove();
        };
        
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
    },
    
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
};

// ============================================================
// VALIDADORES
// ============================================================
const Validators = {
    email(email) {
        const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return re.test(email);
    },
    
    isGmail(email) {
        return email.endsWith('@gmail.com') || email.endsWith('@googlemail.com');
    },
    
    password(password) {
        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };
        
        return {
            isValid: Object.values(checks).every(Boolean),
            checks,
            score: Object.values(checks).filter(Boolean).length
        };
    },
    
    username(username) {
        return /^[a-zA-Z0-9._-]{3,50}$/.test(username);
    },
    
    phone(phone) {
        if (!phone) return true;
        return /^\+?[0-9]{7,15}$/.test(phone);
    },
    
    fullName(name) {
        return name && name.length >= 3 && name.length <= 255;
    }
};

// ============================================================
// FUNCIONES DE AUTENTICACION
// ============================================================
const Auth = {
    async login(email, password, remember = false) {
        const response = await ApiManager.post('/auth/login', {
            correo: email,
            contraseña: password,
            recordar: remember
        });
        
        if (response.success && response.data.token) {
            SessionManager.setSession(response.data.token, response.data.user);
            return response.data;
        }
        
        return null;
    },
    
    async register(userData) {
        const response = await ApiManager.post('/auth/register', userData);
        return response;
    },
    
    async loginWithGoogle(token) {
        const response = await ApiManager.post('/auth/google', { token });
        
        if (response.success && response.data.token) {
            SessionManager.setSession(response.data.token, response.data.user);
            return response.data;
        }
        
        return null;
    },
    
    async logout() {
        try {
            await ApiManager.post('/auth/logout');
        } catch (error) {
            console.error('Error en logout:', error);
        } finally {
            SessionManager.clearSession();
            window.location.href = '/login.html';
        }
    },
    
    async getProfile() {
        return await ApiManager.get('/users/profile');
    }
};

// ============================================================
// INICIALIZACION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 AndyAxcel inicializado');
    
    // Verificar sesión
    if (SessionManager.isAuthenticated()) {
        console.log('✅ Usuario autenticado');
    }
    
    // Manejar clics en enlaces de logout
    document.querySelectorAll('[data-action="logout"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });
    });
});

// ============================================================
// EXPORTAR (para uso modular si es necesario)
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONFIG,
        CookieManager,
        StorageManager,
        SessionManager,
        ApiManager,
        UIManager,
        Validators,
        Auth
    };
}

console.log('📦 AndyAxcel JS cargado correctamente');
