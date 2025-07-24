import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MeusRoteiros } from "./screens/MeusRoteiros";
import { Mapa } from "./screens/Mapa";
import '../tailwind.css';
import 'leaflet/dist/leaflet.css';

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MeusRoteiros />} />
        <Route path="/mapa" element={<Mapa />} />
        <Route path="*" element={<div>Página não encontrada</div>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
