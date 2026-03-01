import './assets/main.css'
import { initTheme } from './store/useThemeStore'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

// Apply the persisted theme to <html> synchronously before the first render
// so there's no flash of the wrong colour scheme.
initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
