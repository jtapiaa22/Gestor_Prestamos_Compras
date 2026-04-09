import { getStore, saveStore } from '../state/store.js';
import { uid, formatMoney, isVencida, isPronto, addCuotasVencimiento, formatFecha, getTasaInterpolada } from '../utils/helpers.js';

function getNombreCliente(store, id) {
  const c = store.clientes.find(x => x.id === id);
  return c ? c.nombre : 'Desconocido';
}

window.__toggleCuotaPrestamo = function(pid, idx) {
  const store = getStore();
  const p = store.prestamos.find(x => x.id === pid);
  if (p) {
    p.cuotas[idx].pagada = !p.cuotas[idx].pagada;
    saveStore();
    window.__verDetallePrestamo(pid);
  }
};

window.__eliminarPrestamo = function(id) {
  if (confirm('¿Estás seguro de eliminar este préstamo?')) {
    const store = getStore();
    store.prestamos = store.prestamos.filter(x => x.id !== id);
    saveStore();
    const event = new Event('re-render-prestamos');
    window.dispatchEvent(event);
  }
};

window.__verDetallePrestamo = function(id) {
  const store = getStore();
  const p = store.prestamos.find(x => x.id === id);
  if (!p) return;
  
  const el = document.getElementById('modal-prestamo-content');
  if (!el) return;
  
  el.innerHTML = `
    <h3>Préstamo • ${getNombreCliente(store, p.clienteId)}</h3>
    <div class="text-xs text-muted mb-4">${p.ncuotas} Cuotas • ${p.tasa}% de Interés</div>
    
    <div class="flex flex-col gap-2 mb-6" style="background: var(--bg-elevated); padding: 12px; border-radius: 8px;">
      <div class="flex justify-between"><span>Capital:</span><span>${formatMoney(p.monto)}</span></div>
      <div class="flex justify-between"><span>Total a Devolver:</span><span class="text-accent">${formatMoney(p.totalDevolver)}</span></div>
      <div class="flex justify-between"><span>Ganancia Neta:</span><span class="text-success">${formatMoney(p.ganancia)}</span></div>
    </div>
    
    <div class="flex-col gap-2">
      ${p.cuotas.map(cu => {
        const ven = isVencida(cu.vence) && !cu.pagada;
        const pronto = isPronto(cu.vence) && !cu.pagada;
        return `
        <div class="flex items-center gap-3 p-2 border-b border-color" style="border-bottom: 1px solid var(--border-color)">
          <div style="width:28px; height:28px; border-radius:50%; background:${cu.pagada ? 'var(--success)' : ven ? 'var(--danger)' : 'var(--bg-elevated)'}; color:${cu.pagada || ven ? '#fff' : 'inherit'}; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700;">
            ${cu.num}
          </div>
          <div style="flex:1; ${cu.pagada ? 'text-decoration:line-through; color:var(--text-muted)' : ven ? 'color:var(--danger)' : pronto ? 'color:var(--accent-color)' : ''}">
            ${formatFecha(cu.vence)}
          </div>
          <div class="text-accent font-bold">${formatMoney(p.montoCuota)}</div>
          <button class="btn-icon ${cu.pagada ? '' : 'btn-acc'}" style="${cu.pagada ? 'background: var(--bg-elevated)' : ''}" onclick="window.__toggleCuotaPrestamo('${id}', ${cu.num - 1})">
            <i class="${cu.pagada ? 'ri-arrow-go-back-line' : 'ri-check-line'}"></i>
          </button>
        </div>
        `;
      }).join('')}
    </div>
  `;
  window.openModal('modal-prestamo');
};

export function renderPrestamos(container) {
  const store = getStore();

  const renderHistorial = () => {
    if (!store.prestamos.length) {
      return `<div class="empty-state"><i class="ri-exchange-dollar-line"></i><div>No hay préstamos activos</div></div>`;
    }

    return store.prestamos.map(p => {
      const pagadas = p.cuotas.filter(x => x.pagada).length;
      const pct = Math.round((pagadas / p.ncuotas) * 100);
      const venc = p.cuotas.filter(x => !x.pagada && isVencida(x.vence)).length;
      
      const estado = pct === 100 ? 'badge-success' : venc > 0 ? 'badge-danger' : 'badge-info';
      const estadoLabel = pct === 100 ? 'Saldado' : venc > 0 ? `${venc} vencida(s)` : 'Al día';
      
      return `
        <div class="card mb-4">
          <div class="flex justify-between items-start mb-3">
            <div>
              <div style="font-weight: 600">${getNombreCliente(store, p.clienteId)}</div>
              <div class="mt-1"><span class="badge ${estado}">${estadoLabel}</span></div>
            </div>
            <div class="flex gap-2">
              <button class="btn-icon btn-acc" style="width: 30px; height: 30px;" onclick="window.__verDetallePrestamo('${p.id}')"><i class="ri-eye-line"></i></button>
              <button class="btn-icon" style="width: 30px; height: 30px; color: var(--danger)" onclick="window.__eliminarPrestamo('${p.id}')"><i class="ri-delete-bin-line"></i></button>
            </div>
          </div>
          
          <div class="flex justify-between flex-wrap gap-2 text-sm mb-3" style="background: var(--bg-elevated); padding: 8px 12px; border-radius: 6px;">
            <span>Capital: <b>${formatMoney(p.monto)}</b></span>
            <span>Tasa: <b>${p.tasa}%</b></span>
            <span>Total: <b class="text-accent">${formatMoney(p.totalDevolver)}</b></span>
            <span>Por Cuota: <b>${formatMoney(p.montoCuota)}</b></span>
          </div>
          
          <div class="flex justify-between text-xs text-muted mb-1">
            <span>${pagadas}/${p.ncuotas} Cuotas</span>
            <span>${pct}%</span>
          </div>
          <div class="progress-bg">
            <div class="progress-bar ${pct === 100 ? 'complete' : ''}" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');
  };

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Préstamos</h1>
      <button class="btn btn-acc desktop-only" id="btn-add-prestamo">
        <i class="ri-add-line"></i> Nuevo Préstamo
      </button>
    </div>

    <div id="prestamos-list-container">
      ${renderHistorial()}
    </div>

    <!-- Modal Formulario -->
    <div id="modal-new-prestamo" class="modal-overlay">
      <div class="modal-content">
        <div class="flex justify-between items-center mb-4">
          <h2>Nuevo Préstamo</h2>
          <button class="btn-icon" onclick="window.closeModal('modal-new-prestamo')"><i class="ri-close-line"></i></button>
        </div>
        
        <div class="form-grid">
          <div class="form-group" style="grid-column: 1 / -1;">
            <label>Cliente</label>
            <select id="p-cliente" class="input-control">
              ${store.clientes.length === 0 ? '<option value="">Sin clientes</option>' : store.clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Monto Prestado ($)</label>
            <input type="number" id="p-monto" class="input-control" placeholder="0" min="0">
          </div>
          <div class="form-group">
            <label>Cant. de Cuotas</label>
            <select id="p-ncuotas" class="input-control">
              <option value="1">1 cuota</option>
              <option value="2">2 cuotas</option>
              <option value="3">3 cuotas</option>
              <option value="6">6 cuotas</option>
              <option value="9">9 cuotas</option>
              <option value="12">12 cuotas</option>
              <option value="18">18 cuotas</option>
              <option value="24">24 cuotas</option>
            </select>
          </div>
          <div class="form-group" style="grid-column: 1 / -1;">
            <label>Fecha 1er Vencimiento</label>
            <input type="date" id="p-fecha1" class="input-control" value="${new Date().toISOString().split('T')[0]}">
          </div>
        </div>
        
        <div id="p-preview" class="mb-4"></div>
        
        <div class="flex gap-3 justify-end mt-4">
          <button class="btn btn-secondary" onclick="window.closeModal('modal-new-prestamo')">Cancelar</button>
          <button class="btn btn-acc" id="btn-save-prestamo">Guardar</button>
        </div>
      </div>
    </div>

    <!-- Modal Detalle Préstamo -->
    <div id="modal-prestamo" class="modal-overlay">
      <div class="modal-content">
        <div class="flex justify-end">
          <button class="btn-icon" onclick="window.closeModal('modal-prestamo'); const ev=new Event('re-render-prestamos'); window.dispatchEvent(ev);"><i class="ri-close-line"></i></button>
        </div>
        <div id="modal-prestamo-content"></div>
      </div>
    </div>
  `;

  const calcPreview = () => {
    const m = parseFloat(document.getElementById('p-monto').value) || 0;
    const n = parseInt(document.getElementById('p-ncuotas').value) || 1;
    
    const tasa = store.tasas[n] !== undefined ? store.tasas[n] : getTasaInterpolada(store.tasas, n);
    const totalDev = m * (1 + tasa / 100);
    const montoCuota = totalDev / n;
    const gan = totalDev - m;
    
    const el = document.getElementById('p-preview');
    if(!m) { el.innerHTML = ''; return; }
    
    el.innerHTML = `
      <div style="background: var(--success-glow); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 12px; font-size: 0.8rem; display: flex; flex-direction: column; gap: 8px;">
        <div class="flex justify-between"><span>Tasa Aplicada:</span><span class="text-accent">${tasa}%</span></div>
        <div class="flex justify-between"><span>Total a Devolver:</span><span class="text-accent" style="font-weight:700">${formatMoney(totalDev)}</span></div>
        <div class="flex justify-between"><span>Monto por Cuota:</span><span>${formatMoney(montoCuota)}</span></div>
        <div class="flex justify-between"><span>Ganancia Neta:</span><span class="text-success">${formatMoney(gan)}</span></div>
      </div>`;
  };

  document.getElementById('p-monto').addEventListener('input', calcPreview);
  document.getElementById('p-ncuotas').addEventListener('change', calcPreview);

  const handleOpenModal = () => window.openModal('modal-new-prestamo');
  
  if (document.getElementById('btn-add-prestamo')) {
    document.getElementById('btn-add-prestamo').addEventListener('click', handleOpenModal);
  }
  
  const globalListener = (e) => { if (e.detail === 'prestamos') handleOpenModal(); };
  window.addEventListener('global-add-click', globalListener);
  
  window.addEventListener('re-render-prestamos', () => {
    const listContainer = document.getElementById('prestamos-list-container');
    if (listContainer) listContainer.innerHTML = renderHistorial();
  });

  document.getElementById('btn-save-prestamo').addEventListener('click', () => {
    const cid = document.getElementById('p-cliente').value;
    const m = parseFloat(document.getElementById('p-monto').value) || 0;
    const n = parseInt(document.getElementById('p-ncuotas').value) || 1;
    const fecha1 = document.getElementById('p-fecha1').value;
    
    if(!m || !fecha1 || !cid) {
      alert('Por favor, completá todos los campos obligatorios.');
      return;
    }
    
    const tasa = store.tasas[n] !== undefined ? store.tasas[n] : getTasaInterpolada(store.tasas, n);
    const totalDev = m * (1 + tasa / 100);
    const montoCuota = totalDev / n;
    const cuotas = addCuotasVencimiento(fecha1, n);
    
    store.prestamos.push({
      id: uid(),
      clienteId: cid,
      monto: m,
      ncuotas: n,
      tasa,
      totalDevolver: totalDev,
      montoCuota,
      ganancia: totalDev - m,
      cuotas,
      fecha: new Date().toISOString().split('T')[0]
    });
    
    saveStore();
    window.closeModal('modal-new-prestamo');
    document.getElementById('p-monto').value = '';
    document.getElementById('p-ncuotas').value = '1';
    document.getElementById('p-preview').innerHTML = '';
    
    document.getElementById('prestamos-list-container').innerHTML = renderHistorial();
  });
}
