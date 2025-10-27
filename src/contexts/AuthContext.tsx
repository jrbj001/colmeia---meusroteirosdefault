import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user: auth0User, isAuthenticated: auth0IsAuthenticated, isLoading: auth0IsLoading } = useAuth0();

  // Sincronizar Auth0 com o estado local
  useEffect(() => {
    if (auth0IsLoading) {
      setIsLoading(true);
      return;
    }

    if (auth0IsAuthenticated && auth0User) {
      // Converter usuário do Auth0 para o formato local
      const localUser: User = {
        id: auth0User.sub || '',
        email: auth0User.email || '',
        name: auth0User.name || auth0User.nickname || '',
        picture: auth0User.picture || undefined,
      };
      setUser(localUser);
    } else {
      setUser(null);
    }
    
    setIsLoading(false);
  }, [auth0User, auth0IsAuthenticated, auth0IsLoading]);

  // Fallback: verificar localStorage para login local
  useEffect(() => {
    if (!auth0IsAuthenticated && !auth0IsLoading) {
      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('user_data');
      
      if (token && userData) {
        try {
          const user = JSON.parse(userData);
          setUser(user);
        } catch (error) {
          console.error('Erro ao carregar dados do usuário:', error);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
        }
      }
    }
  }, [auth0IsAuthenticated, auth0IsLoading]);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      // Simulação de login - em produção, isso seria uma chamada para a API
      if (email === 'teste@be180.com.br' && password === '12345678') {
        const userData: User = {
          id: '1',
          email: email,
          name: 'Usuário Teste'
        };
        
        // Simular token JWT
        const token = 'fake-jwt-token-' + Date.now();
        
        // Salvar no localStorage
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_data', JSON.stringify(userData));
        
        setUser(userData);
      } else {
        throw new Error('Email ou senha incorretos');
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = (): void => {
    console.log('AuthContext logout chamado');
    // Limpar dados locais
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setUser(null);
    
    // Se estiver usando Auth0, redirecionar para logout do Auth0
    if (auth0IsAuthenticated) {
      console.log('Auth0 autenticado, logout será feito pelo componente');
      // O logout do Auth0 será feito pelo componente que chama esta função
      // usando logoutWithRedirect do useAuth0
    } else {
      console.log('Logout local realizado');
    }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}; 