import { supabase } from '../supabaseClient.js';

let store = null;
let listeners = [];

const defaultState = {
  clientes: [],
  compras: [],
  prestamos: [],
  tarjetas: ['Visa Santander', 'Mastercard BBVA', 'Naranja X', 'MODO'],
  tasas: {1:0, 2:10, 3:20, 6:35, 9:50, 12:65, 18:90, 24:120}
};

export async function initStore() {
  if (store) return store;
  try {
    // 1. Intentar cargar desde Supabase
    const { data, error } = await supabase
      .from('fincontrol_data')
      .select('payload')
      .eq('id', 1)
      .single();

    if (error && error.code !== 'PGRST116') { // Ignorar error si no existe la fila, pero avisar
      throw error;
    }

    if (data && data.payload) {
      console.log('Datos cargados desde Supabase.');
      const parsed = data.payload;
      store = { 
        ...defaultState, 
        ...parsed,
        tasas: { ...defaultState.tasas, ...(parsed?.tasas || {}) }
      };
    } else {
      console.log('No existen datos base, creando estado vacío en Supabase...');
      store = JSON.parse(JSON.stringify(defaultState));
      // Intentar migrar lo local a supabase como semilla inicial si existe
      const local = localStorage.getItem('fincontrol');
      if (local) {
         console.log('Migrando estado de localStorage a Supabase...');
         store = { ...defaultState, ...JSON.parse(local) };
      }
      await saveStore(); 
    }
  } catch(e) {
    console.error('Error cargando desde Supabase. Fallback a LocalStorage.', e);
    // 2. Fallback a LocalStorage si falla el internet o algo más.
    const d = localStorage.getItem('fincontrol');
    if (d) {
      const parsed = JSON.parse(d);
      store = { 
        ...defaultState, 
        ...parsed,
        tasas: { ...defaultState.tasas, ...(parsed.tasas || {}) }
      };
    } else {
      store = JSON.parse(JSON.stringify(defaultState));
    }
  }
  return store;
}

export function getStore() {
  if (!store) {
    console.error('El Store no se inicializó correctamente antes del renderizado.');
  }
  return store || defaultState;
}

export async function saveStore() {
  try {
    // 1. Guardar en Supabase. Hacemos upsert en caso de que no exista con id 1.
    const { error } = await supabase
      .from('fincontrol_data')
      .upsert({ id: 1, payload: store }, { onConflict: 'id' });

    if (error) throw error;
    
    // 2. Por las dudas, también se guarda copia en localStorage
    localStorage.setItem('fincontrol', JSON.stringify(store));
    notify();
  } catch(e) {
    console.error('Error guardando en Supabase. Sólo guardado localmente.', e);
    localStorage.setItem('fincontrol', JSON.stringify(store));
    notify();
  }
}

export function subscribe(listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

function notify() {
  listeners.forEach(l => l());
}
