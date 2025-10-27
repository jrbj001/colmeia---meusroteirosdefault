import { useEffect, useRef, useState } from 'react';
import api from '../config/axios';

interface UseRoteirosRefreshProps {
  hasProcessing: boolean; // Se há roteiros em processamento
  onRefresh: () => void; // Callback para recarregar os dados
  interval?: number; // Intervalo de polling em ms (padrão: 5000ms = 5s)
}

export const useRoteirosRefresh = ({ 
  hasProcessing, 
  onRefresh, 
  interval = 5000 
}: UseRoteirosRefreshProps) => {
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkForUpdates = async () => {
    try {
      const response = await api.get('/roteiros-check-update');
      
      if (response.data.success && response.data.data) {
        const newDateMax = response.data.data.dateMax_dh;
        
        // Se não temos lastUpdate ainda, apenas salva
        if (!lastUpdate) {
          setLastUpdate(newDateMax);
          return;
        }
        
        // Se dateMax mudou, significa que houve atualização
        if (newDateMax !== lastUpdate) {
          console.log('🔄 Atualização detectada! Recarregando grid...');
          setLastUpdate(newDateMax);
          onRefresh();
        }
      }
    } catch (error) {
      console.error('Erro ao verificar atualizações:', error);
    }
  };

  useEffect(() => {
    // Só ativa polling se houver roteiros em processamento
    if (hasProcessing) {
      console.log('▶️ Iniciando polling de atualizações...');
      
      // Primeira verificação imediata
      checkForUpdates();
      
      // Configura polling
      intervalRef.current = setInterval(checkForUpdates, interval);
    } else {
      console.log('⏸️ Nenhum roteiro em processamento. Polling pausado.');
      
      // Limpa polling se não houver processamento
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Reseta lastUpdate para próxima vez
      setLastUpdate(null);
    }

    // Cleanup ao desmontar ou quando hasProcessing mudar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [hasProcessing, interval, lastUpdate]);

  return { lastUpdate };
};

