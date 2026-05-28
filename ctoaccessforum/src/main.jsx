import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '0.5px solid rgba(255,255,255,0.08)',
            fontFamily: 'Poppins, sans-serif',
            fontSize: '0.8rem',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#E5181B', secondary: '#fff' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
