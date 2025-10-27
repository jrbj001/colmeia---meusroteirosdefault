import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { Logo } from "../../components/Logo";

export const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const location = useLocation();
  const { loginWithRedirect, isLoading } = useAuth0();

  // Pegar a página de origem ou ir para home
  const from = (location.state as any)?.from?.pathname || "/";

  const handleAuth0Login = async () => {
    setError("");
    setLoading(true);

    try {
      await loginWithRedirect({
        appState: {
          returnTo: from,
        },
      });
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login");
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

        {/* Botão de Login Auth0 */}
        <div className="space-y-4">
          <button
            onClick={handleAuth0Login}
            disabled={loading || isLoading}
            className="w-full bg-[#ff4600] text-white py-4 px-6 rounded-lg font-medium text-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-[#ff4600] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading || isLoading ? "Entrando..." : "Login - Usuario be180"}
          </button>
        </div>

        {error && (
          <div className="mt-4 text-red-600 text-sm bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}; 