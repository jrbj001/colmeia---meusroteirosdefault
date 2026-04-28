import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Auth0Provider } from "@auth0/auth0-react";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute/ProtectedRoute";
import { Login } from "./screens/Login";
import { Callback } from "./screens/Callback";
import { HomeDashboard } from "./screens/HomeDashboard";
import { MeusRoteiros } from "./screens/MeusRoteiros";
import { Mapa } from "./screens/Mapa";
import { CriarRoteiro } from "./screens/CriarRoteiro";
import { ConsultaEndereco } from "./screens/ConsultaEndereco";
import { VisualizarResultados } from "./screens/VisualizarResultados";
import { BancoDeAtivos } from "./screens/BancoDeAtivos";
import { RelatorioPorPraca } from "./screens/RelatorioPorPraca";
import { RelatorioPorExibidor } from "./screens/RelatorioPorExibidor";
import { AdminUsuarios, AdminPerfis } from "./screens/Admin";
import { PaginaEmDesenvolvimento } from "./components/PaginaEmDesenvolvimento";
import { CadastrarExibidor } from "./screens/CadastrarExibidor/CadastrarExibidor";
import { GestaoExibidores } from "./screens/GestaoExibidores/GestaoExibidores";
import { ListarExibidores } from "./screens/ListarExibidores/ListarExibidores";
import { AcessoNegado } from "./screens/AcessoNegado/AcessoNegado";
import { ExibidorDashboard } from "./screens/Exibidor/ExibidorDashboard";
import { ExibidorImportar } from "./screens/Exibidor/ExibidorImportar";
import { ExibidorInventarioAtual } from "./screens/Exibidor/ExibidorInventarioAtual";
import { ExibidorEditar } from "./screens/Exibidor/ExibidorEditar";
import { ExibidorExcluir } from "./screens/Exibidor/ExibidorExcluir";
import { ExibidorSolicitacoes } from "./screens/Exibidor/ExibidorSolicitacoes";
import '../tailwind.css';
import 'leaflet/dist/leaflet.css';

function AppGuard({ children }: { children: React.ReactNode }) {
  const { acessoBloqueado } = useAuth();
  if (acessoBloqueado) return <AcessoNegado />;
  return <>{children}</>;
}

const appContainer = document.getElementById("app") as HTMLElement;
const globalRoot = (globalThis as any).__COLMEIA_APP_ROOT__;
const root = globalRoot || createRoot(appContainer);
(globalThis as any).__COLMEIA_APP_ROOT__ = root;

root.render(
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
        <AppGuard>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/callback" element={<Callback />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <HomeDashboard />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/home-dashboard"
            element={
              <ProtectedRoute>
                <HomeDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meus-roteiros"
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
                <ProtectedRoute internalOnly>
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
                <ProtectedRoute internalOnly>
                  <ConsultaEndereco />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/banco-de-ativos" 
              element={
                <ProtectedRoute internalOnly>
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
              path="/banco-de-ativos/exibidores" 
              element={
                <ProtectedRoute>
                  <ListarExibidores />
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
                <ProtectedRoute internalOnly>
                  <GestaoExibidores />
                </ProtectedRoute>
              }
            />
            <Route
              path="/banco-de-ativos/cadastrar/exibidor-form"
              element={
                <ProtectedRoute internalOnly>
                  <CadastrarExibidor />
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
            <Route
              path="/exibidor"
              element={<Navigate to="/exibidor/dashboard" replace />}
            />
            <Route
              path="/exibidor/dashboard"
              element={
                <ProtectedRoute allowedProfiles={['Exibidor']}>
                  <ExibidorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exibidor/inventario-atual"
              element={
                <ProtectedRoute allowedProfiles={['Exibidor']}>
                  <ExibidorInventarioAtual />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exibidor/importar"
              element={
                <ProtectedRoute allowedProfiles={['Exibidor']}>
                  <ExibidorImportar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exibidor/editar"
              element={
                <ProtectedRoute allowedProfiles={['Exibidor']}>
                  <ExibidorEditar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exibidor/excluir"
              element={
                <ProtectedRoute allowedProfiles={['Exibidor']}>
                  <ExibidorExcluir />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exibidor/solicitacoes"
              element={
                <ProtectedRoute allowedProfiles={['Exibidor']}>
                  <ExibidorSolicitacoes />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/admin/usuarios" 
              element={
                <ProtectedRoute internalOnly adminOnly>
                  <AdminUsuarios />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/perfis" 
              element={
                <ProtectedRoute internalOnly adminOnly>
                  <AdminPerfis />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<div>Página não encontrada</div>} />
          </Routes>
        </AppGuard>
        </BrowserRouter>
      </AuthProvider>
    </Auth0Provider>
  </StrictMode>
);
