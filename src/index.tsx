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
import { BancoDeAtivos } from "./screens/BancoDeAtivos";
import { RelatorioPorPraca } from "./screens/RelatorioPorPraca";
import { RelatorioPorExibidor } from "./screens/RelatorioPorExibidor";
import { PaginaEmDesenvolvimento } from "./components/PaginaEmDesenvolvimento";
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
            <Route 
              path="/banco-de-ativos" 
              element={
                <ProtectedRoute>
                  <BancoDeAtivos />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/banco-de-ativos/relatorio-por-praca" 
              element={
                <ProtectedRoute>
                  <RelatorioPorPraca />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/banco-de-ativos/relatorio-por-exibidor" 
              element={
                <ProtectedRoute>
                  <RelatorioPorExibidor />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/banco-de-ativos/cadastrar/grupo-midia" 
              element={
                <ProtectedRoute>
                  <PaginaEmDesenvolvimento 
                    titulo="Cadastrar Grupo de Mídia"
                    breadcrumbItems={[
                      { label: "Home", path: "/" },
                      { label: "Banco de ativos", path: "/banco-de-ativos" },
                      { label: "Cadastrar Grupo de Mídia" }
                    ]}
                  />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/banco-de-ativos/cadastrar/tipo-midia" 
              element={
                <ProtectedRoute>
                  <PaginaEmDesenvolvimento 
                    titulo="Cadastrar Tipo de Mídia"
                    breadcrumbItems={[
                      { label: "Home", path: "/" },
                      { label: "Banco de ativos", path: "/banco-de-ativos" },
                      { label: "Cadastrar Tipo de Mídia" }
                    ]}
                  />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/banco-de-ativos/cadastrar/exibidor" 
              element={
                <ProtectedRoute>
                  <PaginaEmDesenvolvimento 
                    titulo="Cadastrar Exibidor"
                    breadcrumbItems={[
                      { label: "Home", path: "/" },
                      { label: "Banco de ativos", path: "/banco-de-ativos" },
                      { label: "Cadastrar Exibidor" }
                    ]}
                  />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/banco-de-ativos/importar/arquivo" 
              element={
                <ProtectedRoute>
                  <PaginaEmDesenvolvimento 
                    titulo="Importar Arquivo"
                    breadcrumbItems={[
                      { label: "Home", path: "/" },
                      { label: "Banco de ativos", path: "/banco-de-ativos" },
                      { label: "Importar Arquivo" }
                    ]}
                  />
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
