const UIManager = {
    showToast(message, type = 'info', duration = 3000) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
            document.body.appendChild(container);
        }
        const colors = { success: '#28a745', error: '#dc3545', warning: '#ffc107', info: '#17a2b8' };
        const toast = document.createElement('div');
        toast.style.cssText = `background:white;padding:12px 20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);border-left:4px solid ${colors[type]};animation:slideInRight 0.3s ease;`;
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
            loader.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.3);z-index:9998;display:flex;align-items:center;justify-content:center;';
            loader.innerHTML = '<div style="background:white;padding:20px;border-radius:10px;">Cargando...</div>';
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
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9997;display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `
            <div style="background:white;padding:24px;border-radius:12px;max-width:400px;width:90%;">
                <h3>${title}</h3>
                <p>${message}</p>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
                    <button class="btn btn-outline" id="modal-cancel">Cancelar</button>
                    <button class="btn btn-primary" id="modal-confirm">Confirmar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('modal-cancel').onclick = () => modal.remove();
        document.getElementById('modal-confirm').onclick = () => { if (onConfirm) onConfirm(); modal.remove(); };
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    }
};
// Agregar animaciones necesarias si no están en animations.css
if (!document.getElementById('ui-animations')) {
    const style = document.createElement('style');
    style.id = 'ui-animations';
    style.textContent = `@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes slideOutRight{from{transform:translateX(0);opacity:1}to{transform:translateX(100%);opacity:0}}`;
    document.head.appendChild(style);
}
