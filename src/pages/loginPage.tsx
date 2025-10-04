import {
    signInWithPopup,
    signInAnonymously,
    fetchSignInMethodsForEmail,
    AuthErrorCodes,
    GoogleAuthProvider,
    GithubAuthProvider,
    linkWithCredential,
    AuthCredential
} from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import { auth, googleProvider, githubProvider } from '@/lib/firebase'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth'
import { useEffect, useState } from 'react'
import { ThemeSwitcher } from '@/components/themeSwitcher'
import { useTheme } from '@/hooks/useTheme'

export function LoginPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { user, loading, initializing } = useAuth()
    const [isLoggingIn, setIsLoggingIn] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const { theme } = useTheme()
    const isDark = theme === 'dark'

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

    const handleAccountLinking = async (
        error: unknown,
        attemptedProvider: 'google' | 'github'
    ) => {
        if (!(error instanceof FirebaseError)) {
            console.error(`${attemptedProvider} login error`, error)
            setErrorMessage('Login fehlgeschlagen. Bitte versuche es erneut.')
            return
        }

        if (error.code !== AuthErrorCodes.ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL) {
            console.error(`${attemptedProvider} login error`, error)
            setErrorMessage('Login fehlgeschlagen. Bitte versuche es erneut.')
            return
        }

        const pendingCredential =
            attemptedProvider === 'github'
                ? GithubAuthProvider.credentialFromError(error)
                : GoogleAuthProvider.credentialFromError(error)

        const email = (error.customData?.email as string) || ''

        if (!email) {
            setErrorMessage(
                'Diese E-Mail ist bereits mit einem anderen Anbieter verknüpft. Bitte melde dich mit dem ursprünglichen Anbieter an.'
            )
            return
        }

        try {
            const signInMethods = await fetchSignInMethodsForEmail(auth, email)

            const linkWithExistingProvider = async (credential: AuthCredential | null | undefined, provider: 'google' | 'github') => {
                if (!credential) {
                    setErrorMessage(
                        'Verknüpfung nicht möglich. Bitte melde dich zuerst mit dem ursprünglichen Anbieter an und versuche es erneut.'
                    )
                    return
                }

                const result = await signInWithPopup(auth, provider === 'google' ? googleProvider : githubProvider)
                await linkWithCredential(result.user, credential)
                setErrorMessage(null)
            }

            if (signInMethods.includes('google.com')) {
                await linkWithExistingProvider(pendingCredential, 'google')
                return
            }

            if (signInMethods.includes('github.com')) {
                await linkWithExistingProvider(pendingCredential, 'github')
                return
            }

            if (signInMethods.includes('password')) {
                setErrorMessage(
                    'Dieses Konto nutzt ein Passwort. Bitte melde dich per E-Mail & Passwort an und verknüpfe weitere Anbieter anschließend in deinen Kontoeinstellungen.'
                )
                return
            }

            if (signInMethods.length > 0) {
                setErrorMessage(
                    `Diese E-Mail ist bereits mit folgenden Anbietern verknüpft: ${signInMethods.join(', ')}. Bitte melde dich mit einem dieser Anbieter an.`
                )
                return
            }

            setErrorMessage(
                'Diese E-Mail ist bereits mit einem anderen Anbieter verknüpft. Bitte melde dich mit dem ursprünglichen Anbieter an.'
            )
        } catch (linkingError) {
            console.error('Provider linking failed', linkingError)
            setErrorMessage('Verknüpfung fehlgeschlagen. Bitte versuche es erneut oder wähle einen anderen Anbieter.')
        }
    }

    const handleGoogleLogin = async () => {
        try {
            setIsLoggingIn(true)
            setErrorMessage(null)
            await signInWithPopup(auth, googleProvider)
            // Navigation erfolgt über useEffect
        } catch (error) {
            await handleAccountLinking(error, 'google')
        } finally {
            setIsLoggingIn(false)
        }
    }

    const handleGithubLogin = async () => {
        try {
            setIsLoggingIn(true)
            setErrorMessage(null)
            await signInWithPopup(auth, githubProvider)
            // Navigation erfolgt über useEffect
        } catch (error) {
            await handleAccountLinking(error, 'github')
        } finally {
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
        } finally {
            setIsLoggingIn(false)
        }
    }

    const backgroundGradient = isDark
        ? 'bg-gradient-to-br from-[#0b1120] via-[#10172a] to-[#0f172a]'
        : 'bg-gradient-to-br from-[#9ecdfb] via-[#c2dcff] to-[#f1f6ff]'

    const accentGlowPrimary = isDark
        ? 'bg-[radial-gradient(circle,#1d4ed824,transparent_70%)]'
        : 'bg-[radial-gradient(circle,#fff8,transparent_70%)]'

    const accentGlowSecondary = isDark
        ? 'bg-[radial-gradient(circle,#312e8130,transparent_70%)]'
        : 'bg-[radial-gradient(circle,#7fb3ff33,transparent_70%)]'

    const cardWrapperClass = isDark
        ? 'border border-[#1d3a7a] bg-[#0f172a]/90 text-[#dbeafe] shadow-[0_18px_40px_rgba(10,31,68,0.45)]'
        : 'border border-[#7fa6f7] bg-white/90 text-[#2d4ea0] shadow-[0_18px_40px_rgba(40,94,173,0.25)]'

    const heroPanelClass = isDark
        ? 'bg-gradient-to-b from-[#1d4ed8] via-[#1e3a8a] to-[#0b1a3b] text-[#e2e8f0]'
        : 'bg-gradient-to-b from-[#4f82ff] via-[#356ef0] to-[#1f4ebf] text-white'

    const heroLeadClass = isDark ? 'text-[#bfdbfe]' : 'text-[#d7e6ff]'
    const heroSubTextClass = isDark ? 'text-[#93c5fd]' : 'text-[#d9e7ff]'
    const rightPanelTitleClass = isDark ? 'text-[#dbeafe]' : 'text-[#2d4ea0]'
    const rightPanelTextClass = isDark ? 'text-[#9fb7dd]' : 'text-[#4f63a7]'

    const buttonBaseClass = 'w-full flex items-center justify-between gap-3 rounded-md px-4 py-3 text-left transition-transform duration-200 hover:-translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed'

    const githubButtonClass = isDark
        ? `${buttonBaseClass} border border-[#1d3a7a] bg-[#14203d] text-[#93c5fd] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_6px_12px_rgba(15,23,42,0.45)] hover:bg-[#1a2a4f]`
        : `${buttonBaseClass} border border-[#a6bfff] bg-gradient-to-b from-[#ffffff] via-[#f2f6ff] to-[#d5e2ff] text-[#2d4ea0] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_6px_12px_rgba(45,78,160,0.15)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_18px_rgba(45,78,160,0.2)]`

    const secondaryTextClass = isDark ? 'text-[#647bb0]' : 'text-[#6075b7]'

    const googleButtonClass = isDark
        ? `${buttonBaseClass} border border-[#1d3a7a] bg-[#0f172a] text-[#dbeafe] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_6px_12px_rgba(15,23,42,0.45)] hover:bg-[#17203b]`
        : `${buttonBaseClass} border border-[#a6bfff] bg-white text-[#2d4ea0] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_12px_rgba(45,78,160,0.1)] hover:bg-[#f6f9ff]`

    const anonymousButtonClass = isDark
        ? `${buttonBaseClass} border border-[#1d3a7a] bg-[#14203d] text-[#cbd5f5] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_6px_12px_rgba(15,23,42,0.45)] hover:bg-[#1a2a4f]`
        : `${buttonBaseClass} border border-[#9eb8ff] bg-gradient-to-b from-white to-[#e6eeff] text-[#2d4ea0] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_6px_12px_rgba(45,78,160,0.12)]`

    // Zeige nichts während der initialen Auth-Prüfung
    if (initializing || loading) {
        return (
            <div className={`relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-10 ${backgroundGradient}`}>
                <div className="absolute right-5 top-5">
                    <ThemeSwitcher size="sm" />
                </div>
                <div className="text-center">
                    <div className={`inline-block h-12 w-12 animate-spin rounded-full border-b-2 ${isDark ? 'border-[#60a5fa]' : 'border-[#0054E3]'}`}></div>
                    <p className={`mt-4 font-semibold ${isDark ? 'text-[#bfdbfe]' : 'text-[#0054E3]'}`}>
                        Prüfe Anmeldestatus...
                    </p>
                </div>
            </div>
        )
    }

    return (
        <section className={`relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-10 ${backgroundGradient}`}>
            <div className={`absolute -top-16 -left-20 h-64 w-64 blur-2xl ${accentGlowPrimary}`} />
            <div className={`absolute bottom-10 right-10 h-72 w-72 blur-3xl ${accentGlowSecondary}`} />

            <div className={`relative w-full max-w-4xl rounded-[18px] backdrop-blur-sm overflow-hidden md:grid md:grid-cols-[1fr,1.1fr] ${cardWrapperClass}`}>
                <div className={`${heroPanelClass} px-8 py-10 flex flex-col justify-between`}>
                    <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16">
                            <span className={`absolute inset-0 rounded-full backdrop-blur-sm ${isDark ? 'bg-white/25' : 'bg-white/35'}`} />
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
                            <p className={`text-sm uppercase tracking-[0.2em] ${heroLeadClass}`}>
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

                <div className={isDark ? 'bg-[#101a32]/85' : 'bg-white/80'}>
                    <div className="px-8 py-10 space-y-8">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-4">
                                <h1 className={`text-3xl font-semibold tracking-tight ${rightPanelTitleClass}`} style={{ fontFamily: 'Trebuchet MS, Tahoma, sans-serif' }}>
                                    Alles Bene Chat
                                </h1>
                                <ThemeSwitcher size="sm" />
                            </div>
                            <p className={`text-sm ${rightPanelTextClass}`} style={{ fontFamily: 'Tahoma, Verdana, sans-serif' }}>
                                Melde dich mit deinem Lieblingskonto an oder springe direkt anonym in den Chat.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {errorMessage && (
                                <div
                                    className={
                                        isDark
                                            ? 'rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200'
                                            : 'rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'
                                    }
                                    style={{ fontFamily: 'Tahoma, Verdana, sans-serif' }}
                                >
                                    {errorMessage}
                                </div>
                            )}

                            <button
                                onClick={handleGithubLogin}
                                disabled={isLoggingIn}
                                className={githubButtonClass}
                                style={{ fontFamily: 'Tahoma, Verdana, sans-serif' }}
                            >
                                <span className="flex items-center gap-3">
                                    <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-[#f2f7ff] border border-[#a6bfff]">
                                        <svg className="h-5 w-5 text-[#2d4ea0]" viewBox="0 0 24 24" aria-hidden>
                                            <path
                                                fill="currentColor"
                                                d="M12 .5a12 12 0 0 0-3.793 23.4c.6.112.82-.26.82-.577 0-.285-.01-1.04-.016-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.388-1.333-1.758-1.333-1.758-1.09-.744.083-.729.083-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.809 1.304 3.492.997.108-.776.418-1.305.76-1.605-2.665-.303-5.466-1.332-5.466-5.931 0-1.31.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.009-.323 3.305 1.23a11.52 11.52 0 0 1 6.018 0c2.296-1.553 3.303-1.23 3.303-1.23.655 1.652.243 2.873.12 3.176.77.84 1.235 1.911 1.235 3.221 0 4.61-2.805 5.625-5.477 5.922.43.37.814 1.102.814 2.222 0 1.607-.015 2.902-.015 3.296 0 .32.216.694.825.576A12.004 12.004 0 0 0 12 .5Z"
                                            />
                                        </svg>
                                    </span>
                                    <span>
                                        <span className="block text-sm font-semibold">
                                            {isLoggingIn ? 'Anmeldung läuft...' : 'Mit GitHub anmelden'}
                                        </span>
                                        <span className={`block text-xs ${secondaryTextClass}`}>
                                            Verbinde dich mit deinem Dev-Konto
                                        </span>
                                    </span>
                                </span>
                                <span className={`text-xs ${secondaryTextClass}`}>Weiter ›</span>
                            </button>

                            <button
                                onClick={handleGoogleLogin}
                                disabled={isLoggingIn}
                                className={googleButtonClass}
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
                                        <span className={`block text-xs ${secondaryTextClass}`}>
                                            Der schnelle Login mit modernem Konto
                                        </span>
                                    </span>
                                </span>
                                <span className={`text-xs ${secondaryTextClass}`}>Weiter ›</span>
                            </button>

                            <button
                                onClick={handleAnonymousLogin}
                                disabled={isLoggingIn}
                                className={anonymousButtonClass}
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
                                        <span className={`block text-xs ${secondaryTextClass}`}>Ohne Konto – einfach loschatten wie damals</span>
                                    </span>
                                </span>
                                <span className={`text-xs ${secondaryTextClass}`}>Los! ›</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
