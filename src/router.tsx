import { createBrowserRouter } from 'react-router-dom'
import { LoginPage, ChatPage, ProfilePage } from './pages'
import { RequireAuth } from './auth'

export const appRouter = createBrowserRouter([
    {
        path: '/',
        element: <RequireAuth><ChatPage /></RequireAuth>  // Chat als Hauptseite mit Auth-Schutz
    },
    {
        path: '/login',
        element: <LoginPage />
    },
    {
        path: '/profile',
        element: <RequireAuth><ProfilePage /></RequireAuth>
    },
    {
        path: '*',
        element: <RequireAuth><ChatPage /></RequireAuth>  // Fallback zu Chat für unbekannte Routes
    }
])