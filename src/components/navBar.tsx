import { Link, useLocation } from 'react-router-dom'
import { auth } from '@/lib/firebase'

export function NavBar() {
    const location = useLocation()

    // Hide navbar on chat page (MSN window has its own controls)
    if (location.pathname === '/') {
        return null
    }

    return (
        <header className="sticky top-0 z-10 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/40 dark:bg-zinc-900/60">
            <div className="mx-auto flex max-w-3xl items-center justify-between p-3">
                <Link to="/" className="font-semibold text-[#0054E3]">Alles Bene Chat</Link>
                <nav className="flex gap-3 text-sm">
                    <Link to="/" className="text-[#0054E3] hover:text-[#0046C7]">Chat</Link>
                    <Link to="/profile" className="text-[#0054E3] hover:text-[#0046C7]">Profil</Link>
                    {auth.currentUser && (
                        <button
                            onClick={() => auth.signOut()}
                            className="rounded px-2 py-1 text-[#DC2626] hover:bg-red-50"
                        >
                            Logout
                        </button>
                    )}
                </nav>
            </div>
        </header>
    )
}