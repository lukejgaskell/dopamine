import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DialogProvider } from './components/Dialog'
import './theme.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DialogProvider>
      <App />
    </DialogProvider>
  </StrictMode>,
)
