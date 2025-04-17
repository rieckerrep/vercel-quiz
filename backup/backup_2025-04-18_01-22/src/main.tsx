import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { initDebugMode } from "./QuizDebug";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import './styles/Progress.css';

// Debug-Modus initialisieren, falls aktiviert
initDebugMode();

// QueryClient für React Query erstellen
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 Minute
      retry: 1,
    },
  },
});

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
