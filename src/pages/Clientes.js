import { getStore, saveStore } from '../state/store.js';
import { uid, formatMoney } from '../utils/helpers.js';

export function renderClientes(container) {
  const store = getStore();

  const renderList = (q = '') => {
    const list = store.clientes.filter(c => !q || c.nombre.toLowerCase().includes(q.toLowerCase()));
    
    if (!list.length) {
      return `<div class="empty-state">
        <i class="ri-user-search-line"></i>
        <div>No se encontraron clientes</div>
      </div>`;
    }

    return `
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Contacto</th>
              <th>Operaciones</th>
              <th>Deuda</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(c => {
              const comp = store.compras.filter(x => x.clienteId === c.id);
              const pres = store.prestamos.filter(x => x.clienteId === c.id);
              const pend = pres.reduce((a,p) => a + p.cuotas.filter(cu => !cu.pagada).length * p.montoCuota, 0) + 
                           comp.reduce((a,x) => a + x.cuotas.filter(cu => !cu.pagada).length * x.montoCuota, 0);
              
              return `
                <tr>
                  <td>
                    <div style="font-weight: 600">${c.nombre}</div>
                    ${c.notas ? `<div class="text-xs text-muted mt-2">${c.notas}</div>` : ''}
                  </td>
                  <td>
                    <div class="text-sm">${c.tel || '—'}</div>
                    ${c.email ? `<div class="text-xs text-muted">${c.email}</div>` : ''}
                  </td>
                  <td>
                    <div class="flex gap-2">
                      <span class="badge badge-info" title="Compras"><i class="ri-shopping-bag-line" style="margin-right:4px"></i>${comp.length}</span>
                      <span class="badge badge-success" title="Préstamos"><i class="ri-exchange-dollar-line" style="margin-right:4px"></i>${pres.length}</span>
                    </div>
                  </td>
                  <td class="text-accent" style="font-weight: 700">
                    ${pend > 0 ? formatMoney(pend) : '—'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Clientes</h1>
      <button class="btn btn-acc desktop-only" id="btn-add-cliente">
        <i class="ri-user-add-line"></i> Nuevo Cliente
      </button>
    </div>

    <div class="card mb-4" style="padding: 1rem">
      <div style="position: relative;">
        <i class="ri-search-line" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted)"></i>
        <input type="text" id="search-clientes" class="input-control" placeholder="Buscar cliente..." style="padding-left: 36px">
      </div>
    </div>

    <div class="card" style="padding: 1rem" id="clientes-list-container">
      ${renderList()}
    </div>

    <!-- Modal Formulario -->
    <div id="modal-cliente" class="modal-overlay">
      <div class="modal-content">
        <div class="flex justify-between items-center mb-4">
          <h2>Nuevo Cliente</h2>
          <button class="btn-icon" onclick="window.closeModal('modal-cliente')"><i class="ri-close-line"></i></button>
        </div>
        <div class="form-grid" style="grid-template-columns: 1fr;">
          <div class="form-group">
            <label>Nombre Completo</label>
            <input type="text" id="cl-nombre" class="input-control" placeholder="Ej: Juan García">
          </div>
          <div class="form-group">
            <label>Teléfono</label>
            <input type="text" id="cl-tel" class="input-control" placeholder="Ej: 341 555 1234">
          </div>
          <div class="form-group">
            <label>Email (Opcional)</label>
            <input type="email" id="cl-email" class="input-control" placeholder="juan@email.com">
          </div>
          <div class="form-group">
            <label>Notas (Opcional)</label>
            <input type="text" id="cl-notas" class="input-control" placeholder="Observaciones extras...">
          </div>
        </div>
        <div class="flex gap-3 justify-end mt-6">
          <button class="btn btn-secondary" onclick="window.closeModal('modal-cliente')">Cancelar</button>
          <button class="btn btn-acc" id="btn-save-cliente">Guardar Cliente</button>
        </div>
      </div>
    </div>
  `;

  // Suscribirse al botón global (header móvil) + botón desktop
  const handleOpenModal = () => window.openModal('modal-cliente');
  
  if (document.getElementById('btn-add-cliente')) {
    document.getElementById('btn-add-cliente').addEventListener('click', handleOpenModal);
  }
  
  // Custom listener temporal
  const globalListener = (e) => {
    if (e.detail === 'clientes') handleOpenModal();
  };
  window.addEventListener('global-add-click', globalListener);

  // Búsqueda
  document.getElementById('search-clientes').addEventListener('input', (e) => {
    document.getElementById('clientes-list-container').innerHTML = renderList(e.target.value);
  });

  // Guardar
  document.getElementById('btn-save-cliente').addEventListener('click', () => {
    const nombre = document.getElementById('cl-nombre').value.trim();
    if (!nombre) {
      alert('El nombre es obligatorio');
      return;
    }
    
    store.clientes.push({
      id: uid(),
      nombre,
      tel: document.getElementById('cl-tel').value.trim(),
      email: document.getElementById('cl-email').value.trim(),
      notas: document.getElementById('cl-notas').value.trim()
    });
    
    saveStore();
    window.closeModal('modal-cliente');
    document.getElementById('clientes-list-container').innerHTML = renderList(document.getElementById('search-clientes').value);
  });
}
