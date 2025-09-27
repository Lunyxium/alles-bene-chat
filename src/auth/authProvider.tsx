import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '@/lib/firebase'

type AuthCtx = {
    user: User | null
    loading: boolean
    initializing: boolean  // Neuer State für initiale Auth-Prüfung
}

const Ctx = createContext<AuthCtx>({
    user: null,
    loading: true,
    initializing: true
})

export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [initializing, setInitializing] = useState(true)

    useEffect(() => {
        // Wichtig: onAuthStateChanged wird IMMER mindestens einmal gefeuert
        // auch wenn kein User eingeloggt ist
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            console.log('Auth State Changed:', u?.email || 'null')
            setUser(u)
            setLoading(false)
            // Nach dem ersten Check ist die App nicht mehr im "initializing" State
            if (initializing) {
                setInitializing(false)
            }
        })

        return () => unsubscribe()
    }, [initializing])

    return (
        <Ctx.Provider value={{ user, loading, initializing }}>
            {children}
        </Ctx.Provider>
    )
}