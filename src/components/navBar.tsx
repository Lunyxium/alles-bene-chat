import { Link } from 'react-router-dom'
import { auth } from '@/lib/firebase'

export function NavBar() {
    return (
        <header className="sticky top-0 z-10 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/40 dark:bg-zinc-900/60">
            <div className="mx-auto flex max-w-3xl items-center justify-between p-3">
                <Link to="/" className="font-semibold">alles-bene-chat</Link>
                <nav className="flex gap-3 text-sm">
                    <Link to="/">Chat</Link>
                    <Link to="/profile">Profil</Link>
                    <button onClick={() => auth.signOut()} className="rounded px-2 py-1 hover:bg-zinc-200 dark:hover:bg-zinc-800">Logout</button>
                </nav>
            </div>
        </header>
    )
}
