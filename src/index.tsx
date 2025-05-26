import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MeusRoteiros } from "./screens/MeusRoteiros";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <MeusRoteiros />
  </StrictMode>,
);
