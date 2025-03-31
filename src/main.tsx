import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { initDebugMode } from "./QuizDebug";
import { QuizProvider } from "./QuizContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <QuizProvider>
        <App />
      </QuizProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
