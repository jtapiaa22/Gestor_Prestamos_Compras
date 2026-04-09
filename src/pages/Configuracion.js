import { getStore, saveStore } from '../state/store.js';

window.__eliminarTarjeta = function(index) {
  if (confirm('¿Eliminar esta tarjeta?')) {
    const store = getStore();
    store.tarjetas.splice(index, 1);
    saveStore();
    const event = new Event('re-render-config');
    window.dispatchEvent(event);
  }
};

export function renderConfiguracion(container) {
  const store = getStore();

  const renderTasas = () => {
    const cuotas = [1, 2, 3, 6, 9, 12, 18, 24];
    return cuotas.map(n => `
      <div class="card" style="padding: 10px; display: flex; flex-direction: column; gap: 4px; align-items: center;">
        <label class="text-xs text-muted" style="font-weight: 500">${n} cuota${n > 1 ? 's' : ''}</label>
        <div class="flex items-center gap-1">
          <input type="number" id="rate-${n}" class="input-control" value="${store.tasas[n] || 0}" min="0" max="999" step="0.5" style="text-align: center; font-size: 1.1rem; padding: 4px; font-weight: 700;">
          <span class="text-xs text-muted">%</span>
        </div>
      </div>
    `).join('');
  };

  const renderTarjetas = () => {
    return store.tarjetas.map((t, i) => `
      <div class="badge badge-info" style="font-size: 0.8rem; padding: 6px 12px; display: inline-flex; align-items: center; gap: 6px;">
        ${t} 
        <button onclick="window.__eliminarTarjeta(${i})" style="background:none;border:none;color:inherit;cursor:pointer;opacity:0.7;">
          <i class="ri-close-circle-fill"></i>
        </button>
      </div>
    `).join('');
  };

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Ajustes Generales</h1>
    </div>

    <div class="card mb-4" style="padding: 1.25rem">
      <div class="flex items-center gap-2 mb-2">
        <i class="ri-percent-line text-accent" style="font-size: 1.2rem"></i>
        <h3>Tasas de Interés para Préstamos</h3>
      </div>
      <p class="text-xs text-muted mb-4">Porcentaje de interés total que se aplicará según la cantidad de cuotas elegidas.</p>
      
      <div class="card-grid" style="grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 10px;">
        ${renderTasas()}
      </div>
      
      <div class="flex justify-end mt-4">
        <button class="btn btn-acc" id="btn-save-tasas">Guardar Tasas</button>
      </div>
    </div>

    <div class="card" style="padding: 1.25rem">
      <div class="flex items-center gap-2 mb-4">
        <i class="ri-bank-card-line text-info" style="font-size: 1.2rem"></i>
        <h3>Tarjetas de Crédito / Métodos de Pago</h3>
      </div>
      
      <div class="form-grid mb-4" style="grid-template-columns: 1fr auto; align-items: end;">
        <div class="form-group">
          <label>Añadir nueva opción</label>
          <input type="text" id="new-tarjeta" class="input-control" placeholder="Ej: Visa Macro">
        </div>
        <div class="form-group">
          <button class="btn btn-secondary" id="btn-add-tarjeta" style="height: 40px;"><i class="ri-add-line"></i> Añadir</button>
        </div>
      </div>
      
      <div class="flex gap-2 flex-wrap" id="tarjetas-container">
        ${renderTarjetas()}
      </div>
    </div>
  `;

  document.getElementById('btn-save-tasas').addEventListener('click', () => {
    [1, 2, 3, 6, 9, 12, 18, 24].forEach(n => {
      const v = parseFloat(document.getElementById('rate-' + n).value) || 0;
      store.tasas[n] = v;
    });
    saveStore();
    
    // Feedback visual
    const btn = document.getElementById('btn-save-tasas');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ri-check-line"></i> Guardado';
    btn.classList.add('badge-success');
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.classList.remove('badge-success');
    }, 2000);
  });

  document.getElementById('btn-add-tarjeta').addEventListener('click', () => {
    const v = document.getElementById('new-tarjeta').value.trim();
    if (!v) return;
    store.tarjetas.push(v);
    saveStore();
    document.getElementById('new-tarjeta').value = '';
    document.getElementById('tarjetas-container').innerHTML = renderTarjetas();
  });

  window.addEventListener('re-render-config', () => {
    const containerT = document.getElementById('tarjetas-container');
    if (containerT) containerT.innerHTML = renderTarjetas();
  });
}
