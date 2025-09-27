import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './authProvider'

export function RequireAuth({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    const location = useLocation()

    // Während dem Laden
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#9ecdfb] via-[#c2dcff] to-[#f1f6ff] flex items-center justify-center">
                <div className="bg-white rounded-lg p-8 shadow-lg border border-[#7fa6f7]">
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 border-2 border-[#0a4bdd] border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-[#0a4bdd] font-medium">Lade Alles Bene Chat...</span>
                    </div>
                </div>
            </div>
        )
    }

    // Nicht eingeloggt
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    // Eingeloggt
    return <>{children}</>
}