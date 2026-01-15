import { useEffect, useRef, useState } from 'react';
import api from '../config/axios';

interface UseRoteiroStatusPollingProps {
  roteiroPk: number | null;
  enabled: boolean; // Só faz polling se enabled = true
  onComplete: () => void; // Callback quando processamento completar
  interval?: number; // Intervalo de polling em ms (padrão: 3000ms = 3s)
}

interface StatusData {
  pk: number;
  nome: string;
  inProgress: boolean;
  status: string;
  dataCriacao: string;
  ativo: boolean;
  deletado: boolean;
}

export const useRoteiroStatusPolling = ({ 
  roteiroPk, 
  enabled,
  onComplete, 
  interval = 3000 
}: UseRoteiroStatusPollingProps) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tempoDecorrido, setTempoDecorrido] = useState<number>(0); // em segundos
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkStatus = async () => {
    if (!roteiroPk) return;

    try {
      const response = await api.get(`/roteiro-status?pk=${roteiroPk}`);
      
      if (response.data.success && response.data.data) {
        const data: StatusData = response.data.data;
        setStatusData(data);
        setIsProcessing(data.inProgress);
        
        // Calcular tempo decorrido baseado no timestamp do banco
        if (data.dataCriacao && data.inProgress) {
          const dataInicio = new Date(data.dataCriacao).getTime();
          const agora = Date.now();
          const tempoDecorridoSegundos = Math.floor((agora - dataInicio) / 1000);
          setTempoDecorrido(tempoDecorridoSegundos);
        }
        
        // Se não está mais processando, chama callback
        if (!data.inProgress && isProcessing) {
          console.log('✅ Processamento concluído! Chamando onComplete...');
          onComplete();
          
          // Para o polling
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }
    } catch (err: any) {
      console.error('Erro ao verificar status do roteiro:', err);
      setError(err.response?.data?.error || 'Erro ao verificar status');
    }
  };

  useEffect(() => {
    // Só ativa polling se enabled e tem PK
    if (enabled && roteiroPk) {
      console.log('▶️ Iniciando polling de status do roteiro:', roteiroPk);
      
      // Primeira verificação imediata (já calcula tempo baseado no banco)
      checkStatus();
      
      // Configura polling a cada 3 segundos (já atualiza tempo dentro do checkStatus)
      intervalRef.current = setInterval(checkStatus, interval);
    } else {
      console.log('⏸️ Polling pausado.');
      
      // Limpa polling
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Reseta tempo
      setTempoDecorrido(0);
    }

    // Cleanup ao desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, roteiroPk, interval, isProcessing]);

  return { 
    isProcessing, 
    statusData, 
    error,
    tempoDecorrido
  };
};
