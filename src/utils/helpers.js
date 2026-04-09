export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export function formatFecha(f) {
  if (!f) return '';
  const [y, m, d] = f.split('-');
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${d} ${meses[parseInt(m) - 1]} ${y}`;
}

export function isVencida(fecha) {
  return new Date(fecha + 'T12:00:00') < new Date();
}

export function isPronto(fecha) {
  const d = new Date(fecha + 'T12:00:00');
  const hoy = new Date();
  // Set hoy to 00:00:00 to accurately measure days
  hoy.setHours(0,0,0,0);
  const diff = (d - hoy) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 7;
}

export function addCuotasVencimiento(fecha1, n) {
  const cuotas = [];
  const base = new Date(fecha1 + 'T12:00:00');
  for (let i = 0; i < n; i++) {
    const d = new Date(base);
    d.setMonth(d.getMonth() + i);
    cuotas.push({ num: i + 1, vence: d.toISOString().split('T')[0], pagada: false });
  }
  return cuotas;
}

export function formatMoney(amount) {
  return '$' + parseFloat(amount).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function getTasaInterpolada(tasas, n) {
  const keys = Object.keys(tasas).map(Number).sort((a,b)=>a-b);
  for (let i=0; i < keys.length - 1; i++) {
    if (n > keys[i] && n < keys[i+1]) {
      const t = tasas[keys[i]];
      const t2 = tasas[keys[i+1]];
      return Math.round(t + (t2 - t) * (n - keys[i]) / (keys[i+1] - keys[i]));
    }
  }
  return tasas[keys[keys.length-1]] || 0;
}

export function formatCurrencyInput(inputField) {
  inputField.addEventListener('input', function(e) {
    let cursor = e.target.selectionStart;
    const originalLength = e.target.value.length;
    
    let val = e.target.value.replace(/[^0-9,]/g, '');
    const parts = val.split(',');
    if (parts.length > 2) {
      val = parts[0] + ',' + parts.slice(1).join('');
    }

    if (val !== '') {
      const p = val.split(',');
      p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      val = p.join(',');
    }
    
    e.target.value = val;
    
    const newLength = e.target.value.length;
    cursor = cursor + (newLength - originalLength);
    e.target.setSelectionRange(cursor, cursor);
  });
}

export function parseCurrencyInput(valString) {
  if (!valString) return 0;
  const clean = String(valString).replace(/\./g, '').replace(',', '.');
  return parseFloat(clean) || 0;
}
