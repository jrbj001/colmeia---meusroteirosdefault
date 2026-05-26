import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import { setExibidorFkHeader } from '../config/axios';

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  usuario_pk?: number;
  perfil_pk?: number;
  perfil_nome?: string;
  empresa_pk?: number | null;
  exibidor_fk?: number | null;
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
  isExibidor: boolean;
  acessoBloqueado: boolean;
  carregarPermissoes: () => Promise<void>;
  temPermissao: (area_codigo: string, tipo?: 'leitura' | 'escrita') => boolean;
}

const DOMINIO_INTERNO = '@be180.com.br';

// ── Cache de perfil em sessionStorage ──────────────────────────────────────
// Chave única por sub do Auth0 para evitar colisão entre usuários diferentes.
// sessionStorage é limpo ao fechar a aba — sem risco de dados obsoletos entre
// sessões longas.
const CACHE_PREFIX = 'colmeia_profile_v1_';

interface CachedProfile {
  usuario_pk?: number;
  perfil_pk?: number;
  perfil_nome?: string;
  empresa_pk?: number | null;
  exibidor_fk?: number | null;
  bloqueado?: boolean;
  cachedAt: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min — revalida após meia hora

// ── Marca o acesso no backend apenas uma vez por sessão (sessionStorage) ──
//    Fire-and-forget: nunca bloqueia ou propaga erro para o fluxo de login.
const ACESSO_REGISTRADO_KEY = 'colmeia_acesso_registrado_v1';

function registrarAcessoUmaVez(email: string, auth0Sub: string) {
  if (!email) return;
  try {
    const ja = sessionStorage.getItem(ACESSO_REGISTRADO_KEY);
    if (ja === email.toLowerCase()) return;
    sessionStorage.setItem(ACESSO_REGISTRADO_KEY, email.toLowerCase());
  } catch { /* sessionStorage indisponível — segue sem caching */ }

  axios
    .post('/usuarios-registrar-acesso', {
      email: email.toLowerCase(),
      auth0_sub: auth0Sub || undefined,
    })
    .then((r) => {
      // eslint-disable-next-line no-console
      console.log('[acesso] registrado:', r.data);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[acesso] falha (silencioso):', err?.response?.status, err?.response?.data);
    });
}

function lerCache(sub: string): CachedProfile | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + sub);
    if (!raw) return null;
    const parsed: CachedProfile = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_PREFIX + sub);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function gravarCache(sub: string, data: Omit<CachedProfile, 'cachedAt'>) {
  try {
    sessionStorage.setItem(CACHE_PREFIX + sub, JSON.stringify({ ...data, cachedAt: Date.now() }));
  } catch { /* quota excedida — ignora */ }
}

function limparCache(sub: string) {
  try { sessionStorage.removeItem(CACHE_PREFIX + sub); } catch { /* ok */ }
}

function isEmailInterno(email: string): boolean {
  return email.toLowerCase().endsWith(DOMINIO_INTERNO);
}

function isPerfilExibidor(perfilNome?: string | null): boolean {
  if (!perfilNome) return false;
  return perfilNome.trim().toLowerCase().includes('exibidor');
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
      const sub   = auth0User.sub   || '';

      const localUser: User = {
        id: sub,
        email,
        name: auth0User.name || auth0User.nickname || '',
        picture: auth0User.picture || undefined,
      };

      // ── 1. Verificar cache — resposta instantânea sem rede ──────────────
      const cached = lerCache(sub);
      if (cached) {
        if (cached.bloqueado) {
          setAcessoBloqueado(true);
          setUser(null);
        } else {
          localUser.usuario_pk  = cached.usuario_pk;
          localUser.perfil_pk   = cached.perfil_pk;
          localUser.perfil_nome = cached.perfil_nome;
          localUser.empresa_pk  = cached.empresa_pk ?? null;
          localUser.exibidor_fk = cached.exibidor_fk ?? null;
          setAcessoBloqueado(false);
          setUser({ ...localUser });
          registrarAcessoUmaVez(email, sub);
        }
        setIsLoading(false);
        return; // cache válido — não bate na API
      }

      // ── 2. Cache miss — busca na API ────────────────────────────────────
      if (!email) {
        setAcessoBloqueado(true);
        setUser(null);
        setIsLoading(false);
        return;
      }

      axios.get(`/usuarios?search=${encodeURIComponent(email)}&limit=1`)
        .then(async (response) => {
          const usuarios = response.data.usuarios || [];
          const match = usuarios.find(
            (u: { usuario_email: string }) =>
              u.usuario_email?.toLowerCase() === email.toLowerCase()
          );

          if (match) {
            localUser.usuario_pk  = match.usuario_pk;
            localUser.perfil_pk   = match.perfil_pk;
            localUser.perfil_nome = match.perfil_nome;
            localUser.empresa_pk  = match.empresa_pk ?? null;
            localUser.exibidor_fk = match.exibidor_fk ?? null;
            gravarCache(sub, {
              usuario_pk:  localUser.usuario_pk,
              perfil_pk:   localUser.perfil_pk,
              perfil_nome: localUser.perfil_nome,
              empresa_pk:  localUser.empresa_pk,
              exibidor_fk: localUser.exibidor_fk,
              bloqueado:   false,
            });
            setAcessoBloqueado(false);
            setUser({ ...localUser });
            registrarAcessoUmaVez(email, sub);
          } else if (isEmailInterno(email)) {
            gravarCache(sub, { bloqueado: false });
            setAcessoBloqueado(false);
            setUser({ ...localUser });
            registrarAcessoUmaVez(email, sub);
          } else {
            // Email externo sem cadastro — tenta resolução por domínio
            try {
              const domainRes = await axios.get(`/referencia?action=exibidor-resolve-domain&email=${encodeURIComponent(email)}`);
              const { usuario } = domainRes.data;
              if (usuario) {
                localUser.usuario_pk  = usuario.usuario_pk;
                localUser.perfil_pk   = usuario.perfil_pk;
                localUser.perfil_nome = usuario.perfil_nome;
                localUser.empresa_pk  = usuario.empresa_pk ?? null;
                localUser.exibidor_fk = usuario.exibidor_fk ?? null;
                gravarCache(sub, {
                  usuario_pk:  localUser.usuario_pk,
                  perfil_pk:   localUser.perfil_pk,
                  perfil_nome: localUser.perfil_nome,
                  empresa_pk:  localUser.empresa_pk,
                  exibidor_fk: localUser.exibidor_fk,
                  bloqueado:   false,
                });
                setAcessoBloqueado(false);
                setUser({ ...localUser });
                registrarAcessoUmaVez(email, sub);
              } else {
                gravarCache(sub, { bloqueado: true });
                setAcessoBloqueado(true);
                setUser(null);
              }
            } catch {
              gravarCache(sub, { bloqueado: true });
              setAcessoBloqueado(true);
              setUser(null);
            }
          }

          setIsLoading(false);
        })
        .catch(() => {
          if (isEmailInterno(email)) {
            gravarCache(sub, { bloqueado: false });
            setUser(localUser);
            setAcessoBloqueado(false);
            registrarAcessoUmaVez(email, sub);
          } else {
            setAcessoBloqueado(true);
            setUser(null);
          }
          setIsLoading(false);
        });
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
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('user_permissoes');
    try { sessionStorage.removeItem(ACESSO_REGISTRADO_KEY); } catch { /* ok */ }
    // Limpa cache de perfil do usuário atual
    if (user?.id) limparCache(user.id);
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
  const isExibidor = isPerfilExibidor(user?.perfil_nome);

  // Sincroniza o header de tenant exibidor no axios sempre que o usuário mudar
  useEffect(() => {
    setExibidorFkHeader(user?.exibidor_fk);
  }, [user?.exibidor_fk]);

  const value: AuthContextType = {
    user,
    permissoes,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user,
    isAgencia,
    isExibidor,
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