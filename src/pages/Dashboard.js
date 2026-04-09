import { getStore } from '../state/store.js';
import { formatMoney, isVencida, isPronto, formatFecha } from '../utils/helpers.js';

export function getNombreCliente(store, id) {
  const c = store.clientes.find(x => x.id === id);
  return c ? c.nombre : 'Desconocido';
}

export function renderDashboard(container) {
  const store = getStore();
  
  const ganComp = store.compras.reduce((a,c) => a + c.ganancia, 0);
  const ganPres = store.prestamos.reduce((a,p) => a + p.ganancia, 0);
  const compVenc = store.compras.reduce((a,c) => a + c.cuotas.filter(cu => !cu.pagada && isVencida(cu.vence)).length, 0);
  const presVenc = store.prestamos.reduce((a,p) => a + p.cuotas.filter(cu => !cu.pagada && isVencida(cu.vence)).length, 0);
  
  const pendienteCompras = store.compras.reduce((a,c) => a + c.cuotas.filter(cu => !cu.pagada).length * c.montoCuota, 0);
  const pendientePrestamos = store.prestamos.reduce((a,p) => a + p.cuotas.filter(cu => !cu.pagada).length * p.montoCuota, 0);
  const pendienteTotal = pendienteCompras + pendientePrestamos;
  const vencidasTotal = compVenc + presVenc;
  
  const ultCompras = store.compras.slice(-4).reverse();
  const actPres = store.prestamos.filter(p => p.cuotas.some(c => !c.pagada)).slice(-4).reverse();
  
  const vens = [];
  store.compras.forEach(c => {
    c.cuotas.forEach(cu => {
      if (!cu.pagada && (isVencida(cu.vence) || isPronto(cu.vence))) {
        vens.push({ label: c.desc, cliente: getNombreCliente(store, c.clienteId), vence: cu.vence, monto: c.montoCuota, tipo: 'compra', vencida: isVencida(cu.vence) });
      }
    });
  });
  store.prestamos.forEach(p => {
    p.cuotas.forEach(cu => {
      if (!cu.pagada && (isVencida(cu.vence) || isPronto(cu.vence))) {
        vens.push({ label: 'Préstamo', cliente: getNombreCliente(store, p.clienteId), vence: cu.vence, monto: p.montoCuota, tipo: 'prestamo', vencida: isVencida(cu.vence) });
      }
    });
  });
  vens.sort((a,b) => new Date(a.vence) - new Date(b.vence));

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Resumen</h1>
    </div>

    <div class="card-grid">
      <div class="card stat-card">
        <i class="ri-funds-box-line icon"></i>
        <div class="label">Ganancia Total</div>
        <div class="value success">${formatMoney(ganComp + ganPres)}</div>
      </div>
      <div class="card stat-card">
        <i class="ri-timer-2-line icon" style="color:var(--text-secondary)"></i>
        <div class="label">Pendiente a Cobrar</div>
        <div class="value ${pendienteTotal > 0 ? 'accent' : ''}">${pendienteTotal > 0 ? formatMoney(pendienteTotal) : '—'}</div>
      </div>
      <div class="card stat-card">
        <i class="ri-alarm-warning-line icon" style="color: ${vencidasTotal > 0 ? 'var(--danger)' : 'var(--text-secondary)'}"></i>
        <div class="label">Cuotas Vencidas</div>
        <div class="value ${vencidasTotal > 0 ? 'danger' : 'success'}">${vencidasTotal}</div>
      </div>
      <div class="card stat-card">
        <i class="ri-group-line icon" style="color: var(--info)"></i>
        <div class="label">Clientes Registrados</div>
        <div class="value" style="color: var(--info)">${store.clientes.length}</div>
      </div>
    </div>

    <div class="form-grid mt-4">
      <div class="card" style="padding: 1rem">
        <h3>Últimas Compras</h3>
        ${ultCompras.length ? `<div class="flex-col gap-3">
          ${ultCompras.map(c => `
            <div class="flex justify-between items-center pb-2" style="border-bottom: 1px solid var(--border-color)">
              <div class="flex gap-2 items-center">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--info)"></div>
                <div>
                  <div class="text-sm" style="font-weight: 500">${c.desc}</div>
                  <div class="text-xs text-muted">${getNombreCliente(store, c.clienteId)}</div>
                </div>
              </div>
              <div class="text-success text-sm">+${formatMoney(c.ganancia)}</div>
            </div>
          `).join('')}
        </div>` : '<div class="text-sm text-muted text-center py-4">Sin compras recientes</div>'}
      </div>

      <div class="card" style="padding: 1rem">
        <h3>Préstamos Activos</h3>
        ${actPres.length ? `<div class="flex-col gap-3">
          ${actPres.map(p => {
            const pend = p.cuotas.filter(c => !c.pagada).length * p.montoCuota;
            return `
            <div class="flex justify-between items-center pb-2" style="border-bottom: 1px solid var(--border-color)">
              <div class="flex gap-2 items-center">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--success)"></div>
                <div>
                  <div class="text-sm" style="font-weight: 500">${getNombreCliente(store, p.clienteId)}</div>
                  <div class="text-xs text-muted">${p.ncuotas} cuotas • ${p.tasa}% int.</div>
                </div>
              </div>
              <div class="text-accent text-sm">${formatMoney(pend)}</div>
            </div>
          `}).join('')}
        </div>` : '<div class="text-sm text-muted text-center py-4">Sin préstamos activos</div>'}
      </div>
    </div>

    <div class="card mt-4" style="padding: 1rem">
      <h3>Vencimientos</h3>
      ${vens.length ? `
        <div class="table-responsive">
          <table>
            <thead><tr><th>Cliente</th><th>Detalle</th><th>Vencimiento</th><th>Monto</th><th>Estado</th></tr></thead>
            <tbody>
              ${vens.map(v => `
                <tr>
                  <td style="font-weight:500; font-size:0.8rem">${v.cliente}</td>
                  <td style="font-size:0.8rem">${v.label}</td>
                  <td style="font-size:0.8rem">${formatFecha(v.vence)}</td>
                  <td class="text-accent">${formatMoney(v.monto)}</td>
                  <td><span class="badge ${v.vencida ? 'badge-danger' : 'badge-warning'}">${v.vencida ? 'Vencida' : 'Pronto'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<div class="empty-state" style="padding: 2rem 1rem"><i class="ri-check-double-line" style="color:var(--success)"></i><div style="font-size: 0.85rem">Todo al día. No hay vencimientos próximos.</div></div>'}
    </div>
  `;
}
