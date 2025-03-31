import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // Importiere hier deine Tailwind-Styles
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { QuizProvider } from "./QuizContext";

const queryClient = new QueryClient();

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement!);

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <QuizProvider>
        <App />
      </QuizProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
