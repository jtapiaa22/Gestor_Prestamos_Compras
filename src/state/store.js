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

    // 2. Cargar Clientes, Prestamos y Compras desde tablas relacionales
    const { data: clientesData, error: clientesError } = await supabase.from('fincontrol_clientes').select('*');
    const { data: prestamosData } = await supabase.from('fincontrol_prestamos').select('*');
    const { data: comprasData } = await supabase.from('fincontrol_compras').select('*');
      
    if (clientesError) {
      console.warn("Las tablas relacionales fallaron. Revisa el esquema SQL.");
    }

    let necesitaMigracion = false;
    
    // Auto-Migración Clientes
    if (store.clientes && store.clientes.length > 0 && (!clientesData || clientesData.length === 0)) {
      console.log('Migrando clientes...');
      await supabase.from('fincontrol_clientes').insert(store.clientes);
      necesitaMigracion = true;
    } else if (clientesData && clientesData.length > 0) {
      store.clientes = clientesData;
    }
    
    // Auto-Migración Prestamos
    if (store.prestamos && store.prestamos.length > 0 && (!prestamosData || prestamosData.length === 0)) {
      console.log('Migrando prestamos...');
      await supabase.from('fincontrol_prestamos').insert(store.prestamos);
      necesitaMigracion = true;
    } else if (prestamosData && prestamosData.length > 0) {
      store.prestamos = prestamosData;
    }
    
    // Auto-Migración Compras
    if (store.compras && store.compras.length > 0 && (!comprasData || comprasData.length === 0)) {
      console.log('Migrando compras...');
      await supabase.from('fincontrol_compras').insert(store.compras);
      necesitaMigracion = true;
    } else if (comprasData && comprasData.length > 0) {
      store.compras = comprasData;
    }

    if (necesitaMigracion) {
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
    // Ignoramos datos relacionales del guardado config principal
    const payloadToSave = { ...store };
    delete payloadToSave.clientes;
    delete payloadToSave.prestamos;
    delete payloadToSave.compras;

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

// ====== COMPRAS EXCLUSIVAS ====== //

export async function addCompra(compra) {
  store.compras.push(compra);
  try {
    const { error } = await supabase.from('fincontrol_compras').insert([compra]);
    if (error) throw error;
    localStorage.setItem('fincontrol', JSON.stringify(store));
    notify();
  } catch(e) { console.error("Error online", e); alert("Error guardando compra online: " + e.message); }
}

export async function updateCompra(compra) {
  const index = store.compras.findIndex(c => c.id === compra.id);
  if (index > -1) {
    store.compras[index] = compra;
    try {
      const { error } = await supabase.from('fincontrol_compras').update(compra).eq('id', compra.id);
      if (error) throw error;
      localStorage.setItem('fincontrol', JSON.stringify(store));
      notify();
    } catch(e) { console.error("Error online", e); alert("Error editando compra online"); }
  }
}

export async function removeCompra(id) {
  store.compras = store.compras.filter(c => c.id !== id);
  try {
    const { error } = await supabase.from('fincontrol_compras').delete().eq('id', id);
    if (error) throw error;
    localStorage.setItem('fincontrol', JSON.stringify(store));
    notify();
  } catch(e) { console.error("Error online", e); alert("Error borrando compra online"); }
}

// ====== PRESTAMOS EXCLUSIVOS ====== //

export async function addPrestamo(pres) {
  store.prestamos.push(pres);
  try {
    const { error } = await supabase.from('fincontrol_prestamos').insert([pres]);
    if (error) throw error;
    localStorage.setItem('fincontrol', JSON.stringify(store));
    notify();
  } catch(e) { console.error("Error online", e); alert("Error guardando prestamo online: " + e.message); }
}

export async function updatePrestamo(pres) {
  const index = store.prestamos.findIndex(p => p.id === pres.id);
  if (index > -1) {
    store.prestamos[index] = pres;
    try {
      const { error } = await supabase.from('fincontrol_prestamos').update(pres).eq('id', pres.id);
      if (error) throw error;
      localStorage.setItem('fincontrol', JSON.stringify(store));
      notify();
    } catch(e) { console.error("Error online", e); alert("Error editando prestamo online"); }
  }
}

export async function removePrestamo(id) {
  store.prestamos = store.prestamos.filter(p => p.id !== id);
  try {
    const { error } = await supabase.from('fincontrol_prestamos').delete().eq('id', id);
    if (error) throw error;
    localStorage.setItem('fincontrol', JSON.stringify(store));
    notify();
  } catch(e) { console.error("Error online", e); alert("Error borrando prestamo online"); }
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
