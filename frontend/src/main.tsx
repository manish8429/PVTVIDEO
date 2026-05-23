import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'hsl(0 0% 8%)',
            color: 'hsl(0 0% 100%)',
            border: '1px solid hsl(0 0% 20%)',
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
            fontFamily: 'Inter, sans-serif',
          },
          success: {
            iconTheme: { primary: '#fff', secondary: '#000' },
          },
          error: {
            iconTheme: { primary: '#ff4444', secondary: '#000' },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
