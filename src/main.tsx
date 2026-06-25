import '@vitejs/plugin-react/preamble';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

if (/HarmonyOS/i.test(navigator.userAgent)) {
  document.documentElement.classList.add('harmony-os');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
