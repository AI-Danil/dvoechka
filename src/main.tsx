import "./bootstrap.ts";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import "./index.css";

const rootEl = document.getElementById("root")!;
createRoot(rootEl).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
