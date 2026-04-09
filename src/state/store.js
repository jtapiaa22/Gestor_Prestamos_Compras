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
    store = JSON.parse(JSON.stringify(defaultState));

    // 1. Cargar Payload Base
    const { data: dbData, error: dbError } = await supabase
      .from('fincontrol_data')
      .select('payload')
      .eq('id', 1)
      .single();

    if (dbData && dbData.payload) {
      const parsed = dbData.payload;
      store = { ...store, ...parsed, tasas: { ...defaultState.tasas, ...(parsed?.tasas || {}) } };
    }

    // 2. Cargar Clientes desde su propia tabla
    const { data: clientesData, error: clientesError } = await supabase
      .from('fincontrol_clientes')
      .select('*');
      
    if (clientesError) {
      console.warn("La tabla fincontrol_clientes no existe o falló, asegúrate de haberla creado en Supabase.");
    }

    let necesitaMigracion = false;
    
    // Auto-Migración: Si tenemos clientes en el viejo formato (adentro del payload de fincontrol_data)
    // y la nueva tabla está vacía, significando que es la primera vez que inicia esto:
    if (store.clientes && store.clientes.length > 0 && (!clientesData || clientesData.length === 0)) {
      console.log('Migrando lista de clientes a su propia tabla relacional...');
      // Insertar los clientes viejos en la nueva tabla de golpe
      await supabase.from('fincontrol_clientes').insert(store.clientes);
      necesitaMigracion = true;
      // Una vez insertados, los mantenemos en el store memory y listo.
    } 
    // Si la nueva tabla ya tiene clientes (modo normal), sobreescribimos cualquier basurita del JSON con la versión oficial
    else if (clientesData && clientesData.length > 0) {
      store.clientes = clientesData;
    }

    if (necesitaMigracion) {
      // Guardar el payload quitando los clientes de adentro
      await saveStore();
    }

    localStorage.setItem('fincontrol', JSON.stringify(store));
  } catch(e) {
    console.error('Error inicializando Store:', e);
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
    // Para el guardado principal, ignoramos a los clientes porque ahora viven en su propia tabla
    const payloadToSave = { ...store };
    delete payloadToSave.clientes;

    const { error } = await supabase
      .from('fincontrol_data')
      .upsert({ id: 1, payload: payloadToSave }, { onConflict: 'id' });

    if (error) throw error;
    
    localStorage.setItem('fincontrol', JSON.stringify(store));
    notify();
  } catch(e) {
    console.error('Error guardando config en Supabase.', e);
    alert('Error al guardar en el servidor: ' + (e.message || JSON.stringify(e)));
    localStorage.setItem('fincontrol', JSON.stringify(store));
    notify();
  }
}

// ------ FUNCIONES RELACIONALES EXCLUSIVAS DE CLIENTES ------ //

export async function addCliente(cliente) {
  // Optimizamos UI: actualizarlo rápido en memoria primero
  store.clientes.push(cliente);
  
  try {
    const { error } = await supabase.from('fincontrol_clientes').insert([cliente]);
    if (error) throw error;
    localStorage.setItem('fincontrol', JSON.stringify(store));
    notify();
  } catch(e) {
    console.error("Error guardando cliente en tabla", e);
    alert("Hubo un error guardando el cliente online.");
    // Revertir en caso de desastre (opcional)
  }
}

export async function updateCliente(cliente) {
  const index = store.clientes.findIndex(c => c.id === cliente.id);
  if (index > -1) {
    store.clientes[index] = cliente;
    
    try {
      const { error } = await supabase.from('fincontrol_clientes').update(cliente).eq('id', cliente.id);
      if (error) throw error;
      localStorage.setItem('fincontrol', JSON.stringify(store));
      notify();
    } catch(e) {
      console.error("Error editando cliente", e);
      alert("Hubo un error editando el cliente online.");
    }
  }
}

export async function removeCliente(id) {
  store.clientes = store.clientes.filter(c => c.id !== id);
  
  try {
    const { error } = await supabase.from('fincontrol_clientes').delete().eq('id', id);
    if (error) throw error;
    localStorage.setItem('fincontrol', JSON.stringify(store));
    notify();
  } catch(e) {
    console.error("Error borrando cliente", e);
    alert("Hubo un error eliminando el cliente online.");
  }
}

// ------------------------------------------------ //

export function subscribe(listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

function notify() {
  listeners.forEach(l => l());
}
