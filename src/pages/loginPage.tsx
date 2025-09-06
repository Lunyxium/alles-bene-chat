import { signInWithPopup, signInAnonymously } from 'firebase/auth'
import { auth, googleProvider, githubProvider } from '@/lib/firebase'

export function LoginPage() {
    return (
        <section className="grid place-content-center gap-3 py-12 text-center">
            <h1 className="text-2xl font-bold">Retro-Chat Login</h1>
            <button className="btn" onClick={() => signInWithPopup(auth, googleProvider)}>Mit Google</button>
            <button className="btn" onClick={() => signInWithPopup(auth, githubProvider)}>Mit GitHub</button>
            <button className="btn" onClick={() => signInAnonymously(auth)}>Anonym</button>
            <style>{`.btn{border:1px solid; padding:.5rem 1rem; border-radius:.5rem}`}</style>
        </section>
    )
}
