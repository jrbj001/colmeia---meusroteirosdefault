import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';

export const useAuth0Token = () => {
  const { getAccessTokenSilently, isAuthenticated, isLoading } = useAuth0();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getToken = async () => {
      if (isAuthenticated && !isLoading) {
        try {
          const accessToken = await getAccessTokenSilently();
          setToken(accessToken);
          setError(null);
        } catch (err: any) {
          console.error('Erro ao obter token:', err);
          setError(err.message);
          setToken(null);
        }
      } else {
        setToken(null);
        setError(null);
      }
    };

    getToken();
  }, [isAuthenticated, isLoading, getAccessTokenSilently]);

  return {
    token,
    error,
    isLoading: isLoading || (isAuthenticated && !token && !error)
  };
};
