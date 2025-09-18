import { ChatBoard, ChatBar } from '@/components'
import { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase'
import { collection, onSnapshot, query, where, doc, setDoc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore'
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
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const navigate = useNavigate()
    const currentUser = auth.currentUser

    useEffect(() => {
        if (!currentUser) return

        // Set user online status
        const userRef = doc(db, 'users', currentUser.uid)
        setDoc(userRef, {
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Gast_' + currentUser.uid.slice(0, 4),
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
        navigate('/profile')
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
        <section className="min-h-screen bg-gradient-to-b from-[#5c7cfa] to-[#3864f4] p-4">
            <div className="max-w-7xl mx-auto">
                {/* MSN Window */}
                <div className="bg-[#ECE9D8] rounded-t-lg shadow-2xl border-2 border-[#0054E3] border-b-0">
                    {/* MSN Header Bar */}
                    <div className="bg-gradient-to-b from-[#0054E3] to-[#0046C7] px-3 py-1.5 flex items-center justify-between rounded-t-md">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                                <span className="text-[10px]">💬</span>
                            </div>
                            <span className="text-white text-sm font-bold">
                                Alles Bene Chat - Nostalgie Room
                            </span>
                        </div>
                        <div className="flex gap-1">
                            <button
                                className="w-5 h-5 bg-gradient-to-b from-white to-[#ECE9D8] border border-[#003C74] rounded-sm flex items-center justify-center hover:from-[#E5F3FF] hover:to-[#C3E0FF]"
                                title="Minimieren"
                            >
                                <span className="text-[10px] font-bold mt-[-4px]">_</span>
                            </button>
                            <button
                                className="w-5 h-5 bg-gradient-to-b from-white to-[#ECE9D8] border border-[#003C74] rounded-sm flex items-center justify-center hover:from-[#E5F3FF] hover:to-[#C3E0FF]"
                                title="Maximieren"
                            >
                                <span className="text-[10px] font-bold">□</span>
                            </button>
                            <button
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="w-5 h-5 bg-gradient-to-b from-[#FF5F56] to-[#E0443E] border border-[#C0403C] rounded-sm flex items-center justify-center hover:from-[#FF7066] hover:to-[#F0544E] disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Schließen und Ausloggen"
                            >
                                <span className="text-white text-[10px] font-bold">×</span>
                            </button>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex gap-3 p-3">
                        {/* Chat Area */}
                        <div className="flex-1 flex flex-col gap-2">
                            <ChatBoard />
                            <ChatBar />
                        </div>

                        {/* Right Sidebar - User List */}
                        <div className="w-56 flex flex-col gap-2">
                            {/* Online Users */}
                            <div className="bg-white border border-[#7A96DF] rounded p-3">
                                <div className="text-xs font-bold text-[#0054E3] mb-3 flex items-center gap-1">
                                    <span className="w-2 h-2 bg-[#7FBA00] rounded-full animate-pulse"></span>
                                    Online ({onlineUsers.length})
                                </div>
                                <div className="space-y-1 max-h-64 overflow-y-auto">
                                    {onlineUsers.map(user => (
                                        <div
                                            key={user.id}
                                            className="flex items-center gap-2 p-1.5 rounded hover:bg-[#E5F3FF] cursor-pointer transition-colors"
                                        >
                                            <div className="w-2 h-2 bg-[#7FBA00] rounded-full"></div>
                                            <span className="text-xs truncate">
                                                {user.displayName}
                                                {user.id === currentUser?.uid && ' (Du)'}
                                            </span>
                                        </div>
                                    ))}
                                    {onlineUsers.length === 0 && (
                                        <div className="text-xs text-gray-500 italic">
                                            Keine User online
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <button
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="w-full px-3 py-2 bg-gradient-to-b from-white to-[#ECE9D8] border border-[#003C74] rounded text-xs hover:from-[#E5F3FF] hover:to-[#C3E0FF] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoggingOut ? '⏳ Logout...' : 'Logout'}
                            </button>

                            <button
                                onClick={handleInvite}
                                className="w-full px-3 py-2 bg-gradient-to-b from-white to-[#ECE9D8] border border-[#003C74] rounded text-xs hover:from-[#E5F3FF] hover:to-[#C3E0FF] transition-colors flex items-center justify-center gap-2"
                            >
                                <b>Invite Friend</b>
                            </button>

                            <button
                                onClick={handleOpenSettings}
                                className="w-full px-3 py-2 bg-gradient-to-b from-white to-[#ECE9D8] border border-[#003C74] rounded text-xs hover:from-[#E5F3FF] hover:to-[#C3E0FF] transition-colors flex items-center justify-center gap-2"
                            >
                                Settings
                            </button>

                            {/* Debug Info - nur in Entwicklung */}
                            {import.meta.env.DEV && (
                                <div className="text-[10px] text-gray-500 p-2 border-t">
                                    User: {currentUser?.email || 'Anonym'}<br/>
                                    UID: {currentUser?.uid?.slice(0, 15)}...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-[#0054E3] mb-4">
                            Freund einladen
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Teile diesen Link mit deinen Freunden:
                        </p>
                        <input
                            type="text"
                            value={window.location.origin}
                            readOnly
                            className="w-full px-3 py-2 border border-[#7A96DF] rounded text-sm mb-4 bg-gray-50"
                            onClick={(e) => e.currentTarget.select()}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={copyLink}
                                className="flex-1 px-3 py-2 bg-gradient-to-b from-white to-[#ECE9D8] border border-[#003C74] rounded text-sm hover:from-[#E5F3FF] hover:to-[#C3E0FF] transition-colors"
                            >
                                📋 Kopieren
                            </button>
                            <button
                                onClick={shareWhatsApp}
                                className="flex-1 px-3 py-2 bg-gradient-to-b from-white to-[#ECE9D8] border border-[#003C74] rounded text-sm hover:from-[#E5F3FF] hover:to-[#C3E0FF] transition-colors"
                            >
                                💬 WhatsApp
                            </button>
                            <button
                                onClick={() => setShowShareModal(false)}
                                className="flex-1 px-3 py-2 bg-gradient-to-b from-white to-[#ECE9D8] border border-[#003C74] rounded text-sm hover:from-[#E5F3FF] hover:to-[#C3E0FF] transition-colors"
                            >
                                Schließen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}
