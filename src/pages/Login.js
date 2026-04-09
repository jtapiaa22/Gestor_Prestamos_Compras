import { supabase } from '../supabaseClient.js';

export function renderLogin(container) {
  container.innerHTML = `
    <div class="card fade-in" style="max-width: 400px; width: 100%; margin: auto; padding: 2.5rem; background: var(--bg-elevated); border: 1px solid var(--border-color); box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
      <div style="text-align:center; margin-bottom: 2rem;">
        <i class="ri-shield-keyhole-line" style="font-size: 3rem; color: var(--accent-color); display:inline-block; margin-bottom: 1rem;"></i>
        <h2 style="margin: 0; font-weight: 800; font-size: 1.5rem;">Caja Fuerte</h2>
        <p class="text-sm text-muted mt-1">Acceso Exclusivo</p>
      </div>
      
      <div class="form-grid" style="grid-template-columns: 1fr; gap: 1rem;">
        <div class="form-group">
          <label>Usuario o Email</label>
          <input type="text" id="login-email" class="input-control" placeholder="Ej: admin / tu-email@gmail.com" autocomplete="username">
        </div>
        <div class="form-group pb-2">
          <label>Contraseña</label>
          <input type="password" id="login-password" class="input-control" placeholder="••••••••">
        </div>
        
        <div id="login-error" class="text-danger text-sm text-center" style="min-height: 20px; font-weight: 600;"></div>
        
        <button class="btn btn-acc w-100" id="btn-login" style="width: 100%; justify-content: center; font-size: 1rem; padding: 0.8rem;">
          Entrar a Administración
        </button>
      </div>
    </div>
  `;

  document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    
    if (!email || !password) {
       errorEl.innerText = 'Rellena ambos campos';
       return;
    }
    
    const btn = document.getElementById('btn-login');
    btn.innerHTML = '<i class="ri-loader-4-line spin"></i> Verificando...';
    btn.disabled = true;
    errorEl.innerText = '';
    
    // Tratamos el caso de Nombre de Usuario
    let finalEmail = email;
    if (!email.includes('@')) {
       // Si no tiene @, asumimos que es un nombre de usuario y buscamos su correo en la tabla puente
       const { data: userData } = await supabase.from('auth_usuarios').select('email').eq('username', email.toLowerCase()).single();
       if (userData && userData.email) {
          finalEmail = userData.email;
       } else {
          errorEl.innerText = 'El nombre de usuario no se encontró.';
          btn.innerHTML = 'Entrar a Administración';
          btn.disabled = false;
          return;
       }
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: finalEmail,
      password
    });
    
    if (error) {
      errorEl.innerText = 'Credenciales no válidas. Acceso denegado.';
      btn.innerHTML = 'Entrar a Administración';
      btn.disabled = false;
    } else {
       // Recargar página para inicializar el estado logueado normal
       window.location.reload();
    }
  });
  
  // Soporte de la tecla 'Enter'
  document.getElementById('login-password').addEventListener('keyup', (e) => {
    if(e.key === 'Enter') document.getElementById('btn-login').click();
  });
}
