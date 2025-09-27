import { signInWithPopup, signInAnonymously } from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { OAuthProvider } from 'firebase/auth'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth'
import { useEffect, useState } from 'react'

const microsoftProvider = new OAuthProvider('microsoft.com')

export function LoginPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { user, loading, initializing } = useAuth()
    const [isLoggingIn, setIsLoggingIn] = useState(false)

    // Woher kam der User?
    const from = location.state?.from?.pathname || '/'

    useEffect(() => {
        // Warte bis Auth vollständig initialisiert ist
        if (initializing || loading) {
            return  // Tue nichts während des Ladens
        }

        // Nur navigieren wenn User vorhanden UND wir nicht gerade am einloggen sind
        if (user && !isLoggingIn) {
            console.log('User detected, navigating to:', from)
            // Kleine Verzögerung um sicherzustellen dass Auth-State stabil ist
            const timer = setTimeout(() => {
                navigate(from, { replace: true })
            }, 100)

            return () => clearTimeout(timer)
        }
    }, [user, navigate, from, initializing, loading, isLoggingIn])

    const handleGoogleLogin = async () => {
        try {
            setIsLoggingIn(true)
            await signInWithPopup(auth, googleProvider)
            // Navigation erfolgt über useEffect
        } catch (error) {
            console.error('Google login error:', error)
            alert('Login fehlgeschlagen. Bitte versuche es erneut.')
            setIsLoggingIn(false)
        }
    }

    const handleMicrosoftLogin = async () => {
        try {
            setIsLoggingIn(true)
            await signInWithPopup(auth, microsoftProvider)
            // Navigation erfolgt über useEffect
        } catch (error) {
            console.error('Microsoft login error:', error)
            alert('Login fehlgeschlagen. Bitte versuche es erneut.')
            setIsLoggingIn(false)
        }
    }

    const handleAnonymousLogin = async () => {
        try {
            setIsLoggingIn(true)
            await signInAnonymously(auth)
            // Navigation erfolgt über useEffect
        } catch (error) {
            console.error('Anonymous login error:', error)
            alert('Login fehlgeschlagen. Bitte versuche es erneut.')
            setIsLoggingIn(false)
        }
    }

    // Zeige nichts während der initialen Auth-Prüfung
    if (initializing || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#9ecdfb] via-[#c2dcff] to-[#f1f6ff]">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0054E3]"></div>
                    <p className="mt-4 text-[#0054E3] font-semibold">Prüfe Anmeldestatus...</p>
                </div>
            </div>
        )
    }

    return (
        <section className="relative min-h-screen bg-gradient-to-br from-[#9ecdfb] via-[#c2dcff] to-[#f1f6ff] flex items-center justify-center overflow-hidden px-4 py-10">
            <div className="absolute -top-16 -left-20 w-64 h-64 bg-[radial-gradient(circle,#fff8,transparent_70%)] blur-2xl" />
            <div className="absolute bottom-10 right-10 w-72 h-72 bg-[radial-gradient(circle,#7fb3ff33,transparent_70%)] blur-3xl" />

            <div className="relative w-full max-w-4xl rounded-[18px] border border-[#7fa6f7] bg-white/90 backdrop-blur-sm shadow-[0_18px_40px_rgba(40,94,173,0.25)] overflow-hidden md:grid md:grid-cols-[1fr,1.1fr]">
                <div className="bg-gradient-to-b from-[#4f82ff] via-[#356ef0] to-[#1f4ebf] text-white px-8 py-10 flex flex-col justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16">
                            <span className="absolute inset-0 rounded-full bg-white/35 backdrop-blur-sm" />
                            <svg
                                className="absolute inset-[18%] text-white"
                                viewBox="0 0 80 80"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <circle cx="29" cy="30" r="11" fill="#FFD978" />
                                <circle cx="49" cy="30" r="11" fill="#8FD1FF" />
                                <path
                                    d="M18 57c1.5-9.5 10-14 20.5-14S57 47.5 58.5 57"
                                    stroke="#F8FAFF"
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm uppercase tracking-[0.2em] text-[#d7e6ff]">
                                Willkommen zurück
                            </p>
                            <h2 className="text-2xl font-semibold leading-snug" style={{ fontFamily: 'Trebuchet MS, Tahoma, sans-serif' }}>
                                Fast wie MSN Messenger.<br /> Nur mit Alles Bene Flair.
                            </h2>
                        </div>
                    </div>

                    <div className="mt-10 space-y-4 text-[#e9f1ff] text-sm" style={{ fontFamily: 'Tahoma, Verdana, sans-serif' }}>
                        <div className="flex items-center gap-3">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-lg font-semibold">
                                😊
                            </span>
                            <p>Bleibe mit deinen Benedict-Nerds verbunden – nostalgisch wie 2005.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-lg font-semibold">
                                🔔
                            </span>
                            <p>Benachrichtigungen im klassischen Stil – inklusive imaginärem &quot;Wink&quot;.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-lg font-semibold">
                                💬
                            </span>
                            <p>Chats in vertrauter Messenger-Optik mit einer Prise Retro-Charme.</p>
                        </div>
                    </div>

                    <p className="mt-12 text-xs text-[#d7e6ff]/80" style={{ fontFamily: 'Tahoma, Verdana, sans-serif' }}>
                        Alles Bene Chat © 2025 · Imad Chatila · Ricardo Santos Lopes · Mathias Bäumli
                        <br />
                    </p>
                </div>

                <div>
                    <div className="px-8 py-10 space-y-8">
                        <div className="space-y-2">
                            <h1 className="text-3xl text-[#2d4ea0] font-semibold tracking-tight" style={{ fontFamily: 'Trebuchet MS, Tahoma, sans-serif' }}>
                                Alles Bene Chat
                            </h1>
                            <p className="text-sm text-[#4f63a7]" style={{ fontFamily: 'Tahoma, Verdana, sans-serif' }}>
                                Melde dich mit deinem Lieblingskonto an oder springe direkt anonym in den Chat.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={handleMicrosoftLogin}
                                disabled={isLoggingIn}
                                className="w-full flex items-center justify-between gap-3 rounded-md border border-[#a6bfff] bg-gradient-to-b from-[#ffffff] via-[#f2f6ff] to-[#d5e2ff] px-4 py-3 text-left text-[#2d4ea0] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_6px_12px_rgba(45,78,160,0.15)] transition-transform duration-200 hover:-translate-y-[2px] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_18px_rgba(45,78,160,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ fontFamily: 'Tahoma, Verdana, sans-serif' }}
                            >
                                <span className="flex items-center gap-3">
                                    <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-[#f2f7ff] border border-[#a6bfff]">
                                        <svg className="h-5 w-5 text-[#2d4ea0]" viewBox="0 0 24 24" aria-hidden>
                                            <path fill="#f35325" d="M11.5 11.5V4H4v7.5z" />
                                            <path fill="#81bc06" d="M20 11.5V4h-7.5v7.5z" />
                                            <path fill="#05a6f0" d="M11.5 20v-7.5H4V20z" />
                                            <path fill="#ffba08" d="M20 20v-7.5h-7.5V20z" />
                                        </svg>
                                    </span>
                                    <span>
                                        <span className="block text-sm font-semibold line-through">Mit Microsoft anmelden</span>
                                        <span className="block text-xs text-[#6075b7]">Aktuell nicht verfügbar</span>
                                    </span>
                                </span>
                                <span className="text-xs text-[#6075b7]">Aktuell nicht verfügbar ›</span>
                            </button>

                            <button
                                onClick={handleGoogleLogin}
                                disabled={isLoggingIn}
                                className="w-full flex items-center justify-between gap-3 rounded-md border border-[#a6bfff] bg-white px-4 py-3 text-left text-[#2d4ea0] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_12px_rgba(45,78,160,0.1)] transition-transform duration-200 hover:-translate-y-[2px] hover:bg-[#f6f9ff] disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ fontFamily: 'Tahoma, Verdana, sans-serif' }}
                            >
                                <span className="flex items-center gap-3">
                                    <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-[#f2f6ff] border border-[#a6bfff]">
                                        <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden>
                                            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12 0-6.627 5.373-12 12-12 3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24c0 11.045 8.955 20 20 20 11.045 0 20-8.955 20-20 0-1.341-.138-2.65-.389-3.917Z" />
                                            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691Z" />
                                            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44Z" />
                                            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z" />
                                        </svg>
                                    </span>
                                    <span>
                                        <span className="block text-sm font-semibold">
                                            {isLoggingIn ? 'Anmeldung läuft...' : 'Mit Google anmelden'}
                                        </span>
                                        <span className="block text-xs text-[#6075b7]">Der schnelle Login mit modernem Konto</span>
                                    </span>
                                </span>
                                <span className="text-xs text-[#6075b7]">Weiter ›</span>
                            </button>

                            <button
                                onClick={handleAnonymousLogin}
                                disabled={isLoggingIn}
                                className="w-full flex items-center justify-between gap-3 rounded-md border border-[#a6bfff] bg-[#f4f7ff] px-4 py-3 text-left text-[#2d4ea0] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_9px_rgba(45,78,160,0.08)] transition-transform duration-200 hover:-translate-y-[2px] hover:bg-[#e9f0ff] disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ fontFamily: 'Tahoma, Verdana, sans-serif' }}
                            >
                                <span className="flex items-center gap-3">
                                    <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-[#edf3ff] border border-[#a6bfff] text-lg">
                                        👤
                                    </span>
                                    <span>
                                        <span className="block text-sm font-semibold">
                                            {isLoggingIn ? 'Anmeldung läuft...' : 'Anonym beitreten'}
                                        </span>
                                        <span className="block text-xs text-[#6075b7]">Ohne Konto – einfach loschatten wie damals</span>
                                    </span>
                                </span>
                                <span className="text-xs text-[#6075b7]">Los! ›</span>
                            </button>
                        </div>

                        <div className="rounded-lg border border-[#b9ccff] bg-gradient-to-b from-white/80 to-white/40 px-4 py-3 text-[11px] text-[#5f73b3]" style={{ fontFamily: 'Tahoma, Verdana, sans-serif' }}>
                            Tipp: Setze deinen Status später direkt auf „Online" oder „Beschäftigt" – genau wie bei MSN.
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}