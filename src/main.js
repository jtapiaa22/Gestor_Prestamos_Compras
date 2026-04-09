import { initStore, subscribe } from './state/store.js';
import { renderDashboard } from './pages/Dashboard.js';
import { renderClientes } from './pages/Clientes.js';
import { renderCompras } from './pages/Compras.js';
import { renderPrestamos } from './pages/Prestamos.js';
import { renderConfiguracion } from './pages/Configuracion.js';

const routes = {
  'dashboard': { icon: 'ri-dashboard-fill', label: 'Inicio', render: renderDashboard },
  'clientes': { icon: 'ri-group-fill', label: 'Clientes', render: renderClientes },
  'compras': { icon: 'ri-shopping-bag-3-fill', label: 'Compras', render: renderCompras },
  'prestamos': { icon: 'ri-exchange-dollar-line', label: 'Préstamos', render: renderPrestamos },
  'config': { icon: 'ri-settings-4-fill', label: 'Ajustes', render: renderConfiguracion }
};

let currentRoute = 'dashboard';

async function initApp() {
  // Renderizar feedback visual de carga si se desea (opcional)
  const container = document.getElementById('view-container');
  if (container) container.innerHTML = '<div class="empty-state"><i class="ri-loader-4-line" style="animation: spin 1s linear infinite;"></i><div>Conectando con Servidor...</div></div>';
  
  await initStore();
  setupNavigation();
  navigate('dashboard');
  
  // Suscribirse a cambios del store para re-renderizar la vista activa
  subscribe(() => {
    const container = document.getElementById('view-container');
    if (container && routes[currentRoute]) {
      routes[currentRoute].render(container);
    }
  });

  // Setup un botón global de "añadir" en header móvil que ejecuta acciones de la vista actual
  document.getElementById('btn-add-global').addEventListener('click', () => {
    const event = new CustomEvent('global-add-click', { detail: currentRoute });
    window.dispatchEvent(event);
  });
}

function setupNavigation() {
  const desktopNav = document.querySelector('.desktop-nav');
  const bottomNav = document.querySelector('.bottom-nav');
  
  let desktopHtml = '';
  let bottomHtml = '';
  
  Object.keys(routes).forEach(key => {
    const route = routes[key];
    const tpl = `<button class="nav-item ${key === currentRoute ? 'active' : ''}" data-route="${key}">
      <i class="${route.icon}"></i>
      <span>${route.label}</span>
    </button>`;
    
    desktopHtml += tpl;
    bottomHtml += tpl;
  });
  
  desktopNav.innerHTML = desktopHtml;
  bottomNav.innerHTML = bottomHtml;
  
  const setupListeners = () => {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const route = e.currentTarget.dataset.route;
        navigate(route);
      });
    });
  };
  
  setupListeners();
}

export function navigate(route) {
  if (!routes[route]) return;
  currentRoute = route;
  
  // Actualizar estado activo en los botones de navegación
  document.querySelectorAll('.nav-item').forEach(btn => {
    if (btn.dataset.route === route) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Limpiar y renderizar la nueva vista
  const container = document.getElementById('view-container');
  routes[route].render(container);
}

// Helpers globales para modals
window.openModal = function(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
};
window.closeModal = function(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
};

document.addEventListener('DOMContentLoaded', initApp);
