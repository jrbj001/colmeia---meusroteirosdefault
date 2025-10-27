import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

export const Callback: React.FC = () => {
  const { isLoading, error } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !error) {
      // Redirecionar para a página principal após login bem-sucedido
      navigate('/', { replace: true });
    } else if (error) {
      // Em caso de erro, redirecionar para login
      navigate('/login', { replace: true });
    }
  }, [isLoading, error, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Erro no Login</h2>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-orange-500 border-solid"></div>
        <p className="text-gray-600">Finalizando login...</p>
      </div>
    </div>
  );
};
