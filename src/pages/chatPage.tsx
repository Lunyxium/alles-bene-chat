import { ChatBoard, ChatBar } from '@/components'
import { SettingsModal } from '@/components/settingsModal'
import { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase'
import { collection, onSnapshot, query, where, doc, setDoc, updateDoc, serverTimestamp, getDoc, deleteDoc } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'

// TypeScript window extension
declare global {
    interface Window {
        __userDocId?: string;
    }
}

interface OnlineUser {
    id: string          // Dokument-ID (lesbar)
    uid?: string        // Firebase Auth UID (für Vergleiche)
    displayName: string
    email: string
    isOnline: boolean
    lastSeen: any
    photoURL?: string
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
        if (!currentUser) {
            console.log('❌ Kein currentUser vorhanden')
            return
        }

        console.log('🔍 Current User:', {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            provider: currentUser.providerData[0]?.providerId
        })

        // Erstelle oder aktualisiere User-Dokument beim Mount
        const initializeUser = async () => {
            // Basis-Name für Display (mit shortUID für Gäste)
            const shortId = currentUser.uid.slice(0, 8)
            const baseDisplayName = currentUser.displayName ||
                currentUser.email?.split('@')[0] ||
                `Gast_${shortId.slice(0, 4)}`

            // FESTE Dokument-ID - ändert sich NIE!
            // Verwende den ersten Namen oder einen generischen Namen
            const initialName = currentUser.displayName ||
                currentUser.email?.split('@')[0] ||
                'user'
            const cleanInitialName = initialName.toLowerCase()
                .replace(/[^a-z0-9]/g, '_')
                .replace(/_+/g, '_')
                .substring(0, 20)
            const fixedDocId = `${cleanInitialName}_${shortId}`

            console.log(`📝 User-Dokument ID: ${fixedDocId} (Original UID: ${currentUser.uid})`)

            // MIGRATION: Prüfe zuerst ob altes Dokument mit UID existiert
            const oldDocRef = doc(db, 'users', currentUser.uid)
            const newDocRef = doc(db, 'users', fixedDocId)

            try {
                // Prüfe ob altes Dokument existiert
                const oldDoc = await getDoc(oldDocRef)

                if (oldDoc.exists() && currentUser.uid !== fixedDocId) {
                    console.log('🔄 Migriere altes User-Dokument...')
                    const oldData = oldDoc.data()

                    // Kopiere Daten zum neuen Dokument
                    await setDoc(newDocRef, {
                        ...oldData,
                        uid: currentUser.uid,
                        docId: fixedDocId,
                        displayName: oldData.displayName || baseDisplayName,
                        isOnline: true,
                        lastSeen: serverTimestamp(),
                        migrated: true,
                        migratedAt: serverTimestamp()
                    })

                    // Lösche altes Dokument
                    await deleteDoc(oldDocRef)
                    console.log('✅ Migration erfolgreich!')

                    setCurrentDisplayName(oldData.displayName || baseDisplayName)
                    window.__userDocId = fixedDocId
                    localStorage.setItem('userDocId', fixedDocId) // Persistiere die ID
                    return
                }

                // Prüfe ob neues Dokument existiert
                const newDoc = await getDoc(newDocRef)

                if (newDoc.exists()) {
                    // User existiert bereits - nur Online-Status aktualisieren
                    const userData = newDoc.data()
                    setCurrentDisplayName(userData.displayName || baseDisplayName)

                    await updateDoc(newDocRef, {
                        isOnline: true,
                        lastSeen: serverTimestamp(),
                        photoURL: currentUser.photoURL || userData.photoURL || null,
                        uid: currentUser.uid  // Stelle sicher dass die echte UID gespeichert ist
                    })

                    console.log('✅ Existing user online:', fixedDocId)
                    window.__userDocId = fixedDocId
                    localStorage.setItem('userDocId', fixedDocId)
                } else {
                    // Neuer User - erstelle Dokument mit initialem Display Name
                    setCurrentDisplayName(baseDisplayName)

                    await setDoc(newDocRef, {
                        uid: currentUser.uid,
                        docId: fixedDocId,
                        displayName: baseDisplayName,
                        email: currentUser.email || 'anonymous@chat.local',
                        photoURL: currentUser.photoURL || null,
                        isOnline: true,
                        lastSeen: serverTimestamp(),
                        createdAt: serverTimestamp(),
                        provider: currentUser.providerData[0]?.providerId || 'anonymous'
                    })

                    console.log('✅ New user registered:', fixedDocId)
                    window.__userDocId = fixedDocId
                    localStorage.setItem('userDocId', fixedDocId)
                }
            } catch (error) {
                console.error('❌ Fehler beim User-Setup:', error)
            }
        }

        initializeUser()

        // Echtzeit-Listener für Online-User
        console.log('📡 Starte Firestore Listener für users Collection...')

        let listenerCleanup: (() => void) | undefined

        try {
            // TEMPORÄR: Zeige ALLE User in der Collection (für Migration)
            const usersRef = collection(db, 'users')
            console.log('📁 Collection Referenz erstellt:', usersRef)

            const q = query(usersRef)
            console.log('🔍 Query erstellt:', q)

            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    console.log(`📊 Snapshot erhalten! Gefundene User-Dokumente: ${snapshot.size}`)
                    console.log('📄 Snapshot Docs:', snapshot.docs)

                    if (snapshot.empty) {
                        console.warn('⚠️ Keine Dokumente in der users Collection gefunden!')
                        setOnlineUsers([])
                        return
                    }

                    const users = snapshot.docs.map(doc => {
                        const data = doc.data()
                        console.log(`User ${doc.id}:`, data)
                        // Behalte die Dokument-ID als ID für konsistente Vergleiche
                        return {
                            id: doc.id,      // Dokument-ID
                            uid: data.uid || doc.id,  // Echte Firebase Auth UID
                            ...data
                        } as OnlineUser & { uid: string }
                    }).filter(user => {
                        // Filtere nur User die online sind
                        const shouldShow = user.isOnline === true
                        console.log(`Filter ${user.displayName || user.id}: isOnline=${user.isOnline}, uid=${user.uid}, currentUid=${currentUser.uid}, show=${shouldShow}`)
                        return shouldShow
                    })

                    // Sortiere User alphabetisch, aber zeige eigenen User zuerst
                    users.sort((a, b) => {
                        // Vergleiche mit der echten UID
                        if (a.uid === currentUser.uid) return -1
                        if (b.uid === currentUser.uid) return 1
                        return (a.displayName || 'Anonym').localeCompare(b.displayName || 'Anonym')
                    })

                    console.log(`✅ Setze ${users.length} Online-User:`, users)
                    setOnlineUsers(users)
                    console.log(`👥 ${users.length} User online:`, users.map(u => u.displayName || u.email || u.id))
                },
                (error) => {
                    console.error('❌ Firestore Listener Error:', error)
                    console.error('Error Code:', error.code)
                    console.error('Error Message:', error.message)

                    if (error.code === 'permission-denied') {
                        console.error('🔒 PERMISSION DENIED! Prüfe deine Firestore Security Rules!')
                        alert('⚠️ Keine Berechtigung die User-Liste zu laden. Prüfe die Firestore Rules!')
                    }
                }
            )

            console.log('✅ Listener erfolgreich gestartet')
            listenerCleanup = () => unsubscribe()
        } catch (error) {
            console.error('💥 Fehler beim Erstellen des Listeners:', error)
        }

        // Listener für Änderungen am eigenen User-Dokument
        const userDocId = window.__userDocId || localStorage.getItem('userDocId') || currentUser.uid
        const userRef = doc(db, 'users', userDocId)
        const userUnsubscribe = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                const userData = doc.data()
                setCurrentDisplayName(userData.displayName || currentDisplayName)
            }
        })

        // Heartbeat - Update lastSeen alle 30 Sekunden
        const heartbeatInterval = setInterval(async () => {
            try {
                const docId = window.__userDocId || currentUser.uid
                await updateDoc(doc(db, 'users', docId), {
                    lastSeen: serverTimestamp(),
                    isOnline: true
                })
            } catch (error) {
                console.log('Heartbeat update failed:', error)
            }
        }, 30000) // 30 Sekunden

        // Cleanup: User offline setzen beim Verlassen
        const handleBeforeUnload = async () => {
            const docId = window.__userDocId || currentUser.uid
            const userRef = doc(db, 'users', docId)
            try {
                // Verwende ein Promise mit einem Timeout für beforeunload
                await Promise.race([
                    updateDoc(userRef, {
                        isOnline: false,
                        lastSeen: serverTimestamp()
                    }),
                    new Promise(resolve => setTimeout(resolve, 1000)) // Max 1 Sekunde warten
                ])
            } catch (error) {
                console.log('Could not update offline status:', error)
            }
        }

        // Event Listeners
        window.addEventListener('beforeunload', handleBeforeUnload)

        // Visibility API - setze User offline wenn Tab nicht sichtbar ist (optional)
        const handleVisibilityChange = async () => {
            const docId = window.__userDocId || currentUser.uid
            if (document.hidden) {
                // Tab ist versteckt - optional offline setzen
                console.log('Tab hidden - keeping user online but updating lastSeen')
                await updateDoc(doc(db, 'users', docId), {
                    lastSeen: serverTimestamp()
                })
            } else {
                // Tab ist wieder sichtbar - definitiv online setzen
                await updateDoc(doc(db, 'users', docId), {
                    isOnline: true,
                    lastSeen: serverTimestamp()
                })
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        // Cleanup function
        return () => {
            clearInterval(heartbeatInterval)
            window.removeEventListener('beforeunload', handleBeforeUnload)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            if (listenerCleanup) listenerCleanup()
            userUnsubscribe()

            // Setze User offline beim Unmount
            if (currentUser && window.__userDocId) {
                updateDoc(doc(db, 'users', window.__userDocId), {
                    isOnline: false,
                    lastSeen: serverTimestamp()
                }).catch(console.error)
            }
        }
    }, [currentUser])

    const handleLogout = async () => {
        const confirmLogout = window.confirm('Möchtest du dich wirklich ausloggen?\n\nKlicke "OK" zum Ausloggen oder "Abbrechen" um im Chat zu bleiben.')

        if (!confirmLogout) return

        setIsLoggingOut(true)

        try {
            if (currentUser) {
                const docId = (window as any).__userDocId || currentUser.uid
                const userRef = doc(db, 'users', docId)

                // Setze User offline bevor Logout
                try {
                    await updateDoc(userRef, {
                        isOnline: false,
                        lastSeen: serverTimestamp()
                    })
                    console.log('✅ User offline gesetzt')
                } catch (error) {
                    console.log('Could not update user status:', error)
                }
            }

            await signOut(auth)
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

    // Format last seen time
    const formatLastSeen = (lastSeen: any) => {
        if (!lastSeen) return 'Gerade online'

        const date = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const minutes = Math.floor(diff / 60000)

        if (minutes < 1) return 'Gerade eben'
        if (minutes < 60) return `Vor ${minutes} Min.`
        if (minutes < 1440) return `Vor ${Math.floor(minutes / 60)} Std.`
        return `Vor ${Math.floor(minutes / 1440)} Tagen`
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
                                    <span className="w-2 h-2 bg-[#7FBA00] rounded-full animate-pulse" />
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

                                {/* Mobile Online Users */}
                                <div className="md:hidden mt-2">
                                    <h3 className="text-xs font-bold text-[#0a4bdd] uppercase tracking-widest mb-3">
                                        Online Buddies ({onlineUsers.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {onlineUsers.length > 0 ? (
                                            onlineUsers.map(user => (
                                                <div
                                                    key={user.id}
                                                    className="flex items-center gap-2 rounded-lg border border-[#c7d9ff] bg-[#f5f8ff] px-3 py-2"
                                                >
                                                    <span className="w-2 h-2 bg-[#7FBA00] rounded-full flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs text-[#0a4bdd] font-medium truncate">
                                                            {user.displayName || user.email?.split('@')[0] || 'Anonym'}
                                                            {user.uid === currentUser?.uid && ' (You)'}
                                                        </div>
                                                        <div className="text-[10px] text-[#6c83ca]">
                                                            {user.isOnline === false ? '⚫ Offline' : formatLastSeen(user.lastSeen)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-xs text-[#5c6fb9] italic p-3 bg-[#f5f8ff] rounded-lg border border-[#c7d9ff]">
                                                Lade Online-User...
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

                            {/* Desktop Sidebar */}
                            <aside className="hidden md:block">
                                <div className="rounded-[16px] border border-[#7a96df] bg-white/95 shadow-[0_12px_28px_rgba(58,92,173,0.18)] overflow-hidden flex flex-col">
                                    <div className="bg-gradient-to-r from-[#eaf1ff] to-[#dfe9ff] px-4 py-3 border-b border-[#c7d9ff]">
                                        <div className="flex items-center gap-2 text-[#0a4bdd] text-sm font-semibold">
                                            <span className="w-2 h-2 bg-[#7FBA00] rounded-full animate-pulse" />
                                            Online Buddies ({onlineUsers.length})
                                        </div>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto p-3 space-y-2 text-xs text-[#0f3fae] flex-1">
                                        {onlineUsers.length > 0 ? (
                                            onlineUsers.map(user => (
                                                <div
                                                    key={user.id}
                                                    className={`flex items-center gap-2 px-2 py-2 rounded-md hover:bg-[#e5f3ff] transition-colors ${
                                                        user.id === currentUser?.uid ? 'bg-[#f0f7ff] border border-[#c7d9ff]' : ''
                                                    }`}
                                                >
                                                    <span className="w-2 h-2 bg-[#7FBA00] rounded-full flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium truncate">
                                                            {user.displayName}
                                                            {user.id === currentUser?.uid && ' (Du)'}
                                                        </div>
                                                        <div className="text-[10px] text-[#6c83ca]">
                                                            {formatLastSeen(user.lastSeen)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="italic text-[#6075b7] px-2 py-4 text-center">
                                                <div className="mb-2">👻</div>
                                                <div>Noch niemand online...</div>
                                                <div className="text-[10px] text-[#8899cc] mt-1">
                                                    Lade Freunde ein!
                                                </div>
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
                                    {/* Debug Info - nur in Dev */}
                                    {import.meta.env.DEV && (
                                        <div className="border-t border-[#c7d9ff] bg-white/90 px-3 py-2 text-[10px] text-[#5c6fb9]">
                                            <div>User: {currentUser?.email || 'Anonym'}</div>
                                            <div>UID: {currentUser?.uid?.slice(0, 15)}...</div>
                                            <div>Provider: {currentUser?.providerData[0]?.providerId || 'anonymous'}</div>
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