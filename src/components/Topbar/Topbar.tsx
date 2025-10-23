import React from "react";
import { Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { UserAvatar } from "../UserAvatar";
import { ExitToApp } from "../../icons/ExitToApp";
import { useAuth } from "../../contexts/AuthContext";

interface TopbarProps {
  menuReduzido: boolean;
  breadcrumb?: {
    items: Array<{
      label: string;
      path?: string;
    }>;
  };
}

export const Topbar: React.FC<TopbarProps> = ({ menuReduzido, breadcrumb }) => {
  const { logout, user } = useAuth();
  const { logoutWithRedirect, isAuthenticated: auth0IsAuthenticated, isLoading: auth0IsLoading, user: auth0User } = useAuth0();
  
  const defaultBreadcrumb = [
    { label: "Home", path: "/" },
    { label: "Meus roteiros", path: "/" }
  ];

  const breadcrumbItems = breadcrumb?.items || defaultBreadcrumb;

  // Obter foto do usuário (Auth0 ou local)
  const getUserPhoto = () => {
    if (auth0IsAuthenticated && auth0User?.picture) {
      return auth0User.picture;
    }
    // Fallback para avatar genérico ou foto local se houver
    return null;
  };

  const handleLogout = async () => {
    console.log('Logout iniciado. Auth0 autenticado:', auth0IsAuthenticated);
    
    try {
      if (auth0IsAuthenticated) {
        console.log('Fazendo logout do Auth0...');
        // Logout do Auth0
        await logoutWithRedirect({
          logoutParams: {
            returnTo: window.location.origin
          }
        });
      } else {
        console.log('Fazendo logout local...');
        // Logout local
        logout();
        // Redirecionar para login após logout local
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Erro no logout:', error);
      // Fallback: logout local
      logout();
      window.location.href = '/login';
    }
  };

  return (
    <div
      className={`fixed top-0 z-30 bg-white border-b border-[#c1c1c1] p-4 transition-all duration-300
        ${menuReduzido ? "left-20 w-[calc(100%-5rem)]" : "left-64 w-[calc(100%-16rem)]"}`}
    >
      <div className="flex justify-between items-center">
        <div 
          className="text-xs text-[#3a3a3a] tracking-[0.50px] max-w-md truncate"
          title={breadcrumbItems.map(item => item.label).join(' / ')}
        >
          {breadcrumbItems.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span className="mx-2 text-[#999]">/</span>}
              {item.path ? (
                <Link 
                  to={item.path}
                  className="hover:text-blue-600 transition-colors duration-200 hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-[#666] font-medium">{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="flex items-center gap-[30px]">
          {user && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>Olá, {user.name}</span>
            </div>
          )}
          
          {/* Avatar/Foto do usuário */}
          <UserAvatar
            src={getUserPhoto()}
            alt={user?.name || 'Usuário'}
            name={user?.name}
            size="large"
            className="!relative"
          />
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-[#3A3A3A] hover:text-red-600 transition-colors duration-200"
            title="Sair"
          >
            <ExitToApp className="w-6 h-6" color="currentColor" />
          </button>
        </div>
      </div>
      <div
        className={`fixed top-0 z-30 h-screen w-px bg-[#c1c1c1] ${menuReduzido ? "left-20" : "left-64"}`}
      />
    </div>
  );
}; 