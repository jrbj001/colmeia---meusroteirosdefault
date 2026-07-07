import React, { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Auth0Provider } from "@auth0/auth0-react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute/ProtectedRoute";
import { OcorrenciaWidget } from "./components/OcorrenciaWidget/OcorrenciaWidget";
import { ErrorBoundary } from "./components/ErrorBoundary/ErrorBoundary";
import '../tailwind.css';
import 'leaflet/dist/leaflet.css';

// ── Eager: telas leves que aparecem antes do auth ──────────────────────────
import { Login }    from "./screens/Login";
import { Callback } from "./screens/Callback";
import { AcessoNegado } from "./screens/AcessoNegado/AcessoNegado";

// ── Lazy: tudo o resto (carregado sob demanda por rota) ────────────────────
const HomeDashboard          = lazy(() => import("./screens/HomeDashboard").then(m => ({ default: m.HomeDashboard })));
const MeusRoteiros           = lazy(() => import("./screens/MeusRoteiros").then(m => ({ default: m.MeusRoteiros })));
const Mapa                   = lazy(() => import("./screens/Mapa").then(m => ({ default: m.Mapa })));
const CriarRoteiro           = lazy(() => import("./screens/CriarRoteiro").then(m => ({ default: m.CriarRoteiro })));
const ConsultaEndereco       = lazy(() => import("./screens/ConsultaEndereco").then(m => ({ default: m.ConsultaEndereco })));
const VisualizarResultados   = lazy(() => import("./screens/VisualizarResultados").then(m => ({ default: m.VisualizarResultados })));
const BancoDeAtivos          = lazy(() => import("./screens/BancoDeAtivos").then(m => ({ default: m.BancoDeAtivos })));
const RelatorioPorPraca      = lazy(() => import("./screens/RelatorioPorPraca").then(m => ({ default: m.RelatorioPorPraca })));
const RelatorioPorExibidor   = lazy(() => import("./screens/RelatorioPorExibidor").then(m => ({ default: m.RelatorioPorExibidor })));
const RelatorioP1A           = lazy(() => import("./screens/RelatorioP1A").then(m => ({ default: m.RelatorioP1A })));
const AdminUsuarios          = lazy(() => import("./screens/Admin").then(m => ({ default: m.AdminUsuarios })));
const AdminPerfis            = lazy(() => import("./screens/Admin").then(m => ({ default: m.AdminPerfis })));
const ExibidoresDashboard    = lazy(() => import("./screens/Admin").then(m => ({ default: m.ExibidoresDashboard })));
const AdminInventarios       = lazy(() => import("./screens/AdminInventarios/AdminInventarios").then(m => ({ default: m.AdminInventarios })));
const BlueprintDiligencia    = lazy(() => import("./screens/BlueprintDiligencia").then(m => ({ default: m.BlueprintDiligencia })));
const DesignSystem           = lazy(() => import("./screens/DesignSystem").then(m => ({ default: m.DesignSystem })));
const MapaDoProduto          = lazy(() => import("./screens/MapaDoProduto").then(m => ({ default: m.MapaDoProduto })));
const PaginaEmDesenvolvimento = lazy(() => import("./components/PaginaEmDesenvolvimento").then(m => ({ default: m.PaginaEmDesenvolvimento })));
const CadastrarExibidor      = lazy(() => import("./screens/CadastrarExibidor/CadastrarExibidor").then(m => ({ default: m.CadastrarExibidor })));
const GestaoExibidores       = lazy(() => import("./screens/GestaoExibidores/GestaoExibidores").then(m => ({ default: m.GestaoExibidores })));
const ListarExibidores       = lazy(() => import("./screens/ListarExibidores/ListarExibidores").then(m => ({ default: m.ListarExibidores })));
const ExibidorDashboard      = lazy(() => import("./screens/Exibidor/ExibidorDashboard").then(m => ({ default: m.ExibidorDashboard })));
const ExibidorImportar       = lazy(() => import("./screens/Exibidor/ExibidorImportar").then(m => ({ default: m.ExibidorImportar })));
const ExibidorInventario     = lazy(() => import("./screens/Exibidor/ExibidorInventario").then(m => ({ default: m.ExibidorInventario })));
const ExibidorEditar         = lazy(() => import("./screens/Exibidor/ExibidorEditar").then(m => ({ default: m.ExibidorEditar })));
const ExibidorExcluir        = lazy(() => import("./screens/Exibidor/ExibidorExcluir").then(m => ({ default: m.ExibidorExcluir })));
const ExibidorSolicitacoes   = lazy(() => import("./screens/Exibidor/ExibidorSolicitacoes").then(m => ({ default: m.ExibidorSolicitacoes })));

// ── Loading mínimo enquanto o chunk carrega ────────────────────────────────
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-gray-200 border-t-[#ff4600] rounded-full animate-spin" />
      <span className="text-sm text-gray-400">Carregando...</span>
    </div>
  </div>
);

function AppGuard({ children }: { children: React.ReactNode }) {
  const { acessoBloqueado } = useAuth();
  if (acessoBloqueado) return <AcessoNegado />;
  return (
    <>
      {children}
      <OcorrenciaWidget />
    </>
  );
}

// Redireciona exibidores para /exibidor/dashboard; demais usuários ficam no HomeDashboard
function HomeGuard() {
  const { isExibidor, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-[#ff4600] rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }
  if (isExibidor) return <Navigate to="/exibidor/dashboard" replace />;
  return <HomeDashboard />;
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
            <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login"    element={<Login />} />
                <Route path="/callback" element={<Callback />} />

                <Route path="/" element={
                  <ProtectedRoute><HomeGuard /></ProtectedRoute>
                } />
                <Route path="/home-dashboard" element={
                  <ProtectedRoute><HomeGuard /></ProtectedRoute>
                } />
                <Route path="/meus-roteiros" element={
                  <ProtectedRoute><MeusRoteiros /></ProtectedRoute>
                } />
                <Route path="/relatorio-p1a" element={
                  <ProtectedRoute><RelatorioP1A /></ProtectedRoute>
                } />
                <Route path="/mapa" element={
                  <ProtectedRoute><Mapa /></ProtectedRoute>
                } />
                <Route path="/criar-roteiro" element={
                  <ProtectedRoute internalOnly><CriarRoteiro /></ProtectedRoute>
                } />
                <Route path="/visualizar-resultados" element={
                  <ProtectedRoute><VisualizarResultados /></ProtectedRoute>
                } />
                <Route path="/consulta-endereco" element={
                  <ProtectedRoute internalOnly><ConsultaEndereco /></ProtectedRoute>
                } />
                <Route path="/banco-de-ativos" element={
                  <ProtectedRoute internalOnly><BancoDeAtivos /></ProtectedRoute>
                } />
                <Route path="/banco-de-ativos/relatorio-por-praca" element={
                  <ProtectedRoute><RelatorioPorPraca /></ProtectedRoute>
                } />
                <Route path="/banco-de-ativos/relatorio-por-exibidor" element={
                  <ProtectedRoute><RelatorioPorExibidor /></ProtectedRoute>
                } />
                <Route path="/banco-de-ativos/exibidores" element={
                  <ProtectedRoute><ListarExibidores /></ProtectedRoute>
                } />
                <Route path="/banco-de-ativos/cadastrar/grupo-midia" element={
                  <ProtectedRoute>
                    <PaginaEmDesenvolvimento
                      titulo="Cadastrar Grupo de Mídia"
                      breadcrumbItems={[
                        { label: "Home", path: "/" },
                        { label: "Banco de ativos", path: "/banco-de-ativos" },
                        { label: "Cadastrar Grupo de Mídia" },
                      ]}
                    />
                  </ProtectedRoute>
                } />
                <Route path="/banco-de-ativos/cadastrar/tipo-midia" element={
                  <ProtectedRoute>
                    <PaginaEmDesenvolvimento
                      titulo="Cadastrar Tipo de Mídia"
                      breadcrumbItems={[
                        { label: "Home", path: "/" },
                        { label: "Banco de ativos", path: "/banco-de-ativos" },
                        { label: "Cadastrar Tipo de Mídia" },
                      ]}
                    />
                  </ProtectedRoute>
                } />
                <Route path="/banco-de-ativos/cadastrar/exibidor" element={
                  <ProtectedRoute internalOnly><GestaoExibidores /></ProtectedRoute>
                } />
                <Route path="/banco-de-ativos/cadastrar/exibidor-form" element={
                  <ProtectedRoute internalOnly><CadastrarExibidor /></ProtectedRoute>
                } />
                <Route path="/banco-de-ativos/importar/arquivo" element={
                  <ProtectedRoute>
                    <PaginaEmDesenvolvimento
                      titulo="Importar Arquivo"
                      breadcrumbItems={[
                        { label: "Home", path: "/" },
                        { label: "Banco de ativos", path: "/banco-de-ativos" },
                        { label: "Importar Arquivo" },
                      ]}
                    />
                  </ProtectedRoute>
                } />

                {/* ── Exibidor ── */}
                <Route path="/exibidor" element={<Navigate to="/exibidor/dashboard" replace />} />
                <Route path="/exibidor/dashboard" element={
                  <ProtectedRoute allowedProfiles={['Exibidor']}><ExibidorDashboard /></ProtectedRoute>
                } />
                <Route path="/exibidor/inventario" element={
                  <ProtectedRoute allowedProfiles={['Exibidor']}><ExibidorInventario /></ProtectedRoute>
                } />
                <Route path="/exibidor/inventario-atual" element={<Navigate to="/exibidor/inventario" replace />} />
                <Route path="/exibidor/importar" element={
                  <ProtectedRoute allowedProfiles={['Exibidor']}><ExibidorImportar /></ProtectedRoute>
                } />
                <Route path="/exibidor/editar" element={
                  <ProtectedRoute allowedProfiles={['Exibidor']}><ExibidorEditar /></ProtectedRoute>
                } />
                <Route path="/exibidor/excluir" element={
                  <ProtectedRoute allowedProfiles={['Exibidor']}><ExibidorExcluir /></ProtectedRoute>
                } />
                <Route path="/exibidor/solicitacoes" element={
                  <ProtectedRoute allowedProfiles={['Exibidor']}><ExibidorSolicitacoes /></ProtectedRoute>
                } />

                {/* ── Admin ── */}
                <Route path="/admin/exibidores-dashboard" element={
                  <ProtectedRoute internalOnly adminOnly><ExibidoresDashboard /></ProtectedRoute>
                } />
                <Route path="/admin/usuarios" element={
                  <ProtectedRoute internalOnly adminOnly><AdminUsuarios /></ProtectedRoute>
                } />
                <Route path="/admin/perfis" element={
                  <ProtectedRoute internalOnly adminOnly><AdminPerfis /></ProtectedRoute>
                } />
                <Route path="/admin/inventarios-exibidor" element={
                  <ProtectedRoute internalOnly adminOnly><AdminInventarios /></ProtectedRoute>
                } />
                <Route path="/admin/blueprint" element={
                  <ProtectedRoute internalOnly adminOnly><BlueprintDiligencia /></ProtectedRoute>
                } />
                <Route path="/admin/design-system" element={
                  <ProtectedRoute internalOnly adminOnly><DesignSystem /></ProtectedRoute>
                } />
                <Route path="/admin/mapa-do-produto" element={
                  <ProtectedRoute internalOnly adminOnly><MapaDoProduto /></ProtectedRoute>
                } />

                <Route path="*" element={<div>Página não encontrada</div>} />
              </Routes>
            </Suspense>
            </ErrorBoundary>
          </AppGuard>
        </BrowserRouter>
      </AuthProvider>
    </Auth0Provider>
  </StrictMode>
);
