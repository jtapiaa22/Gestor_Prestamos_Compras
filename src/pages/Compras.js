import { getStore, saveStore, addCompra, updateCompra, removeCompra } from '../state/store.js';
import { uid, formatMoney, isVencida, isPronto, addCuotasVencimiento, formatFecha, formatCurrencyInput, parseCurrencyInput } from '../utils/helpers.js';

function getNombreCliente(store, id) {
  const c = store.clientes.find(x => x.id === id);
  return c ? c.nombre : 'Desconocido';
}

// Para que el scope global funcione en los botones renderizados como string html
window.__toggleCuotaCompra = async function (cid, idx) {
  const store = getStore();
  const c = store.compras.find(x => x.id === cid);
  if (c) {
    c.cuotas[idx].pagada = !c.cuotas[idx].pagada;
    await updateCompra(c);
    window.__verDetalleCompra(cid); // re-render modal
  }
};

window.__eliminarCompra = async function (id) {
  if (confirm('¿Estás seguro de eliminar esta compra?')) {
    await removeCompra(id);
    const event = new Event('re-render-compras');
    window.dispatchEvent(event);
  }
};

window.__verDetalleCompra = function (id) {
  const store = getStore();
  const c = store.compras.find(x => x.id === id);
  if (!c) return;

  const el = document.getElementById('modal-compra-content');
  if (!el) return;

  el.innerHTML = `
    <h3>${c.desc}</h3>
    <div class="text-xs text-muted mb-4">${getNombreCliente(store, c.clienteId)} • ${c.tarjeta}</div>
    
    <div class="flex flex-col gap-2 mb-6" style="background: var(--bg-elevated); padding: 12px; border-radius: 8px;">
      <div class="flex justify-between"><span>Costo Original:</span><span>${formatMoney(c.costo)}</span></div>
      <div class="flex justify-between"><span>Por Cuota:</span><span class="text-accent">${formatMoney(c.montoCuota)}</span></div>
      <div class="flex justify-between"><span>Ganancia Total:</span><span class="${c.ganancia >= 0 ? 'text-success' : 'text-danger'}">${formatMoney(c.ganancia)}</span></div>
    </div>
    
    <div class="flex-col gap-2">
      ${c.cuotas.map(cu => {
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
          <div class="text-accent font-bold">${formatMoney(c.montoCuota)}</div>
          <button class="btn-icon ${cu.pagada ? '' : 'btn-acc'}" style="${cu.pagada ? 'background: var(--bg-elevated)' : ''}" onclick="window.__toggleCuotaCompra('${id}', ${cu.num - 1})">
            <i class="${cu.pagada ? 'ri-arrow-go-back-line' : 'ri-check-line'}"></i>
          </button>
        </div>
        `;
  }).join('')}
    </div>
  `;
  window.openModal('modal-compra');
};

export function renderCompras(container) {
  const store = getStore();

  const renderHistorial = () => {
    if (!store.compras.length) {
      return `<div class="empty-state"><i class="ri-shopping-bag-3-line"></i><div>No hay compras registradas</div></div>`;
    }

    return store.compras.map(c => {
      const pagadas = c.cuotas.filter(x => x.pagada).length;
      const pct = Math.round((pagadas / c.ncuotas) * 100);
      const venc = c.cuotas.filter(x => !x.pagada && isVencida(x.vence)).length;

      return `
        <div class="card mb-4">
          <div class="flex justify-between items-start mb-3">
            <div>
              <div style="font-weight: 600">${c.desc}</div>
              <div class="text-xs text-muted mt-1">${getNombreCliente(store, c.clienteId)} <span class="badge badge-info ml-2">${c.tarjeta}</span></div>
              ${venc > 0 ? `<div class="mt-2 text-xs text-danger"><i class="ri-error-warning-line"></i> ${venc} vencida(s)</div>` : ''}
            </div>
            <div class="flex gap-2">
              <button class="btn-icon btn-acc" style="width: 30px; height: 30px;" onclick="window.__verDetalleCompra('${c.id}')"><i class="ri-eye-line"></i></button>
              <button class="btn-icon" style="width: 30px; height: 30px; color: var(--danger)" onclick="window.__eliminarCompra('${c.id}')"><i class="ri-delete-bin-line"></i></button>
            </div>
          </div>
          
          <div class="flex justify-between flex-wrap gap-2 text-sm mb-3" style="background: var(--bg-elevated); padding: 8px 12px; border-radius: 6px;">
            <span>Costo: <b>${formatMoney(c.costo)}</b></span>
            <span>Total: <b class="text-accent">${formatMoney(c.total)}</b></span>
            <span>Ganancia: <b class="${c.ganancia >= 0 ? 'text-success' : 'text-danger'}">${formatMoney(c.ganancia)}</b></span>
          </div>
          
          <div class="flex justify-between text-xs text-muted mb-1">
            <span>${pagadas}/${c.ncuotas} Cuotas</span>
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
      <h1 class="page-title">Compras</h1>
      <button class="btn btn-acc desktop-only" id="btn-add-compra">
        <i class="ri-add-line"></i> Nueva Compra
      </button>
    </div>

    <!-- Historial -->
    <div id="compras-list-container">
      ${renderHistorial()}
    </div>

    <!-- Modal Formulario -->
    <div id="modal-new-compra" class="modal-overlay">
      <div class="modal-content">
        <div class="flex justify-between items-center mb-4">
          <h2>Nueva Compra</h2>
          <button class="btn-icon" onclick="window.closeModal('modal-new-compra')"><i class="ri-close-line"></i></button>
        </div>
        
        <div class="form-grid">
          <div class="form-group">
            <label>Cliente</label>
            <select id="c-cliente" class="input-control">
              ${store.clientes.length === 0 ? '<option value="">Sin clientes</option>' : store.clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Tarjeta Usada</label>
            <select id="c-tarjeta" class="input-control">
              ${store.tarjetas.map(t => `<option value="${t}">${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="grid-column: 1 / -1;">
            <label>Descripción del Producto</label>
            <input type="text" id="c-desc" class="input-control" placeholder="Ej: TV Samsung 55'">
          </div>
          <div class="form-group">
            <label>Precio al que compró ($)</label>
            <input type="text" id="c-costo" class="input-control" placeholder="0">
          </div>
          <div class="form-group">
            <label>Cant. de Cuotas</label>
            <input type="number" id="c-ncuotas" class="input-control" min="1" max="36" value="1">
          </div>
          <div class="form-group">
            <label>Monto a Cobrar por Cuota ($)</label>
            <input type="text" id="c-montocuota" class="input-control" placeholder="0">
          </div>
          <div class="form-group">
            <label>Fecha 1er Vencimiento</label>
            <input type="date" id="c-fecha1" class="input-control" value="${new Date().toISOString().split('T')[0]}">
          </div>
        </div>
        
        <div id="c-preview" class="mb-4"></div>
        
        <div class="flex gap-3 justify-end mt-4">
          <button class="btn btn-secondary" onclick="window.closeModal('modal-new-compra')">Cancelar</button>
          <button class="btn btn-acc" id="btn-save-compra">Guardar</button>
        </div>
      </div>
    </div>

    <!-- Modal Detalle Compra -->
    <div id="modal-compra" class="modal-overlay">
      <div class="modal-content">
        <div class="flex justify-end">
          <button class="btn-icon" onclick="window.closeModal('modal-compra'); const ev=new Event('re-render-compras'); window.dispatchEvent(ev);"><i class="ri-close-line"></i></button>
        </div>
        <div id="modal-compra-content"></div>
      </div>
    </div>
  `;

  const calcPreview = () => {
    const costo = parseCurrencyInput(document.getElementById('c-costo').value);
    const n = parseInt(document.getElementById('c-ncuotas').value) || 1;
    const mc = parseCurrencyInput(document.getElementById('c-montocuota').value);
    const total = mc * n;
    const gan = total - costo;
    const pct = costo > 0 ? ((gan / costo) * 100).toFixed(1) : 0;
    const el = document.getElementById('c-preview');

    if (!costo && !mc) { el.innerHTML = ''; return; }

    el.innerHTML = `
      <div style="background: var(--info-glow); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px; padding: 12px; font-size: 0.8rem; display: flex; flex-direction: column; gap: 8px;">
        <div class="flex justify-between"><span>Costo:</span><span>${formatMoney(costo)}</span></div>
        <div class="flex justify-between"><span>Total Cobrado:</span><span class="text-accent" style="font-weight:700">${formatMoney(total)}</span></div>
        <div class="flex justify-between"><span>Ganancia Estimada:</span><span class="${gan >= 0 ? 'text-success' : 'text-danger'}">${formatMoney(gan)} (${pct}%)</span></div>
      </div>`;
  };

  document.getElementById('c-costo').addEventListener('input', calcPreview);
  document.getElementById('c-ncuotas').addEventListener('input', calcPreview);
  document.getElementById('c-montocuota').addEventListener('input', calcPreview);
  
  if (document.getElementById('c-costo')) formatCurrencyInput(document.getElementById('c-costo'));
  if (document.getElementById('c-montocuota')) formatCurrencyInput(document.getElementById('c-montocuota'));

  const handleOpenModal = () => window.openModal('modal-new-compra');

  if (document.getElementById('btn-add-compra')) {
    document.getElementById('btn-add-compra').addEventListener('click', handleOpenModal);
  }

  const globalListener = (e) => { if (e.detail === 'compras') handleOpenModal(); };
  window.addEventListener('global-add-click', globalListener);

  window.addEventListener('re-render-compras', () => {
    const listContainer = document.getElementById('compras-list-container');
    if (listContainer) listContainer.innerHTML = renderHistorial();
  });

  document.getElementById('btn-save-compra').addEventListener('click', async () => {
    const cid = document.getElementById('c-cliente').value;
    const desc = document.getElementById('c-desc').value.trim();
    const costo = parseCurrencyInput(document.getElementById('c-costo').value);
    const n = parseInt(document.getElementById('c-ncuotas').value) || 1;
    const mc = parseCurrencyInput(document.getElementById('c-montocuota').value);
    const fecha1 = document.getElementById('c-fecha1').value;
    const tarjeta = document.getElementById('c-tarjeta').value;

    if (!desc || !costo || !mc || !fecha1 || !cid) {
      alert('Por favor, completá todos los campos.');
      return;
    }

    const cuotas = addCuotasVencimiento(fecha1, n);

    await addCompra({
      id: uid(),
      clienteId: cid,
      desc,
      costo,
      ncuotas: n,
      montoCuota: mc,
      total: mc * n,
      ganancia: (mc * n) - costo,
      tarjeta,
      cuotas,
      fecha: new Date().toISOString().split('T')[0]
    });

    window.closeModal('modal-new-compra');
    document.getElementById('c-desc').value = '';
    document.getElementById('c-costo').value = '';
    document.getElementById('c-ncuotas').value = '1';
    document.getElementById('c-montocuota').value = '';
    document.getElementById('c-preview').innerHTML = '';

    document.getElementById('compras-list-container').innerHTML = renderHistorial();
  });
}
