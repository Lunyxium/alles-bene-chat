import React from 'react'
import { NavBar } from './components'

export default function App({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100">
            <NavBar />
            <main className="mx-auto max-w-3xl p-4">{children}</main>
        </div>
    )
}
