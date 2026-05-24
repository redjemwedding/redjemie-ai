import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style:{
            background:'#161616',
            color:'#fff',
            border:'1px solid rgba(255,255,255,0.07)',
            fontFamily:'Poppins,sans-serif',
            fontSize:'0.82rem'
          },
          success:{ iconTheme:{ primary:'#22c55e', secondary:'#161616' } },
          error:{ iconTheme:{ primary:'#E5181B', secondary:'#161616' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
