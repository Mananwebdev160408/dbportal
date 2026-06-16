// Handle dynamic import failures (e.g. when the app is rebuilt and old chunks are missing)
window.addEventListener("vite:preloadError", (event) => {
  const hasReloaded = sessionStorage.getItem("dbportal-preload-reloaded");
  if (!hasReloaded) {
    sessionStorage.setItem("dbportal-preload-reloaded", "true");
    window.location.reload();
  }
});

// Clear the reload flag on successful load
sessionStorage.removeItem("dbportal-preload-reloaded");

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "@xyflow/react/dist/style.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
