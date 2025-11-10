import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Auth0Provider } from "@auth0/auth0-react";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute/ProtectedRoute";
import { Login } from "./screens/Login";
import { Callback } from "./screens/Callback";
import { MeusRoteiros } from "./screens/MeusRoteiros";
import { Mapa } from "./screens/Mapa";
import { CriarRoteiro } from "./screens/CriarRoteiro";
import { ConsultaEndereco } from "./screens/ConsultaEndereco";
import { VisualizarResultados } from "./screens/VisualizarResultados";
import '../tailwind.css';
import 'leaflet/dist/leaflet.css';

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: import.meta.env.VITE_AUTH0_CALLBACK_URL,
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
    >
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/callback" element={<Callback />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <MeusRoteiros />
              </ProtectedRoute>
            } 
          />
            <Route 
              path="/mapa" 
              element={
                <ProtectedRoute>
                  <Mapa />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/criar-roteiro" 
              element={
                <ProtectedRoute>
                  <CriarRoteiro />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/visualizar-resultados" 
              element={
                <ProtectedRoute>
                  <VisualizarResultados />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/consulta-endereco" 
              element={
                <ProtectedRoute>
                  <ConsultaEndereco />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<div>Página não encontrada</div>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </Auth0Provider>
  </StrictMode>
);
