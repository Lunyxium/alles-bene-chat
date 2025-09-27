import { createBrowserRouter } from 'react-router-dom'
import { LoginPage, ChatPage, ProfilePage } from './pages'
import { RequireAuth } from './auth'

export const appRouter = createBrowserRouter([
    {
        path: '/',
        element: <RequireAuth><ChatPage /></RequireAuth>
    },
    {
        path: '/login',
        element: <LoginPage />
    },
    {
        path: '/chat',
        element: <RequireAuth><ChatPage /></RequireAuth>
    },
    {
        path: '/profile',
        element: <RequireAuth><ProfilePage /></RequireAuth>
    }
])