import { signInWithPopup, signInAnonymously } from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { OAuthProvider } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth'
import { useEffect } from 'react'

const microsoftProvider = new OAuthProvider('microsoft.com')

export function LoginPage() {
    const navigate = useNavigate()
    const { user } = useAuth()

    useEffect(() => {
        if (user) {
            navigate('/')
        }
    }, [user, navigate])

    const handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider)
            navigate('/')
        } catch (error) {
            console.error('Google login error:', error)
            alert('Login fehlgeschlagen. Bitte versuche es erneut.')
        }
    }

    const handleMicrosoftLogin = async () => {
        try {
            await signInWithPopup(auth, microsoftProvider)
            navigate('/')
        } catch (error) {
            console.error('Microsoft login error:', error)
            alert('Login fehlgeschlagen. Bitte versuche es erneut.')
        }
    }

    const handleAnonymousLogin = async () => {
        try {
            await signInAnonymously(auth)
            navigate('/')
        } catch (error) {
            console.error('Anonymous login error:', error)
            alert('Login fehlgeschlagen. Bitte versuche es erneut.')
        }
    }

    return (
        <section className="min-h-screen bg-gradient-to-b from-[#5c7cfa] to-[#3864f4] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
                {/* MSN Logo */}
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#00BCF2] via-[#0078D7] to-[#0054E3] rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-2xl"><center>almost<br/> MSN</center></span>
                </div>

                <h1 className="text-3xl font-bold text-[#0054E3] text-center mb-2">
                    Alles Bene Chat
                </h1>
                <p className="text-gray-600 text-sm text-center mb-8">
                    Chatten wie früher - nur modern!
                </p>

                <div className="space-y-3">
                    {/* Google Login */}
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-[#7A96DF] rounded-md hover:bg-[#E5F3FF] hover:border-[#0054E3] transition-all duration-200 hover:scale-[1.02] shadow-sm"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 48 48">
                            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                        </svg>
                        <span className="text-gray-700">Mit Google anmelden</span>
                    </button>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-gray-500">oder</span>
                        </div>
                    </div>

                    {/* Anonymous Login */}
                    <button
                        onClick={handleAnonymousLogin}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#F0EFE7] border border-[#7A96DF] rounded-md hover:bg-[#E5E5D7] hover:border-[#0054E3] transition-all duration-200 shadow-sm"
                    >
                        <span className="text-2xl">👤</span>
                        <span className="text-gray-700">Anonym beitreten</span>
                    </button>
                </div>

                <p className="text-xs text-gray-500 text-center mt-8">
                     Alles Bene Chat <br/> © 2025 - Imad Chatila + Ricardo Santos Lopez + Mathias Bäumli<br/>
                    <span className="text-[10px]">Der Retro Chatraum für alle Benedict Nerds</span>
                </p>
            </div>
        </section>
    )
}