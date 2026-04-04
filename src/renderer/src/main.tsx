import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './App.css'
import './styles/button-next-hint.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
