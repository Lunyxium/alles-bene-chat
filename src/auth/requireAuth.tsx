import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './authProvider'

export function RequireAuth({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    const loc = useLocation()
    if (loading) return <div className="p-6">Lade…</div>
    if (!user) return <Navigate to="/login" state={{ from: loc }} replace />
    return <>{children}</>
}
