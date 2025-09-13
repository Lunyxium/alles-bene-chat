import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { appRouter } from './router'
import './app.css'
import { AuthProvider } from './auth'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <AuthProvider>
            <RouterProvider router={appRouter} />
        </AuthProvider>
    </React.StrictMode>
)