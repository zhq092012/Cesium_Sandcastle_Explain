import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Preview from './Preview.tsx'

// Cesium 在 viewer.destroy() 时会产生内部 cancelation rejection，
// React StrictMode 的 double-mount 会触发这个问题，这里全局过滤掉
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.type === 'cancelation') {
    event.preventDefault();
  }
});

const pathname = window.location.pathname;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {pathname.startsWith('/preview/') ? <Preview /> : <App />}
  </StrictMode>,
)
