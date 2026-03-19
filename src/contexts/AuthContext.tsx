import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  usuario_pk?: number;
  perfil_pk?: number;
  perfil_nome?: string;
  empresa_pk?: number | null;
}

interface Permissao {
  area_codigo: string;
  area_nome: string;
  ler: boolean;
  escrever: boolean;
}

interface AuthContextType {
  user: User | null;
  permissoes: Permissao[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAgencia: boolean;
  acessoBloqueado: boolean;
  carregarPermissoes: () => Promise<void>;
  temPermissao: (area_codigo: string, tipo?: 'leitura' | 'escrita') => boolean;
}

const DOMINIO_INTERNO = '@be180.com.br';

function isEmailInterno(email: string): boolean {
  return email.toLowerCase().endsWith(DOMINIO_INTERNO);
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acessoBloqueado, setAcessoBloqueado] = useState(false);
  const { user: auth0User, isAuthenticated: auth0IsAuthenticated, isLoading: auth0IsLoading } = useAuth0();

  // Sincronizar Auth0 com o estado local e validar acesso
  useEffect(() => {
    if (auth0IsLoading) {
      setIsLoading(true);
      return;
    }

    if (auth0IsAuthenticated && auth0User) {
      const email = auth0User.email || '';
      const localUser: User = {
        id: auth0User.sub || '',
        email,
        name: auth0User.name || auth0User.nickname || '',
        picture: auth0User.picture || undefined,
      };

      if (email) {
        axios.get(`/usuarios?search=${encodeURIComponent(email)}&limit=1`)
          .then((response) => {
            const usuarios = response.data.usuarios || [];
            const match = usuarios.find(
              (u: { usuario_email: string }) =>
                u.usuario_email?.toLowerCase() === email.toLowerCase()
            );

            if (match) {
              // Usuário encontrado no banco — enriquecer dados
              localUser.usuario_pk = match.usuario_pk;
              localUser.perfil_pk = match.perfil_pk;
              localUser.perfil_nome = match.perfil_nome;
              localUser.empresa_pk = match.empresa_pk ?? null;
              setAcessoBloqueado(false);
              setUser({ ...localUser });
            } else if (isEmailInterno(email)) {
              // Email @be180.com.br sem cadastro no banco → acesso interno liberado
              setAcessoBloqueado(false);
              setUser({ ...localUser });
            } else {
              // Email externo não cadastrado → bloquear
              setAcessoBloqueado(true);
              setUser(null);
            }

            setIsLoading(false);
          })
          .catch(() => {
            // Em caso de falha na API, só libera se for domínio interno
            if (isEmailInterno(email)) {
              setUser(localUser);
              setAcessoBloqueado(false);
            } else {
              setAcessoBloqueado(true);
              setUser(null);
            }
            setIsLoading(false);
          });
      } else {
        setAcessoBloqueado(true);
        setUser(null);
        setIsLoading(false);
      }
    } else {
      setUser(null);
      setAcessoBloqueado(false);
      setIsLoading(false);
    }
  }, [auth0User, auth0IsAuthenticated, auth0IsLoading]);

  // Limpar resíduos de sessões locais antigas ao inicializar
  useEffect(() => {
    if (!auth0IsAuthenticated && !auth0IsLoading) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    }
  }, [auth0IsAuthenticated, auth0IsLoading]);

  const login = async (_email: string, _password: string): Promise<void> => {
    throw new Error('Login por email/senha não suportado. Utilize o login via Auth0.');
  };

  const logout = (): void => {
    console.log('AuthContext logout chamado');
    // Limpar dados locais
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('user_permissoes');
    setUser(null);
    setPermissoes([]);
    
    // Se estiver usando Auth0, redirecionar para logout do Auth0
    if (auth0IsAuthenticated) {
      console.log('Auth0 autenticado, logout será feito pelo componente');
      // O logout do Auth0 será feito pelo componente que chama esta função
      // usando logoutWithRedirect do useAuth0
    } else {
      console.log('Logout local realizado');
    }
  };

  // Carregar permissões do usuário
  const carregarPermissoes = async (): Promise<void> => {
    if (!user || !user.usuario_pk) {
      console.log('Usuário sem PK, não é possível carregar permissões');
      return;
    }

    try {
      const response = await axios.get(`/usuarios-permissoes?usuario_pk=${user.usuario_pk}`);
      
      // Transformar permissões em formato flat
      const permissoesFlat: Permissao[] = [];
      
      response.data.permissoes.forEach((area: any) => {
        // Adicionar área principal
        if (area.area_codigo) {
          permissoesFlat.push({
            area_codigo: area.area_codigo,
            area_nome: area.area_nome,
            ler: area.ler || false,
            escrever: area.escrever || false
          });
        }
        
        // Adicionar subáreas
        if (area.subareas && Array.isArray(area.subareas)) {
          area.subareas.forEach((sub: any) => {
            permissoesFlat.push({
              area_codigo: sub.area_codigo,
              area_nome: sub.area_nome,
              ler: sub.ler || false,
              escrever: sub.escrever || false
            });
          });
        }
      });
      
      setPermissoes(permissoesFlat);
      
      // Salvar no localStorage para cache
      localStorage.setItem('user_permissoes', JSON.stringify(permissoesFlat));
      
      console.log(`✅ ${permissoesFlat.length} permissões carregadas para o usuário`);
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      
      // Tentar carregar do cache
      const cachedPermissoes = localStorage.getItem('user_permissoes');
      if (cachedPermissoes) {
        try {
          setPermissoes(JSON.parse(cachedPermissoes));
          console.log('⚠️ Permissões carregadas do cache');
        } catch (e) {
          console.error('Erro ao carregar permissões do cache:', e);
        }
      }
    }
  };

  // Verificar se usuário tem permissão
  const temPermissao = (area_codigo: string, tipo: 'leitura' | 'escrita' = 'leitura'): boolean => {
    if (!permissoes || permissoes.length === 0) {
      return false;
    }

    const permissao = permissoes.find(p => p.area_codigo === area_codigo);
    
    if (!permissao) {
      return false;
    }

    return tipo === 'leitura' ? permissao.ler : permissao.escrever;
  };

  // Carregar permissões quando usuário fizer login
  useEffect(() => {
    if (user && user.usuario_pk) {
      carregarPermissoes();
    }
  }, [user?.usuario_pk]);

  const isAgencia = !!user?.empresa_pk;

  const value: AuthContextType = {
    user,
    permissoes,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user,
    isAgencia,
    acessoBloqueado,
    carregarPermissoes,
    temPermissao,
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