/**
 * ============================================================
 * ANDYAXCEL - JAVASCRIPT PRINCIPAL
 * ============================================================
 */

// ============================================================
// CONFIGURACION
// ============================================================
const CONFIG = {
    API_URL: '/api',
    TOKEN_KEY: 'token',
    USER_KEY: 'userData'
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
        } catch(e) {
            console.error('Error guardando:', e);
            return false;
        }
    },
    
    get(key, def = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : def;
        } catch(e) {
            return def;
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
    isLoggedIn() {
        return CookieManager.exists(CONFIG.TOKEN_KEY);
    },
    
    getToken() {
        return CookieManager.get(CONFIG.TOKEN_KEY);
    },
    
    getUser() {
        return StorageManager.get(CONFIG.USER_KEY);
    },
    
    saveSession(token, user) {
        CookieManager.set(CONFIG.TOKEN_KEY, token, 1);
        StorageManager.set(CONFIG.USER_KEY, user);
    },
    
    clearSession() {
        CookieManager.delete(CONFIG.TOKEN_KEY);
        StorageManager.remove(CONFIG.USER_KEY);
        sessionStorage.clear();
    },
    
    isAdmin() {
        const user = this.getUser();
        return user && user.rol === 'ADMIN';
    },
    
    redirectIfNotLoggedIn() {
        if (!this.isLoggedIn()) {
            window.location.href = '/login.html';
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
        
        const config = {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            ...options
        };
        
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }
        
        try {
            const response = await fetch(`${CONFIG.API_URL}${endpoint}`, config);
            const data = await response.json();
            
            if (!response.ok) {
                if (response.status === 401) {
                    SessionManager.clearSession();
                    window.location.href = '/login.html';
                }
                throw new Error(data.error || 'Error en la petición');
            }
            
            return data;
        } catch(error) {
            console.error(`[API Error] ${endpoint}:`, error);
            throw error;
        }
    },
    
    get(endpoint) { return this.request(endpoint, { method: 'GET' }); },
    post(endpoint, body) { return this.request(endpoint, { method: 'POST', body }); },
    put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body }); },
    delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
};

// ============================================================
// GESTOR DE UI
// ============================================================
const UIManager = {
    showToast(message, type = 'info', duration = 3000) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = `
                position: fixed; top: 20px; right: 20px; z-index: 9999;
                display: flex; flex-direction: column; gap: 10px;
            `;
            document.body.appendChild(container);
        }
        
        const colors = { success: '#28a745', error: '#dc3545', warning: '#ffc107', info: '#17a2b8' };
        
        const toast = document.createElement('div');
        toast.style.cssText = `
            background: white; color: #333; padding: 12px 20px;
            border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-left: 4px solid ${colors[type] || colors.info};
            min-width: 300px; max-width: 400px;
            animation: slideInRight 0.3s ease;
        `;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },
    
    showLoading() {
        let loader = document.getElementById('global-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'global-loader';
            loader.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.3); z-index: 9998;
                display: flex; align-items: center; justify-content: center;
            `;
            loader.innerHTML = `
                <div style="background:white;padding:20px 40px;border-radius:12px;text-align:center;">
                    <div style="font-size:2rem;">⏳</div>
                    <p>Cargando...</p>
                </div>
            `;
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
    },
    
    hideLoading() {
        const loader = document.getElementById('global-loader');
        if (loader) loader.style.display = 'none';
    },
    
    showModal(title, message, onConfirm) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 9997;
            display: flex; align-items: center; justify-content: center;
        `;
        
        modal.innerHTML = `
            <div style="background:white;padding:30px;border-radius:16px;max-width:450px;width:90%;">
                <h3>${title}</h3>
                <p style="margin:15px 0;">${message}</p>
                <div style="display:flex;gap:10px;justify-content:flex-end;">
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
        
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    },
    
    formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('es-ES', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }
};

// ============================================================
// VALIDADORES
// ============================================================
const Validators = {
    email(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },
    
    isGmail(email) {
        return email.endsWith('@gmail.com');
    },
    
    password(pass) {
        return {
            isValid: pass.length >= 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass) && /[!@#$%^&*]/.test(pass),
            length: pass.length >= 8,
            upper: /[A-Z]/.test(pass),
            number: /[0-9]/.test(pass),
            special: /[!@#$%^&*]/.test(pass)
        };
    },
    
    username(user) {
        return /^[a-zA-Z0-9._-]{3,50}$/.test(user);
    },
    
    phone(phone) {
        if (!phone) return true;
        return /^\+?[0-9]{7,15}$/.test(phone);
    }
};

// ============================================================
// INICIALIZACION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 AndyAxcel JS inicializado');
    console.log(`📍 API: ${CONFIG.API_URL}`);
    console.log(`🔑 Autenticado: ${SessionManager.isLoggedIn() ? 'Sí' : 'No'}`);
});

// Agregar animaciones CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

console.log('✅ AndyAxcel JS cargado correctamente');
