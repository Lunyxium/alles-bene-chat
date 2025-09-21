import { ChatBoard, ChatBar } from '@/components'
import { SettingsModal } from '@/components/settingsModal'
import { useState, useEffect, useRef } from 'react'
import { auth, db } from '@/lib/firebase'
import { collection, onSnapshot, query, doc, setDoc, updateDoc, serverTimestamp, getDoc, getDocs, deleteDoc } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
// Lucide Icons Import
import {
    Users,
    CirclePlus,
    CircleEllipsis,
    CircleSlash,
    CircleDot,
    CircleUserRound,
    CirclePower,
    Share2,
    ChevronsDown,
    ChevronsUp
} from 'lucide-react'

// TypeScript window extension
declare global {
    interface Window {
        __userDocId?: string;
        __activityTimer?: NodeJS.Timeout;
    }
}

type UserStatus = 'awake' | 'idle' | 'gone'

interface OnlineUser {
    id: string          // Dokument-ID (lesbar)
    uid?: string        // Firebase Auth UID (für Vergleiche)
    displayName: string
    email: string
    status: UserStatus  // Neu: 3-Stufen Status
    isOnline: boolean   // Legacy support
    lastSeen: any
    lastActivity: any   // Neu: Letzter Input/Nachricht
    photoURL?: string
    provider?: string
}

export function ChatPage() {
    const [awakeUsers, setAwakeUsers] = useState<OnlineUser[]>([])
    const [idleUsers, setIdleUsers] = useState<OnlineUser[]>([])
    const [goneUsers, setGoneUsers] = useState<OnlineUser[]>([])
    const [showShareModal, setShowShareModal] = useState(false)
    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const [currentDisplayName, setCurrentDisplayName] = useState('')
    // Collapse states für die Sections
    const [collapsedSections, setCollapsedSections] = useState({
        awake: false,
        idle: false,
        gone: true  // Gone standardmäßig zugeklappt
    })
    const navigate = useNavigate()
    const currentUser = auth.currentUser
    const containerRef = useRef<HTMLDivElement>(null)

    // Verhindere Page-Scrolling
    useEffect(() => {
        // Fixiere das Viewport
        document.body.style.overflow = 'hidden'
        document.body.style.height = '100vh'

        return () => {
            document.body.style.overflow = ''
            document.body.style.height = ''
        }
    }, [])

    // Cleanup alte Sessions basierend auf 3-Stufen-System
    const cleanupOldSessions = async () => {
        try {
            const usersRef = collection(db, 'users')
            const snapshot = await getDocs(usersRef)

            const now = Date.now()
            const IDLE_TIMEOUT = 3 * 60 * 1000     // 3 Minuten -> Idle
            const GONE_TIMEOUT = 10 * 60 * 1000    // 10 Minuten -> Gone

            for (const doc of snapshot.docs) {
                const data = doc.data()
                const lastActivity = data.lastActivity?.toDate?.() || data.lastSeen?.toDate?.() || new Date(0)
                const timeDiff = now - lastActivity.getTime()

                let newStatus: UserStatus = 'awake'
                let isOnline = true

                if (timeDiff > GONE_TIMEOUT) {
                    newStatus = 'gone'
                    isOnline = false
                } else if (timeDiff > IDLE_TIMEOUT) {
                    newStatus = 'idle'
                    isOnline = true // Technisch noch "online" aber idle
                }

                // Update nur wenn Status sich geändert hat
                if (data.status !== newStatus || data.isOnline !== isOnline) {
                    console.log(`📊 Status-Update: ${data.displayName} von ${data.status || 'unknown'} zu ${newStatus}`)
                    await updateDoc(doc.ref, {
                        status: newStatus,
                        isOnline: isOnline,
                        lastSeen: serverTimestamp()
                    })
                }
            }
        } catch (error) {
            console.error('Error cleaning up sessions:', error)
        }
    }

    // Aktivitäts-Tracker
    const updateActivity = async () => {
        if (!currentUser || !window.__userDocId) return

        try {
            const docId = window.__userDocId || localStorage.getItem('userDocId')
            if (docId) {
                await updateDoc(doc(db, 'users', docId), {
                    lastActivity: serverTimestamp(),
                    status: 'awake',
                    isOnline: true,
                    lastSeen: serverTimestamp()
                })
                console.log('🎯 Activity updated - Status: awake')
            }
        } catch (error) {
            console.error('Activity update failed:', error)
        }
    }

    // Track User-Aktivität
    useEffect(() => {
        const handleUserActivity = () => {
            // Debounce activity updates
            if (window.__activityTimer) {
                clearTimeout(window.__activityTimer)
            }

            window.__activityTimer = setTimeout(() => {
                updateActivity()
            }, 5000) // Update nach 5 Sekunden Inaktivität
        }

        // Listen für User-Aktivität
        window.addEventListener('mousedown', handleUserActivity)
        window.addEventListener('keypress', handleUserActivity)
        window.addEventListener('touchstart', handleUserActivity)

        return () => {
            window.removeEventListener('mousedown', handleUserActivity)
            window.removeEventListener('keypress', handleUserActivity)
            window.removeEventListener('touchstart', handleUserActivity)
            if (window.__activityTimer) {
                clearTimeout(window.__activityTimer)
            }
        }
    }, [])

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
            // Erst mal alte Sessions aufräumen
            await cleanupOldSessions()

            // Basis-Name für Display
            const shortId = currentUser.uid.slice(0, 8)
            const baseDisplayName = currentUser.displayName ||
                currentUser.email?.split('@')[0] ||
                `Gast_${shortId.slice(0, 4)}`

            // FESTE Dokument-ID
            const initialName = currentUser.displayName ||
                currentUser.email?.split('@')[0] ||
                'user'
            const cleanInitialName = initialName.toLowerCase()
                .replace(/[^a-z0-9]/g, '_')
                .replace(/_+/g, '_')
                .substring(0, 20)
            const fixedDocId = `${cleanInitialName}_${shortId}`

            console.log(`📝 User-Dokument ID: ${fixedDocId}`)

            const oldDocRef = doc(db, 'users', currentUser.uid)
            const newDocRef = doc(db, 'users', fixedDocId)

            try {
                // Migration von altem Dokument
                const oldDoc = await getDoc(oldDocRef)
                if (oldDoc.exists() && currentUser.uid !== fixedDocId) {
                    console.log('🔄 Migriere altes User-Dokument...')
                    const oldData = oldDoc.data()

                    await setDoc(newDocRef, {
                        ...oldData,
                        uid: currentUser.uid,
                        docId: fixedDocId,
                        displayName: oldData.displayName || baseDisplayName,
                        status: 'awake',
                        isOnline: true,
                        lastSeen: serverTimestamp(),
                        lastActivity: serverTimestamp(),
                        migrated: true,
                        migratedAt: serverTimestamp()
                    })

                    await deleteDoc(oldDocRef)
                    console.log('✅ Migration erfolgreich!')

                    setCurrentDisplayName(oldData.displayName || baseDisplayName)
                    window.__userDocId = fixedDocId
                    localStorage.setItem('userDocId', fixedDocId)
                    return
                }

                // Check existing document
                const newDoc = await getDoc(newDocRef)
                if (newDoc.exists()) {
                    const userData = newDoc.data()
                    setCurrentDisplayName(userData.displayName || baseDisplayName)

                    await updateDoc(newDocRef, {
                        status: 'awake',
                        isOnline: true,
                        lastSeen: serverTimestamp(),
                        lastActivity: serverTimestamp(),
                        photoURL: currentUser.photoURL || userData.photoURL || null,
                        uid: currentUser.uid
                    })

                    console.log('✅ Existing user awake:', fixedDocId)
                } else {
                    // Neuer User
                    setCurrentDisplayName(baseDisplayName)

                    await setDoc(newDocRef, {
                        uid: currentUser.uid,
                        docId: fixedDocId,
                        displayName: baseDisplayName,
                        email: currentUser.email || 'anonymous@chat.local',
                        photoURL: currentUser.photoURL || null,
                        status: 'awake',
                        isOnline: true,
                        lastSeen: serverTimestamp(),
                        lastActivity: serverTimestamp(),
                        createdAt: serverTimestamp(),
                        provider: currentUser.providerData[0]?.providerId || 'anonymous'
                    })

                    console.log('✅ New user registered:', fixedDocId)
                }

                window.__userDocId = fixedDocId
                localStorage.setItem('userDocId', fixedDocId)
            } catch (error) {
                console.error('❌ Fehler beim User-Setup:', error)
            }
        }

        initializeUser()

        // Echtzeit-Listener für ALLE User
        const usersRef = collection(db, 'users')
        const q = query(usersRef)

        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log(`📊 Snapshot erhalten! ${snapshot.size} User gefunden`)

            if (snapshot.empty) {
                console.warn('⚠️ Keine User gefunden!')
                setAwakeUsers([])
                setIdleUsers([])
                setGoneUsers([])
                return
            }

            const allUsers = snapshot.docs.map(doc => {
                const data = doc.data()

                // Berechne Status basierend auf lastActivity
                const now = Date.now()
                const lastActivity = data.lastActivity?.toDate?.() || data.lastSeen?.toDate?.() || new Date(0)
                const timeDiff = now - lastActivity.getTime()

                let calculatedStatus: UserStatus = 'awake'
                if (timeDiff > 10 * 60 * 1000) {  // 10 Minuten
                    calculatedStatus = 'gone'
                } else if (timeDiff > 3 * 60 * 1000) {  // 3 Minuten
                    calculatedStatus = 'idle'
                }

                // Verwende gespeicherten Status oder berechneten
                const finalStatus = data.status || calculatedStatus

                return {
                    id: doc.id,
                    uid: data.uid || doc.id,
                    displayName: data.displayName || 'Anonym',
                    email: data.email || '',
                    status: finalStatus,
                    isOnline: data.isOnline !== false,
                    lastSeen: data.lastSeen,
                    lastActivity: data.lastActivity,
                    photoURL: data.photoURL || null,
                    provider: data.provider
                } as OnlineUser
            })

            // Teile User nach Status auf
            const awake = allUsers.filter(u => u.status === 'awake')
            const idle = allUsers.filter(u => u.status === 'idle')
            const gone = allUsers.filter(u => u.status === 'gone')

            // Sortiere (eigener User zuerst)
            const sortUsers = (users: OnlineUser[]) => {
                return users.sort((a, b) => {
                    if (a.uid === currentUser.uid) return -1
                    if (b.uid === currentUser.uid) return 1
                    return (a.displayName || 'Anonym').localeCompare(b.displayName || 'Anonym')
                })
            }

            setAwakeUsers(sortUsers(awake))
            setIdleUsers(sortUsers(idle))
            setGoneUsers(sortUsers(gone))

            console.log(`👥 Status: ${awake.length} awake, ${idle.length} idle, ${gone.length} gone`)
        })

        // Listener für eigenes User-Dokument
        const userDocId = window.__userDocId || localStorage.getItem('userDocId') || currentUser.uid
        const userRef = doc(db, 'users', userDocId)
        const userUnsubscribe = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                const userData = doc.data()
                setCurrentDisplayName(userData.displayName || currentDisplayName)
            }
        })

        // Heartbeat - alle 60 Sekunden (1 Minute)
        const heartbeatInterval = setInterval(async () => {
            try {
                const docId = window.__userDocId || localStorage.getItem('userDocId')
                if (docId) {
                    await updateDoc(doc(db, 'users', docId), {
                        lastSeen: serverTimestamp()
                        // lastActivity wird nur bei echter Aktivität geupdated
                    })
                    console.log('💓 Heartbeat sent')
                }
            } catch (error) {
                console.log('Heartbeat failed:', error)
            }
        }, 60000)  // 60 Sekunden = 1 Minute

        // Garbage Collector - alle 60 Sekunden (1 Minute)
        const garbageCollector = setInterval(async () => {
            console.log('🧹 Running garbage collector...')
            await cleanupOldSessions()
        }, 60000)  // 60 Sekunden = 1 Minute

        // Page Visibility API
        const handleVisibilityChange = async () => {
            const docId = window.__userDocId || localStorage.getItem('userDocId')
            if (!docId) return

            if (document.hidden) {
                console.log('📱 Tab versteckt - setze Status auf idle nach 60s')

                // Nach 60 Sekunden auf "idle" setzen wenn immer noch versteckt
                setTimeout(async () => {
                    if (document.hidden) {
                        await updateDoc(doc(db, 'users', docId), {
                            status: 'idle',
                            lastSeen: serverTimestamp()
                        })
                        console.log('📱 Tab immer noch versteckt - Status auf idle gesetzt')
                    }
                }, 60000)  // 60 Sekunden = 1 Minute
            } else {
                console.log('📱 Tab wieder sichtbar - setze awake')
                await updateDoc(doc(db, 'users', docId), {
                    status: 'awake',
                    isOnline: true,
                    lastSeen: serverTimestamp(),
                    lastActivity: serverTimestamp()
                })
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        // Cleanup beim Verlassen
        const handleBeforeUnload = () => {
            const docId = window.__userDocId || localStorage.getItem('userDocId')
            if (docId) {
                // Verwende sendBeacon für zuverlässigeres Update beim Schließen
                const data = JSON.stringify({
                    status: 'gone',
                    isOnline: false,
                    lastSeen: new Date().toISOString()
                })

                // Navigator.sendBeacon ist zuverlässiger beim Page-Unload
                // (Funktioniert nur mit echtem Backend-Endpoint)
                // navigator.sendBeacon(`/api/offline/${docId}`, data)

                // Fallback: Direktes Firebase Update (funktioniert manchmal)
                updateDoc(doc(db, 'users', docId), {
                    status: 'gone',
                    isOnline: false,
                    lastSeen: serverTimestamp()
                }).catch(() => {
                    // Erwarte Fehler beim Unload
                })
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        window.addEventListener('unload', handleBeforeUnload)

        // Cleanup
        return () => {
            clearInterval(heartbeatInterval)
            clearInterval(garbageCollector)
            window.removeEventListener('beforeunload', handleBeforeUnload)
            window.removeEventListener('unload', handleBeforeUnload)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            if (unsubscribe) unsubscribe()
            userUnsubscribe()

            // Final gone update
            if (currentUser && window.__userDocId) {
                const docId = window.__userDocId
                updateDoc(doc(db, 'users', docId), {
                    status: 'gone',
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
                const docId = window.__userDocId || localStorage.getItem('userDocId')
                if (docId) {
                    await updateDoc(doc(db, 'users', docId), {
                        status: 'gone',
                        isOnline: false,
                        lastSeen: serverTimestamp()
                    })
                    console.log('✅ User gone gesetzt')
                }
            }

            localStorage.removeItem('userDocId')
            delete window.__userDocId

            await signOut(auth)
            navigate('/login')

        } catch (error) {
            console.error('Logout error:', error)
            alert('Fehler beim Ausloggen. Bitte versuche es erneut.')
            setIsLoggingOut(false)
        }
    }

    const handleInvite = () => setShowShareModal(true)
    const handleOpenSettings = () => setShowSettingsModal(true)

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.origin)
            .then(() => alert('Link wurde in die Zwischenablage kopiert! 📋'))
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

    const formatLastSeen = (lastActivity: any, lastSeen: any) => {
        const relevantTime = lastActivity || lastSeen
        if (!relevantTime) return 'Status unbekannt'

        const date = relevantTime.toDate ? relevantTime.toDate() : new Date(relevantTime)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const minutes = Math.floor(diff / 60000)

        if (minutes < 1) return 'Here now'
        if (minutes < 2) return '(Idle) 1 minute'
        if (minutes < 60) return `${minutes} minutes ago`
        if (minutes < 120) return '(Extended AFK) 1 hour'
        if (minutes < 1440) return `${Math.floor(minutes / 60)} hours ago`
        return `${Math.floor(minutes / 1440)} days ago`
    }

    // Toggle collapse state
    const toggleSection = (section: 'awake' | 'idle' | 'gone') => {
        setCollapsedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }))
    }

    // User Status Component mit flexibler Höhe
    const UserStatusList = ({ isMobile = false }: { isMobile?: boolean }) => (
        <div className={`${isMobile ? '' : 'flex-1 overflow-y-auto min-h-0 max-h-[400px]'} p-3 space-y-4 text-xs`}>
            {/* Awake Users */}
            <div>
                <div
                    className="flex items-center gap-2 font-semibold mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => toggleSection('awake')}
                    style={{ color: '#4CAF50' }}
                >
                    <CirclePlus className="w-5 h-5" strokeWidth={3} />
                    <span>Awake ({awakeUsers.length})</span>
                    {collapsedSections.awake ?
                        <ChevronsUp className="w-3 h-3 ml-auto" strokeWidth={2} /> :
                        <ChevronsDown className="w-3 h-3 ml-auto" strokeWidth={2} />
                    }
                </div>
                {!collapsedSections.awake && (
                    <div className="space-y-1 pl-6">
                        {awakeUsers.length > 0 ? (
                            awakeUsers.map(user => (
                                <div
                                    key={user.id}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#e5f3ff] transition-colors ${
                                        user.uid === currentUser?.uid ? 'bg-[#f0f7ff] border border-[#c7d9ff]' : ''
                                    }`}
                                >
                                    <CircleDot className="w-3 h-3" strokeWidth={4} style={{ color: '#4CAF50' }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate text-[#0f3fae]">
                                            {user.displayName}
                                            {user.uid === currentUser?.uid && ' (Du)'}
                                        </div>
                                        <div className="text-[10px] text-[#6c83ca]">
                                            {formatLastSeen(user.lastActivity, user.lastSeen)}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-[#6c83ca] italic pl-2">Nobody awake...</div>
                        )}
                    </div>
                )}
            </div>

            {/* Idle Users */}
            <div>
                <div
                    className="flex items-center gap-2 font-semibold mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => toggleSection('idle')}
                    style={{ color: '#FF9800' }}
                >
                    <CircleEllipsis className="w-5 h-5" strokeWidth={3} />
                    <span>Idle ({idleUsers.length})</span>
                    {collapsedSections.idle ?
                        <ChevronsUp className="w-3 h-3 ml-auto" strokeWidth={2} /> :
                        <ChevronsDown className="w-3 h-3 ml-auto" strokeWidth={2} />
                    }
                </div>
                {!collapsedSections.idle && (
                    <div className="space-y-1 pl-6">
                        {idleUsers.length > 0 ? (
                            idleUsers.map(user => (
                                <div
                                    key={user.id}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#fff3e0] transition-colors ${
                                        user.uid === currentUser?.uid ? 'bg-[#fff8f0] border border-[#ffd9b3]' : ''
                                    }`}
                                >
                                    <CircleDot className="w-3 h-3" strokeWidth={4} style={{ color: '#FF9800' }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate text-[#b87100]">
                                            {user.displayName}
                                            {user.uid === currentUser?.uid && ' (Du)'}
                                        </div>
                                        <div className="text-[10px] text-[#cc9966]">
                                            {formatLastSeen(user.lastActivity, user.lastSeen)}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-[#cc9966] italic pl-2">Nobody idle...</div>
                        )}
                    </div>
                )}
            </div>

            {/* Gone Users - mit Grau statt Rot */}
            <div>
                <div
                    className="flex items-center gap-2 font-semibold mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => toggleSection('gone')}
                    style={{ color: '#9E9E9E' }}
                >
                    <CircleSlash className="w-5 h-5" strokeWidth={3} />
                    <span>Gone ({goneUsers.length})</span>
                    {collapsedSections.gone ?
                        <ChevronsUp className="w-3 h-3 ml-auto" strokeWidth={2} /> :
                        <ChevronsDown className="w-3 h-3 ml-auto" strokeWidth={2} />
                    }
                </div>
                {!collapsedSections.gone && (
                    <div className="space-y-1 pl-6">
                        {goneUsers.length > 0 ? (
                            goneUsers.map(user => (
                                <div
                                    key={user.id}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors opacity-60 ${
                                        user.uid === currentUser?.uid ? 'bg-gray-50 border border-gray-200' : ''
                                    }`}
                                >
                                    <CircleDot className="w-3 h-3" strokeWidth={4} style={{ color: '#9E9E9E' }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate text-gray-600">
                                            {user.displayName}
                                            {user.uid === currentUser?.uid && ' (Du)'}
                                        </div>
                                        <div className="text-[10px] text-gray-400">
                                            {formatLastSeen(user.lastActivity, user.lastSeen)}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-gray-400 italic pl-2">Nobody gone...</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 bg-gradient-to-br from-[#9ecdfb] via-[#c2dcff] to-[#f1f6ff] overflow-auto"
            style={{ fontFamily: 'Tahoma, Verdana, sans-serif' }}
        >
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-24 -left-24 w-[380px] h-[380px] bg-[radial-gradient(circle,#ffffff75,transparent_70%)] blur-2xl" />
                <div className="absolute top-20 right-10 w-[320px] h-[320px] bg-[radial-gradient(circle,#7fa6ff4d,transparent_70%)] blur-2xl" />
                <div className="absolute bottom-[-160px] left-1/3 w-[420px] h-[420px] bg-[radial-gradient(circle,#c7d9ff80,transparent_70%)] blur-3xl" />
            </div>

            {/* Main Content Container */}
            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-6xl">
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
                                <div className="hidden md:flex items-center gap-3 text-xs text-[#d7e6ff]">
                                    <span className="inline-flex items-center gap-1">
                                        <CircleDot className="w-3 h-3" strokeWidth={3} style={{ color: '#4CAF50' }} />
                                        {awakeUsers.length} awake
                                    </span>
                                    <span className="h-4 w-px bg-white/40" />
                                    <span className="inline-flex items-center gap-1">
                                        <CircleDot className="w-3 h-3" strokeWidth={3} style={{ color: '#FF9800' }} />
                                        {idleUsers.length} idle
                                    </span>
                                </div>
                            </div>

                            <div className="px-5 py-5 md:px-6 md:py-6 md:grid md:grid-cols-[minmax(0,1fr)_280px] md:gap-6 md:items-start">
                                <div className="flex flex-col gap-4">
                                    <div className="bg-white rounded-[16px] border border-[#7a96df] shadow-[0_12px_30px_rgba(58,92,173,0.15)] overflow-hidden">
                                        <ChatBoard />
                                    </div>
                                    <div className="bg-white rounded-[14px] border border-[#7a96df] shadow-[0_10px_20px_rgba(58,92,173,0.12)] overflow-visible">
                                        <ChatBar />
                                    </div>

                                    {/* Mobile User List */}
                                    <div className="md:hidden mt-2">
                                        <div className="rounded-[16px] border border-[#7a96df] bg-white/95 shadow-[0_12px_28px_rgba(58,92,173,0.18)] overflow-hidden">
                                            <div className="bg-gradient-to-r from-[#eaf1ff] to-[#dfe9ff] px-4 py-3 border-b border-[#c7d9ff]">
                                                <div className="text-sm font-semibold text-[#0a4bdd] flex items-center gap-2">
                                                    <Users className="w-5 h-5" strokeWidth={3} />
                                                    User Status
                                                </div>
                                            </div>
                                            <UserStatusList isMobile={true} />
                                        </div>

                                        <div className="mt-4 grid grid-cols-1 gap-2">
                                            <button
                                                onClick={handleInvite}
                                                className="w-full rounded-md border border-[#9eb8ff] bg-gradient-to-b from-white to-[#e6eeff] px-4 py-2 text-sm font-semibold text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-[1px] flex items-center justify-center gap-2"
                                            >
                                                <Share2 className="w-5 h-5" strokeWidth={3} />
                                                Invite a Friend
                                            </button>
                                            <button
                                                onClick={handleOpenSettings}
                                                className="w-full rounded-md border border-[#9eb8ff] bg-gradient-to-b from-white to-[#e6eeff] px-4 py-2 text-sm font-semibold text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-[1px] flex items-center justify-center gap-2"
                                            >
                                                <CircleUserRound className="w-5 h-5" strokeWidth={3} />
                                                Settings
                                            </button>
                                            <button
                                                onClick={handleLogout}
                                                disabled={isLoggingOut}
                                                className="w-full rounded-md border border-[#9eb8ff] bg-gradient-to-b from-white to-[#e6eeff] px-4 py-2 text-sm font-semibold text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-[1px] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                <CirclePower className="w-5 h-5" strokeWidth={3} />
                                                {isLoggingOut ? 'Wird abgemeldet...' : 'Logout'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Desktop Sidebar - mit flexbox für korrekte Höhenanpassung */}
                                <aside className="hidden md:block">
                                    <div className="rounded-[16px] border border-[#7a96df] bg-white/95 shadow-[0_12px_28px_rgba(58,92,173,0.18)] overflow-hidden flex flex-col max-h-[600px]">
                                        <div className="bg-gradient-to-r from-[#eaf1ff] to-[#dfe9ff] px-4 py-3 border-b border-[#c7d9ff] flex-shrink-0">
                                            <div className="text-sm font-semibold text-[#0a4bdd] flex items-center gap-2">
                                                <Users className="w-5 h-5" strokeWidth={3} />
                                                User Status
                                            </div>
                                        </div>

                                        <UserStatusList />

                                        <div className="border-t border-[#c7d9ff] bg-[#f2f6ff] p-3 space-y-2 text-xs flex-shrink-0">
                                            <button
                                                onClick={handleInvite}
                                                className="w-full rounded-md border border-[#9eb8ff] bg-gradient-to-b from-white to-[#e6eeff] px-4 py-2 text-sm font-semibold text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-[1px] flex items-center justify-center gap-2"
                                            >
                                                <Share2 className="w-5 h-5" strokeWidth={3} />
                                                Invite a Friend
                                            </button>
                                            <button
                                                onClick={handleOpenSettings}
                                                className="w-full rounded-md border border-[#9eb8ff] bg-gradient-to-b from-white to-[#e6eeff] px-4 py-2 text-sm font-semibold text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-[1px] flex items-center justify-center gap-2"
                                            >
                                                <CircleUserRound className="w-5 h-5" strokeWidth={3} />
                                                Settings
                                            </button>
                                            <button
                                                onClick={handleLogout}
                                                disabled={isLoggingOut}
                                                className="w-full rounded-md border border-[#9eb8ff] bg-gradient-to-b from-white to-[#e6eeff] px-4 py-2 text-sm font-semibold text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-[1px] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                <CirclePower className="w-5 h-5" strokeWidth={3} />
                                                {isLoggingOut ? 'Wird abgemeldet...' : 'Logout'}
                                            </button>
                                        </div>

                                        {/* Debug Info */}
                                        {import.meta.env.DEV && (
                                            <div className="border-t border-[#c7d9ff] bg-white/90 px-3 py-2 text-[10px] text-[#5c6fb9] flex-shrink-0">
                                                <div>User: {currentUser?.email || 'Anonym'}</div>
                                                <div>UID: {currentUser?.uid?.slice(0, 15)}...</div>
                                                <div>DocID: {window.__userDocId?.slice(0, 15)}...</div>
                                                <div>Total: {awakeUsers.length + idleUsers.length + goneUsers.length} Users</div>
                                            </div>
                                        )}
                                    </div>
                                </aside>
                            </div>
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
        </div>
    )
}