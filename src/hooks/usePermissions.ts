import { useAuth } from '../contexts/AuthContext';

/**
 * Hook para acessar as permissões do usuário logado
 * 
 * @returns {Object} Objeto com permissões e funções úteis
 */
export const usePermissions = () => {
  const { permissoes, temPermissao, user } = useAuth();

  return {
    permissoes,
    temPermissao,
    usuario: user,
    perfil: user?.perfil_nome,
    isAdmin: user?.perfil_nome === 'Admin',
    isEditor: user?.perfil_nome === 'Editor',
    isVisualizador: user?.perfil_nome === 'Visualizador',
    isAnalistaBI: user?.perfil_nome === 'Analista BI',
  };
};
