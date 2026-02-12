import React, { useState } from 'react';

interface ModalAdicionarMarcaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (novaMarca: { id_marca: number; nome_marca: string }) => void;
}

export const ModalAdicionarMarca: React.FC<ModalAdicionarMarcaProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [nomeMarca, setNomeMarca] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nomeMarca.trim()) {
      setErro('Por favor, informe o nome da marca');
      return;
    }

    setSalvando(true);
    setErro('');

    try {
      const response = await fetch('/api/marca', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nome_marca: nomeMarca.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setErro('Esta marca já existe');
        } else {
          setErro(data.error || 'Erro ao criar marca');
        }
        setSalvando(false);
        return;
      }

      // Sucesso!
      onSuccess(data.marca);
      setNomeMarca('');
      onClose();
    } catch (error) {
      console.error('Erro ao criar marca:', error);
      setErro('Erro ao conectar com o servidor');
    } finally {
      setSalvando(false);
    }
  };

  const handleClose = () => {
    if (!salvando) {
      setNomeMarca('');
      setErro('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
          <h3 className="text-xl font-bold text-white">Adicionar Nova Marca</h3>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Marca
            </label>
            <input
              type="text"
              value={nomeMarca}
              onChange={(e) => {
                setNomeMarca(e.target.value);
                setErro('');
              }}
              placeholder="Ex.: Coca-Cola"
              disabled={salvando}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              autoFocus
            />
          </div>

          {/* Mensagem de erro */}
          {erro && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
              <p className="text-sm text-red-700 font-medium">{erro}</p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={salvando}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando || !nomeMarca.trim()}
              className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {salvando ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
