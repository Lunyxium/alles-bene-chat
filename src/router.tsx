import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { LoginPage, ChatPage, ProfilePage } from './pages'
import { RequireAuth } from './auth'
import { useAuth } from './auth'

// Root Component die den Auth-State prüft
function RootRoute() {
    const { user, loading, initializing } = useAuth()

    // Während der initialen Auth-Prüfung zeige Ladeindikator
    if (loading || initializing) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#9ecdfb] via-[#c2dcff] to-[#f1f6ff]">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0054E3]"></div>
                    <p className="mt-4 text-[#0054E3] font-semibold">Lade Alles Bene Chat...</p>
                </div>
            </div>
        )
    }

    // Wenn User eingeloggt ist -> Chat, sonst -> Login
    if (user) {
        return <ChatPage />
    } else {
        return <Navigate to="/login" replace />
    }
}

export const appRouter = createBrowserRouter([
    {
        path: '/',
        element: <RootRoute />  // Intelligente Root-Route
    },
    {
        path: '/login',
        element: <LoginPage />
    },
    {
        path: '/chat',  // Explizite Chat-Route als Fallback
        element: <RequireAuth><ChatPage /></RequireAuth>
    },
    {
        path: '/profile',
        element: <RequireAuth><ProfilePage /></RequireAuth>
    },
    {
        path: '*',
        element: <Navigate to="/" replace />  // Alles andere -> Root
    }
])