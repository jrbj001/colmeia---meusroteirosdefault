import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  chunkError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, chunkError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const chunkError =
      error?.name === 'ChunkLoadError' ||
      /loading chunk/i.test(error?.message || '') ||
      /failed to fetch dynamically imported module/i.test(error?.message || '');
    return { hasError: true, error, chunkError };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] erro capturado:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { chunkError, error } = this.state;

    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-[#ff4600]"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {chunkError ? 'Nova versão disponível' : 'Algo deu errado'}
          </h1>

          <p className="text-sm text-gray-500 mb-8 leading-relaxed">
            {chunkError
              ? 'A plataforma foi atualizada. Recarregue a página para continuar.'
              : 'Ocorreu um erro inesperado durante a navegação. Tente recarregar a página.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg bg-[#ff4600] hover:bg-[#e33d00] active:scale-95 text-white text-sm font-semibold transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M5.635 19A9 9 0 104.583 9.5" />
              </svg>
              Recarregar página
            </button>
            <button
              onClick={this.handleGoHome}
              className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-medium transition-all"
            >
              Ir para o início
            </button>
          </div>

          {!chunkError && error?.message && (
            <p className="mt-8 text-[11px] text-gray-300 font-mono break-all">
              {error.message}
            </p>
          )}
        </div>
      </div>
    );
  }
}
