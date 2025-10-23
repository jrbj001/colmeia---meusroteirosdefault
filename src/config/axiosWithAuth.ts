import axios from 'axios';

// Determina a URL base da API
const getBaseURL = () => {
  // Em desenvolvimento, usa o proxy do Vite
  if (import.meta.env.DEV) {
    return '/api';
  }
  
  // Em produção, usa a URL do Vercel ou a variável de ambiente
  return import.meta.env.VITE_API_URL || 'https://colmeia-meusroteirosdefault.vercel.app/api';
};

// Função para criar instância do axios com token de autenticação
export const createAuthenticatedApi = (token?: string) => {
  const api = axios.create({
    baseURL: getBaseURL(),
    timeout: 0, // SEM timeout - deixa o servidor decidir
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  });

  // Interceptor para logs de debug
  api.interceptors.request.use(
    (config) => {
      console.log('API Request:', config.method?.toUpperCase(), config.url, config.params);
      return config;
    },
    (error) => {
      console.error('API Request Error:', error);
      return Promise.reject(error);
    }
  );

  api.interceptors.response.use(
    (response) => {
      console.log('API Response:', response.status, response.config.url);
      return response;
    },
    (error) => {
      console.error('API Response Error:', error.response?.status, error.response?.data);
      return Promise.reject(error);
    }
  );

  return api;
};

// Instância padrão (sem autenticação)
export const api = createAuthenticatedApi();
