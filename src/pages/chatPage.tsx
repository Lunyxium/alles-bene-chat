import { ChatBoard, ChatBar } from '@/components'
import { SettingsModal } from '@/components/settingsModal'
import { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase'
import { collection, onSnapshot, query, where, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'

interface OnlineUser {
    id: string
    displayName: string
    email: string
    isOnline: boolean
    lastSeen: any
}

export function ChatPage() {
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
    const [showShareModal, setShowShareModal] = useState(false)
    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const [currentDisplayName, setCurrentDisplayName] = useState('')
    const navigate = useNavigate()
    const currentUser = auth.currentUser

    useEffect(() => {
        if (!currentUser) return

        const userDisplayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Gast_' + currentUser.uid.slice(0, 4)
        setCurrentDisplayName(userDisplayName)

        // Set user online status
        const userRef = doc(db, 'users', currentUser.uid)
        setDoc(userRef, {
            displayName: userDisplayName,
            email: currentUser.email || '',
            isOnline: true,
            lastSeen: serverTimestamp()
        }, { merge: true })

        // Listen to online users
        const q = query(collection(db, 'users'), where('isOnline', '==', true))
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const users = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as OnlineUser))
            setOnlineUsers(users)
        })

        // Listen to current user changes to update display name
        const userUnsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
            if (doc.exists()) {
                const userData = doc.data()
                setCurrentDisplayName(userData.displayName || userDisplayName)
            }
        })

        // Set offline on unmount or page unload
        const handleBeforeUnload = () => {
            updateDoc(userRef, {
                isOnline: false,
                lastSeen: serverTimestamp()
            }).catch(console.error)
        }

        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => {
            handleBeforeUnload()
            window.removeEventListener('beforeunload', handleBeforeUnload)
            unsubscribe()
            userUnsubscribe()
        }
    }, [currentUser])

    const handleLogout = async () => {
        // Besserer Dialog mit klarem Text
        const confirmLogout = window.confirm('Möchtest du dich wirklich ausloggen?\n\nKlicke "OK" zum Ausloggen oder "Abbrechen" um im Chat zu bleiben.')

        if (!confirmLogout) return

        setIsLoggingOut(true)

        try {
            // Erst User offline setzen
            if (currentUser) {
                const userRef = doc(db, 'users', currentUser.uid)

                // Verwende deleteDoc statt updateDoc für sauberen Logout
                try {
                    await updateDoc(userRef, {
                        isOnline: false,
                        lastSeen: serverTimestamp()
                    })
                } catch (error) {
                    console.log('Could not update user status:', error)
                    // Fortfahren auch wenn Update fehlschlägt
                }
            }

            // Dann ausloggen
            await signOut(auth)

            // Navigation erfolgt automatisch durch AuthProvider/RequireAuth
            // Explizite Navigation als Fallback
            navigate('/login')

        } catch (error) {
            console.error('Logout error:', error)
            alert('Fehler beim Ausloggen. Bitte versuche es erneut.')
            setIsLoggingOut(false)
        }
    }

    const handleInvite = () => {
        setShowShareModal(true)
    }

    const handleOpenSettings = () => {
        setShowSettingsModal(true)
    }

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.origin)
            .then(() => {
                alert('Link wurde in die Zwischenablage kopiert! 📋')
            })
            .catch(() => {
                // Fallback für ältere Browser
                const input = document.createElement('input')
                input.value = window.location.origin
                document.body.appendChild(input)
                input.select()
                document.execCommand('copy')
                document.body.removeChild(input)
                alert('Link wurde in die Zwischenablage kopiert! 📋')
            })
    }

    const shareWhatsApp = () => {
        const text = 'Komm in unseren Retro-Chat! 🎉 Nostalgie pur wie bei MSN Messenger!'
        const url = window.location.origin
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank')
    }

    return (
        <section
            className="relative min-h-screen bg-gradient-to-br from-[#9ecdfb] via-[#c2dcff] to-[#f1f6ff] flex items-center justify-center overflow-hidden px-4 py-10"
            style={{ fontFamily: 'Tahoma, Verdana, sans-serif' }}
        >
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-24 -left-24 w-[380px] h-[380px] bg-[radial-gradient(circle,#ffffff75,transparent_70%)] blur-2xl" />
                <div className="absolute top-20 right-10 w-[320px] h-[320px] bg-[radial-gradient(circle,#7fa6ff4d,transparent_70%)] blur-2xl" />
                <div className="absolute bottom-[-160px] left-1/3 w-[420px] h-[420px] bg-[radial-gradient(circle,#c7d9ff80,transparent_70%)] blur-3xl" />
            </div>

            <div className="relative w-full max-w-6xl">
                <div className="relative rounded-[20px] border border-[#7fa6f7] bg-white/90 backdrop-blur-sm shadow-[0_20px_45px_rgba(40,94,173,0.28)] overflow-hidden">
                    <div className="relative bg-[#f9fbff]/95">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#0a4bdd] via-[#2a63f1] to-[#0a4bdd] px-5 py-3 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full border border-white/40 bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg">
                                    💬
                                </div>
                                <div className="leading-tight">
                                    <p className="text-xs uppercase tracking-[0.3em] text-[#cfe0ff]">Retro Room</p>
                                    <h1 className="text-lg font-semibold" style={{ fontFamily: 'Trebuchet MS, Tahoma, sans-serif' }}>
                                        Alles Bene Messenger
                                    </h1>
                                </div>
                            </div>
                            <div className="hidden md:flex items-center gap-2 text-xs text-[#d7e6ff]">
                                    <span className="inline-flex items-center gap-1">
                                        <span className="w-2 h-2 bg-[#7FBA00] rounded-full" />
                                        {onlineUsers.length} online
                                    </span>
                                <span className="h-4 w-px bg-white/40" />
                                <span>Globale Lobby</span>
                            </div>
                        </div>

                        <div className="px-5 py-5 md:px-6 md:py-6 md:grid md:grid-cols-[minmax(0,1fr)_260px] md:gap-6 md:items-start">
                            <div className="flex flex-col gap-4">
                                <div className="bg-white rounded-[16px] border border-[#7a96df] shadow-[0_12px_30px_rgba(58,92,173,0.15)] overflow-hidden">
                                    <ChatBoard />
                                </div>
                                <div className="bg-white rounded-[14px] border border-[#7a96df] shadow-[0_10px_20px_rgba(58,92,173,0.12)] overflow-visible">
                                    <ChatBar />
                                </div>

                                {/* Online buddies for mobile */}
                                <div className="md:hidden mt-2">
                                    <h3 className="text-xs font-bold text-[#0a4bdd] uppercase tracking-widest mb-3">Online ({onlineUsers.length})</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {onlineUsers.map(user => (
                                            <div
                                                key={user.id}
                                                className="flex items-center gap-2 rounded-lg border border-[#c7d9ff] bg-[#f5f8ff] px-3 py-2 text-xs text-[#0a4bdd]"
                                            >
                                                <span className="w-2 h-2 bg-[#7FBA00] rounded-full" />
                                                <span className="truncate">
                                                        {user.displayName}
                                                    {user.id === currentUser?.uid && ' (Du)'}
                                                    </span>
                                            </div>
                                        ))}
                                        {onlineUsers.length === 0 && (
                                            <div className="text-xs text-[#5c6fb9] italic">
                                                Keine User online
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4 grid grid-cols-1 gap-2">
                                        <button
                                            onClick={handleInvite}
                                            className="w-full rounded-md border border-[#9eb8ff] bg-gradient-to-b from-white to-[#e6eeff] px-4 py-2 text-sm font-semibold text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-[1px]"
                                        >
                                            📣 Freund einladen
                                        </button>
                                        <button
                                            onClick={handleOpenSettings}
                                            className="w-full rounded-md border border-[#9eb8ff] bg-gradient-to-b from-white to-[#e6eeff] px-4 py-2 text-sm text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-[1px]"
                                        >
                                            ⚙️ Einstellungen
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            disabled={isLoggingOut}
                                            className="w-full rounded-md border border-[#9eb8ff] bg-gradient-to-b from-white to-[#e6eeff] px-4 py-2 text-sm font-semibold text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-[1px] disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {isLoggingOut ? '⏳ Wird abgemeldet...' : 'Abmelden'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Desktop Sidebar for Online Users */}
                            <aside className="hidden md:block">
                                <div className="rounded-[16px] border border-[#7a96df] bg-white/95 shadow-[0_12px_28px_rgba(58,92,173,0.18)] overflow-hidden flex flex-col">
                                    <div className="bg-gradient-to-r from-[#eaf1ff] to-[#dfe9ff] px-4 py-3 border-b border-[#c7d9ff]">
                                        <div className="flex items-center gap-2 text-[#0a4bdd] text-sm font-semibold">
                                            <span className="w-2 h-2 bg-[#7FBA00] rounded-full" />
                                            Online ({onlineUsers.length})
                                        </div>
                                    </div>
                                    <div className="max-h-56 overflow-y-auto p-3 space-y-1 text-xs text-[#0f3fae] flex-1">
                                        {onlineUsers.map(user => (
                                            <div
                                                key={user.id}
                                                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#e5f3ff] transition-colors"
                                            >
                                                <span className="w-2 h-2 bg-[#7FBA00] rounded-full" />
                                                <span className="truncate">
                                                        {user.displayName}
                                                    {user.id === currentUser?.uid && ' (Du)'}
                                                    </span>
                                            </div>
                                        ))}
                                        {onlineUsers.length === 0 && (
                                            <div className="italic text-[#6075b7] px-2 py-1">
                                                Keine User online
                                            </div>
                                        )}
                                    </div>
                                    <div className="border-t border-[#c7d9ff] bg-[#f2f6ff] p-3 space-y-2 text-xs">
                                        <button
                                            onClick={handleInvite}
                                            className="w-full rounded-md border border-[#9eb8ff] bg-gradient-to-b from-white to-[#e6eeff] px-4 py-2 text-sm font-semibold text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-[1px]"
                                        >
                                            📣 Freund einladen
                                        </button>
                                        <button
                                            onClick={handleOpenSettings}
                                            className="w-full rounded-md border border-[#9eb8ff] bg-gradient-to-b from-white to-[#e6eeff] px-4 py-2 text-sm text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-[1px]"
                                        >
                                            ⚙️ Einstellungen
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            disabled={isLoggingOut}
                                            className="w-full rounded-md border border-[#9eb8ff] bg-gradient-to-b from-white to-[#e6eeff] px-4 py-2 text-sm font-semibold text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-[1px] disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {isLoggingOut ? '⏳ Wird abgemeldet...' : 'Abmelden'}
                                        </button>
                                    </div>
                                    {import.meta.env.DEV && (
                                        <div className="border-t border-[#c7d9ff] bg-white/90 px-3 py-2 text-[10px] text-[#5c6fb9]">
                                            User: {currentUser?.email || 'Anonym'}<br />
                                            UID: {currentUser?.uid?.slice(0, 15)}...
                                        </div>
                                    )}
                                </div>
                            </aside>
                        </div>
                    </div>
                </div>
            </div>

            {/* Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 bg-[#1a225040]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="relative w-full max-w-md rounded-2xl border border-[#7fa6f7] bg-white/95 shadow-[0_18px_40px_rgba(40,94,173,0.25)] p-6">
                        <div className="absolute -top-8 right-8 w-24 h-24 bg-[radial-gradient(circle,#7fa6ff4d,transparent_70%)] blur-xl" />
                        <h3 className="text-lg font-semibold text-[#0a4bdd]" style={{ fontFamily: 'Trebuchet MS, Tahoma, sans-serif' }}>
                            Freund einladen
                        </h3>
                        <p className="mt-2 text-sm text-[#4b5f9b]">
                            Teile diesen magischen Link mit deinen MSN-Buddies:
                        </p>
                        <input
                            type="text"
                            value={window.location.origin}
                            readOnly
                            className="mt-4 w-full rounded-md border border-[#7a96df] bg-[#f5f8ff] px-3 py-2 text-sm text-[#0a4bdd] focus:outline-none focus:ring-2 focus:ring-[#b7c8ff]"
                            onClick={(e) => e.currentTarget.select()}
                        />
                        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                            <button
                                onClick={copyLink}
                                className="rounded-md border border-[#7a96df] bg-gradient-to-b from-white to-[#e6eeff] px-3 py-2 text-[#0a4bdd] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-transform hover:-translate-y-[2px]"
                            >
                                📋 Kopieren
                            </button>
                            <button
                                onClick={shareWhatsApp}
                                className="rounded-md border border-[#7a96df] bg-gradient-to-b from-white to-[#e6eeff] px-3 py-2 text-[#0a4bdd] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-transform hover:-translate-y-[2px]"
                            >
                                💬 WhatsApp
                            </button>
                            <button
                                onClick={() => setShowShareModal(false)}
                                className="rounded-md border border-[#7a96df] bg-gradient-to-b from-white to-[#e6eeff] px-3 py-2 text-[#0a4bdd] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-transform hover:-translate-y-[2px]"
                            >
                                Schließen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            <SettingsModal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                currentDisplayName={currentDisplayName}
            />
        </section>
    )
}