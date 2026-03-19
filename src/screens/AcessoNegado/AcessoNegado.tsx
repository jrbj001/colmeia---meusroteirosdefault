import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Logo } from '../../components/Logo';

export const AcessoNegado: React.FC = () => {
  const { logout } = useAuth0();

  const handleLogout = () => {
    logout({
      logoutParams: {
        returnTo: window.location.origin + '/login',
      },
    });
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-10 w-full max-w-md text-center">
        <div className="flex justify-center mb-8">
          <Logo short={false} />
        </div>

        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.5 9.5l5 5M14.5 9.5l-5 5"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Acesso não autorizado
        </h1>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          Seu email não tem permissão para acessar este sistema.
          <br />
          Entre em contato com o administrador para solicitar acesso.
        </p>

        <button
          onClick={handleLogout}
          className="w-full bg-[#ff4600] text-white py-3 px-6 rounded-lg font-medium text-sm hover:bg-orange-600 transition-colors"
        >
          Voltar para o Login
        </button>

        <p className="text-xs text-gray-400 mt-6">
          suporte@be180.com.br
        </p>
      </div>
    </div>
  );
};
