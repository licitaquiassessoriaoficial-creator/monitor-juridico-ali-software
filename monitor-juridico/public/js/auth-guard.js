// public/js/auth-guard.js
export function isLoggedIn() {
  // Considera usuário autenticado se houver um token JWT válido
  const token = localStorage.getItem('userToken');
  return !!token;
}

export function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }
  // Opcional: checar validade do token futuramente
}
