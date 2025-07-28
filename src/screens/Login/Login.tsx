import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Logo } from "../../components/Logo";

export const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Pegar a página de origem ou ir para home
  const from = (location.state as any)?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validação do domínio
      if (!email.endsWith("@be180.com.br")) {
        setError("Apenas emails @be180.com.br são permitidos");
        return;
      }

      // Validação básica
      if (!email || !password) {
        setError("Preencha todos os campos");
        return;
      }

      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-8 w-full max-w-md">
        {/* Header com logos */}
        <div className="flex items-center justify-center mb-8">
          <Logo short={false} />
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              E-mail
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seunome@be180.com.br"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="12345678"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-3 px-4 rounded-md font-medium hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {/* Links */}
        <div className="mt-6 space-y-3 text-center">
          <p className="text-sm text-gray-600">
            Não tem cadastro?{" "}
            <button className="font-bold underline text-gray-800 hover:text-orange-500">
              Criar uma conta
            </button>
          </p>
          <p className="text-sm">
            <button className="underline text-gray-600 hover:text-orange-500">
              Esqueci minha senha
            </button>
          </p>
        </div>

        {/* Dica de teste */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-xs text-blue-800">
            <strong>Dica para teste:</strong><br/>
            Email: teste@be180.com.br<br/>
            Senha: 12345678
          </p>
        </div>
      </div>
    </div>
  );
}; 