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
  const wasProcessingRef = useRef<boolean>(false); // Para rastrear estado anterior
  const pollingStartTimeRef = useRef<number | null>(null); // Timestamp de quando ESTE polling começou
  const lastRoteiroPkRef = useRef<number | null>(null); // Para detectar mudança de roteiro

  // ✅ Helper: Recuperar timestamp do localStorage
  const getTimestampFromStorage = (pk: number): number | null => {
    try {
      const saved = localStorage.getItem(`roteiro_polling_start_${pk}`);
      if (saved) {
        const timestamp = parseInt(saved, 10);
        console.log('📂 Timestamp recuperado do localStorage:', new Date(timestamp).toISOString());
        return timestamp;
      }
    } catch (e) {
      console.error('❌ Erro ao recuperar timestamp:', e);
    }
    return null;
  };

  // ✅ Helper: Salvar timestamp no localStorage
  const saveTimestampToStorage = (pk: number, timestamp: number) => {
    try {
      localStorage.setItem(`roteiro_polling_start_${pk}`, timestamp.toString());
      console.log('💾 Timestamp salvo no localStorage:', new Date(timestamp).toISOString());
    } catch (e) {
      console.error('❌ Erro ao salvar timestamp:', e);
    }
  };

  // ✅ Helper: Limpar timestamp do localStorage
  const clearTimestampFromStorage = (pk: number) => {
    try {
      localStorage.removeItem(`roteiro_polling_start_${pk}`);
      console.log('🗑️ Timestamp removido do localStorage');
    } catch (e) {
      console.error('❌ Erro ao limpar timestamp:', e);
    }
  };

  const checkStatus = async () => {
    if (!roteiroPk) return;

    try {
      console.log('🔍 Verificando status do roteiro PK:', roteiroPk);
      const response = await api.get(`/roteiro-status?pk=${roteiroPk}`);
      
      if (response.data.success && response.data.data) {
        const data: StatusData = response.data.data;
        setStatusData(data);
        setIsProcessing(data.inProgress);
        
        console.log('📊 Status recebido - inProgress:', data.inProgress);
        
        // ✅ Calcular tempo usando o timestamp de QUANDO O POLLING COMEÇOU
        if (data.inProgress && pollingStartTimeRef.current) {
          const agora = Date.now();
          const tempoDecorridoSegundos = Math.floor((agora - pollingStartTimeRef.current) / 1000);
          console.log('⏱️ Tempo decorrido desde início do polling:', tempoDecorridoSegundos, 'segundos');
          setTempoDecorrido(tempoDecorridoSegundos);
        }
        
        // Se não está mais processando, chama callback
        if (!data.inProgress && wasProcessingRef.current) {
          console.log('✅ Processamento concluído! Chamando onComplete...');
          
          // Limpar timestamp do localStorage
          if (roteiroPk) {
            clearTimestampFromStorage(roteiroPk);
          }
          
          onComplete();
          
          // Para o polling
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          
          // Resetar ref
          pollingStartTimeRef.current = null;
        }
        
        // Atualizar ref
        wasProcessingRef.current = data.inProgress;
      }
    } catch (err: any) {
      console.error('❌ Erro ao verificar status do roteiro:', err);
      setError(err.response?.data?.error || 'Erro ao verificar status');
    }
  };

  useEffect(() => {
    // ✅ Detectar mudança de roteiro (PK diferente)
    if (roteiroPk && roteiroPk !== lastRoteiroPkRef.current) {
      console.log('🆕 Novo roteiro detectado! PK anterior:', lastRoteiroPkRef.current, '→ Novo PK:', roteiroPk);
      // Resetar timestamp quando mudar de roteiro
      pollingStartTimeRef.current = null;
      lastRoteiroPkRef.current = roteiroPk;
    }
    
    // Só ativa polling se enabled e tem PK
    if (enabled && roteiroPk) {
      console.log('▶️ Polling ativo para roteiro:', roteiroPk);
      
      // ✅ Tentar recuperar timestamp do localStorage ou criar novo
      if (!pollingStartTimeRef.current) {
        const savedTimestamp = getTimestampFromStorage(roteiroPk);
        
        if (savedTimestamp) {
          // Recuperar timestamp salvo
          pollingStartTimeRef.current = savedTimestamp;
          console.log('🔄 Timestamp recuperado:', new Date(savedTimestamp).toISOString());
        } else {
          // Criar novo timestamp (AGORA é quando o processamento começou)
          const novoTimestamp = Date.now();
          pollingStartTimeRef.current = novoTimestamp;
          saveTimestampToStorage(roteiroPk, novoTimestamp);
          console.log('🆕 Novo timestamp criado:', new Date(novoTimestamp).toISOString());
        }
        
        // Resetar contador
        setTempoDecorrido(0);
      }
      
      // Primeira verificação imediata
      checkStatus();
      
      // Configura polling a cada X segundos
      intervalRef.current = setInterval(checkStatus, interval);
    } else {
      console.log('⏸️ Polling pausado. enabled:', enabled, 'roteiroPk:', roteiroPk);
      
      // Limpa apenas o intervalo (mantém timestamp para quando voltar)
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // Cleanup ao desmontar - limpa apenas o intervalo
    return () => {
      if (intervalRef.current) {
        console.log('🧹 Limpando intervalo no cleanup');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, roteiroPk, interval]);

  return { 
    isProcessing, 
    statusData, 
    error,
    tempoDecorrido
  };
};
