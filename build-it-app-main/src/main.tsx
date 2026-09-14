import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppErrorBoundary from "./components/AppErrorBoundary.tsx";
import "./index.css";
import { startMonitoring } from "./lib/monitoring";

const stopMonitoring = startMonitoring();
if (import.meta.hot) import.meta.hot.dispose(stopMonitoring);

createRoot(document.getElementById("root")!).render(<AppErrorBoundary><App /></AppErrorBoundary>);
