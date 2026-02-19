import { useAuth } from '../contexts/AuthContext';

/**
 * Hook para verificar se o usuário tem acesso a uma área específica
 * 
 * @param area_codigo - Código da área (ex: 'meus_roteiros', 'criar_roteiro', 'admin')
 * @param tipo - Tipo de acesso: 'leitura' ou 'escrita' (default: 'leitura')
 * @returns {boolean} True se o usuário tem acesso, False caso contrário
 */
export const useCanAccess = (area_codigo: string, tipo: 'leitura' | 'escrita' = 'leitura'): boolean => {
  const { temPermissao } = useAuth();
  
  return temPermissao(area_codigo, tipo);
};
