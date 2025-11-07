import React from "react";
import { createRoot } from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";
import App from "./App.tsx";
import "./index.css";
import { msalInstance } from "@/auth/msalInstance";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root element not found");
}

const renderApp = () => {
  createRoot(container).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </React.StrictMode>,
  );
};

msalInstance
  .initialize()
  .then(renderApp)
  .catch((error) => {
    console.error("Failed to initialize MSAL", error);
  });
