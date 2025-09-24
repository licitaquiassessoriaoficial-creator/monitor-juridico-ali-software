// Configuração da API para o frontend
// Altere a URL abaixo após o deploy no Railway

const API_URL = process.env.NODE_ENV === 'production' 
  ? "https://SEU-DOMINIO-RAILWAY.up.railway.app/api"
  : "http://localhost:3001/api";

// Para usar no código:
// fetch(`${API_URL}/auth/login`, { ... })
// fetch(`${API_URL}/dashboard`, { ... })

export { API_URL };