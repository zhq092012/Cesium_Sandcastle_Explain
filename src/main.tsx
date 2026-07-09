import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Preview from './Preview.tsx'

const pathname = window.location.pathname;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {pathname.startsWith('/preview/') ? <Preview /> : <App />}
  </StrictMode>,
)
