import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute/ProtectedRoute";
import { Login } from "./screens/Login";
import { MeusRoteiros } from "./screens/MeusRoteiros";
import { Mapa } from "./screens/Mapa";
import { CriarRoteiro } from "./screens/CriarRoteiro";
import '../tailwind.css';
import 'leaflet/dist/leaflet.css';

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
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
          <Route path="*" element={<div>Página não encontrada</div>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
);
