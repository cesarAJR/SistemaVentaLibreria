/**
 * CONTROLADOR PRINCIPAL Y ENRUTADOR (APP)
 * Coordinación de pestañas, notificaciones toast y verificación de estado.
 */

const App = {
  activeTab: 'section-pos',

  init() {
    this.cacheDOM();
    this.bindEvents();
    this.checkSystemHealth();

    // Inicializar módulos hijos
    POS.init();
    Stats.init();
    Inventory.init();
  },

  cacheDOM() {
    this.navButtons = document.querySelectorAll('.nav-btn');
    this.sections = document.querySelectorAll('.module-section');
    this.statusIndicatorText = document.getElementById('system-status-text');
    this.toastContainer = document.getElementById('toast-container');
    this.brandHome = document.getElementById('brand-home');
  },

  bindEvents() {
    // Cambio de pestañas
    this.navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        this.switchTab(targetId);
      });
    });

    if (this.brandHome) {
      this.brandHome.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchTab('section-pos');
      });
    }
  },

  switchTab(targetSectionId) {
    this.activeTab = targetSectionId;

    // Actualizar botones de navegación
    this.navButtons.forEach(btn => {
      if (btn.dataset.target === targetSectionId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Actualizar secciones
    this.sections.forEach(sec => {
      if (sec.id === targetSectionId) {
        sec.classList.add('active');
      } else {
        sec.classList.remove('active');
      }
    });

    // Si entra a estadísticas, refrescar gráficos
    if (targetSectionId === 'section-stats') {
      Stats.loadStats();
    } else if (targetSectionId === 'section-inventory') {
      Inventory.loadProducts();
    }
  },

  async checkSystemHealth() {
    try {
      const health = await API.getHealth();
      if (health && health.status === 'online') {
        const isCloud = health.storage_mode.includes('Supabase Cloud');
        this.statusIndicatorText.textContent = isCloud ? 'Supabase Activo' : 'Base Local / Supabase Ready';
        this.statusIndicatorText.parentElement.title = `Modo: ${health.storage_mode}`;
      }
    } catch (e) {
      this.statusIndicatorText.textContent = 'Modo Offline';
    }
  },

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `
      <span style="font-size: 1.1rem;">${icon}</span>
      <span style="flex: 1;">${message}</span>
    `;

    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
