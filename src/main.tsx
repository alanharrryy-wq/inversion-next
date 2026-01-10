import React from "react"
import ReactDOM from "react-dom/client"
import "@/index.css"
import { App } from "@/app/App"
/* [hitech] mocking bootstrap */
async function enableMocking() {
  const env = (import.meta && import.meta.env) ? import.meta.env : {};
  const isDev = !!env.DEV;
  const flag = String(env.VITE_ENABLE_MOCKS ?? 'true');
  const shouldMock = isDev && flag !== 'false';
  if (!shouldMock) return;
  const mod = await import('./shared/mocks/browser');
  await mod.worker.start({ onUnhandledRequest: 'bypass' });
}


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
