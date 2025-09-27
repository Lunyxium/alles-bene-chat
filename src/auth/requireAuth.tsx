import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './authProvider'

export function RequireAuth({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    const location = useLocation()

    // Zeige Ladeindikator während Auth-Status geprüft wird
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#9ecdfb] via-[#c2dcff] to-[#f1f6ff]">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0054E3]"></div>
                    <p className="mt-4 text-[#0054E3] font-semibold">Lade...</p>
                </div>
            </div>
        )
    }

    // Wenn nicht eingeloggt, zu /login mit der from-Location weiterleiten
    if (!user) {
        // Speichere die aktuelle Location, um nach Login dorthin zurückzukehren
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    // User ist eingeloggt, zeige die geschützte Komponente
    return <>{children}</>
}