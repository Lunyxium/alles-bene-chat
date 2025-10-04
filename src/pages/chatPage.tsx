import { ChatBoard, ChatBar } from '@/components'
import { SettingsPanel } from '@/components/settingsPanel'
import { ThemeSwitcher } from '@/components/themeSwitcher'
import { useState, useEffect, useRef, useMemo } from 'react'
import { auth, db } from '@/lib/firebase'
import { collection, onSnapshot, query, doc, setDoc, updateDoc, serverTimestamp, getDoc, getDocs, deleteDoc } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { useTheme } from '@/hooks/useTheme'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ChatLayoutMode, LayoutClassTokens, StatusStyleTokens, OnlineUser, UserStatus, CollapsedSections } from './chatPage.types'
import { getLayoutClassTokens, getStatusStyleTokens, getHeaderStatusColors } from './chatPage.styles'
import { UserStatusList } from './chatUserStatusList'
// Lucide Icons Import
import {
    Users,
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

const CHAT_LAYOUT_STORAGE_KEY = 'chat-layout-theme'

export function ChatPage() {
    const [awakeUsers, setAwakeUsers] = useState<OnlineUser[]>([])
    const [idleUsers, setIdleUsers] = useState<OnlineUser[]>([])
    const [goneUsers, setGoneUsers] = useState<OnlineUser[]>([])
    const [showShareModal, setShowShareModal] = useState(false)
    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const [showLogoutDialog, setShowLogoutDialog] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const [currentDisplayName, setCurrentDisplayName] = useState('')
    const [showMobileUsers, setShowMobileUsers] = useState(false)
    const [chatLayout, setChatLayout] = useState<ChatLayoutMode>(() => {
        if (typeof window === 'undefined') {
            return 'classic'
        }

        const stored = window.localStorage.getItem(CHAT_LAYOUT_STORAGE_KEY)
        return stored === 'modern' ? 'modern' : 'classic'
    })
    // Collapse states für die Sections
    const [collapsedSections, setCollapsedSections] = useState<CollapsedSections>({
        awake: false,
        idle: false,
        gone: true  // Gone standardmäßig zugeklappt
    })
    const navigate = useNavigate()
    const currentUser = auth.currentUser
    const containerRef = useRef<HTMLDivElement>(null)
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const isModern = chatLayout === 'modern'

    useEffect(() => {
        if (typeof window === 'undefined') {
            return
        }

        try {
            window.localStorage.setItem(CHAT_LAYOUT_STORAGE_KEY, chatLayout)
        } catch {
            // Ignoriere lokale Speicherfehler (z.B. Privatmodus)
        }
    }, [chatLayout])

    // Verhindere Page-Scrolling
    useEffect(() => {
        if (typeof window === 'undefined') {
            return
        }

        // Fixiere das Viewport nur auf größeren Screens, damit Mobile frei scrollen kann
        if (window.innerWidth < 768) {
            return
        }

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

            const browserWindow = window as typeof window & { __userDocId?: string }

            // Basis-Name für Display
            const shortId = currentUser.uid.slice(0, 8)
            const baseDisplayName = currentUser.displayName ||
                currentUser.email?.split('@')[0] ||
                `Gast_${shortId.slice(0, 4)}`

            const initialName = currentUser.displayName ||
                currentUser.email?.split('@')[0] ||
                'user'
            const cleanInitialName = initialName.toLowerCase()
                .replace(/[^a-z0-9]/g, '_')
                .replace(/_+/g, '_')
                .substring(0, 20)
            const fallbackDocId = `${cleanInitialName}_${shortId}`

            const storedDocId = browserWindow.__userDocId || localStorage.getItem('userDocId') || null

            let targetDocId = storedDocId || fallbackDocId
            let targetDocRef = doc(db, 'users', targetDocId)
            let targetDoc = await getDoc(targetDocRef)

            // Wenn gespeichertes Dokument fehlt, auf Fallback umschalten
            if (!targetDoc.exists() && storedDocId && storedDocId !== fallbackDocId) {
                targetDocId = fallbackDocId
                targetDocRef = doc(db, 'users', targetDocId)
                targetDoc = await getDoc(targetDocRef)
            }

            const legacyDocRef = doc(db, 'users', currentUser.uid)

            try {
                if (targetDoc.exists()) {
                    const userData = targetDoc.data()
                    setCurrentDisplayName(userData.displayName || baseDisplayName)

                    await updateDoc(targetDocRef, {
                        status: 'awake',
                        isOnline: true,
                        lastSeen: serverTimestamp(),
                        lastActivity: serverTimestamp(),
                        photoURL: currentUser.photoURL || userData.photoURL || null,
                        uid: currentUser.uid,
                        displayName: baseDisplayName
                    })

                    console.log('✅ Existing user awake:', targetDocId)
                } else {
                    const legacyDoc = await getDoc(legacyDocRef)

                    if (legacyDoc.exists() && legacyDoc.id !== targetDocId) {
                        console.log('🔄 Migriere altes User-Dokument...')
                        const oldData = legacyDoc.data()

                        await setDoc(targetDocRef, {
                            ...oldData,
                            uid: currentUser.uid,
                            docId: targetDocId,
                            displayName: oldData.displayName || baseDisplayName,
                            status: 'awake',
                            isOnline: true,
                            lastSeen: serverTimestamp(),
                            lastActivity: serverTimestamp(),
                            migrated: true,
                            migratedAt: serverTimestamp()
                        })

                        await deleteDoc(legacyDocRef)
                        setCurrentDisplayName(oldData.displayName || baseDisplayName)
                        console.log('✅ Migration erfolgreich!')
                    } else {
                        setCurrentDisplayName(baseDisplayName)

                        await setDoc(targetDocRef, {
                            uid: currentUser.uid,
                            docId: targetDocId,
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

                        console.log('✅ New user registered:', targetDocId)
                    }
                }

                browserWindow.__userDocId = targetDocId
                localStorage.setItem('userDocId', targetDocId)
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
                // Navigator.sendBeacon wäre zuverlässiger, braucht aber Backend-Endpoint
                // Für zukünftige Implementierung:
                // const data = JSON.stringify({
                //     status: 'gone',
                //     isOnline: false,
                //     lastSeen: new Date().toISOString()
                // })
                // navigator.sendBeacon(`/api/offline/${docId}`, data)

                // Direktes Firebase Update (funktioniert manchmal beim Unload)
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

        if (minutes < 1) return 'Gerade aktiv'
        if (minutes === 1) return 'Vor 1 Minute aktiv'
        if (minutes < 60) return `Vor ${minutes} Minuten aktiv`

        const hours = Math.floor(minutes / 60)
        if (hours === 1) return 'Vor 1 Stunde aktiv'
        if (hours < 24) return `Vor ${hours} Stunden aktiv`

        const days = Math.floor(hours / 24)
        return `Vor ${days} ${days === 1 ? 'Tag' : 'Tagen'} aktiv`
    }

    const formatDebugId = (value?: string | null) => {
        if (!value) return '–'
        if (value.length <= 8) return value
        return `${value.slice(0, 6)}…`
    }

    const layoutClasses = useMemo<LayoutClassTokens>(
        () => getLayoutClassTokens(chatLayout, isDark ? 'dark' : 'light'),
        [chatLayout, isDark]
    )

    const {
        pageBackgroundClass,
        cardShellClass,
        innerPanelBackground,
        headerGradientClass,
        headerMutedTextClass,
        chatBoardContainerClass,
        chatBarContainerClass,
        mobileListContainerClass,
        sidebarContainerClass,
        sidebarHeaderClass,
        sidebarFooterClass,
        debugPanelClass,
        debugLabelClass,
        debugValueClass,
        debugValueAccentClass,
        mobileToggleButtonClass,
        backgroundGlowTopLeft,
        backgroundGlowTopRight,
        backgroundGlowBottom,
        actionButtonClassMobile,
        actionButtonClassDesktop,
        modalOverlayClass,
        shareCardClass,
        shareGlowClass,
        shareHeadingClass,
        shareTextClass,
        shareInputClass,
        shareButtonClass,
        logoutCardClass,
        logoutGlowClass,
        logoutIconWrapClass,
        logoutTitleClass,
        logoutSubtitleClass,
        logoutInfoBoxClass,
        logoutInfoTextClass,
        logoutInfoSubTextClass,
        logoutCancelButtonClass,
        logoutConfirmButtonClass
    } = layoutClasses

    const statusStyles = useMemo<StatusStyleTokens>(
        () => getStatusStyleTokens(chatLayout),
        [chatLayout]
    )

    const headerStatusColors = useMemo(
        () => getHeaderStatusColors(chatLayout),
        [chatLayout]
    )

    // Toggle collapse state
    const toggleSection = (section: UserStatus) => {
        setCollapsedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }))
    }



    const totalUsers = awakeUsers.length + idleUsers.length + goneUsers.length

    const LayoutShell = (isModern ? Card : 'div') as React.ElementType
    const HeaderWrapper = (isModern ? CardHeader : 'div') as React.ElementType

    const inviteButtonToneClass = isDark
        ? '!text-white/90 hover:!text-white hover:!bg-white/10'
        : '!text-blue-600 hover:!text-blue-700 hover:!bg-blue-50'

    const logoutButtonToneClass = isDark
        ? '!text-red-300 hover:!text-red-200'
        : '!text-red-700 hover:!text-red-800'

    const dialogOverlayToneClass = isModern
        ? (isDark
            ? 'bg-slate-900/75 backdrop-blur-[24px] !z-[9998]'
            : 'bg-white/75 backdrop-blur-[24px] !z-[9998]')
        : undefined

    const dialogOverlayToneStyle = isModern
        ? (isDark
            ? { backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 9998 }
            : { backgroundColor: 'rgba(241, 245, 249, 0.75)', zIndex: 9998 })
        : undefined

    const dialogContentToneClass = isModern
        ? (isDark
            ? 'bg-slate-800/95 text-slate-50 border-slate-600/70 shadow-[0_28px_90px_rgba(0,0,0,0.9)] backdrop-blur-xl ring-1 ring-slate-500/40'
            : 'bg-white/96 text-slate-900 border-slate-200/80 shadow-[0_28px_90px_rgba(15,23,42,0.18)] backdrop-blur-xl')
        : undefined

    const dialogContentToneStyle = isModern
        ? (isDark
            ? {
                backgroundColor: 'rgba(30, 41, 59, 0.96)',
                color: '#f1f5f9',
                borderColor: 'rgba(100, 116, 139, 0.7)',
                zIndex: 9999
            }
            : {
                backgroundColor: 'rgba(255, 255, 255, 0.96)',
                color: '#0f172a',
                borderColor: 'rgba(148, 163, 184, 0.45)',
                zIndex: 9999
            })
        : undefined

    return (
        <div
            ref={containerRef}
            data-chat-layout={chatLayout}
            className={`relative min-h-[100dvh] overflow-x-hidden md:overflow-hidden ${pageBackgroundClass} ${isModern ? 'chat-layout-modern' : 'chat-layout-classic'}`}
            style={{ fontFamily: 'Tahoma, Verdana, sans-serif' }}
        >
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className={`absolute -top-24 -left-24 hidden h-[320px] w-[320px] blur-2xl sm:block ${backgroundGlowTopLeft}`} />
                <div className={`absolute top-24 right-10 hidden h-[280px] w-[280px] blur-2xl md:block ${backgroundGlowTopRight}`} />
                <div className={`absolute bottom-[-160px] left-1/3 hidden h-[360px] w-[360px] blur-3xl md:block ${backgroundGlowBottom}`} />
            </div>

            {/* Main Content Container */}
            <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-3 py-4 sm:px-4 md:px-6 md:py-8">
                <div className="flex-1 md:flex md:items-center md:justify-center">
                    <LayoutShell className={cn('relative w-full md:overflow-hidden', !isModern && 'rounded-[20px]', cardShellClass)}>
                        <div className={cn('relative flex min-h-[70vh] flex-col md:min-h-0', innerPanelBackground)}>
                            {/* Header */}
                            <HeaderWrapper className={cn('flex items-center gap-4 px-4 py-3 md:px-5', headerGradientClass, isModern ? (isDark ? 'text-white/90' : 'text-slate-900') : 'text-white')}>
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        'w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center text-lg',
                                        isModern && isDark ? 'border border-white/40 bg-white/20' : 'border border-white/40 bg-white/20'
                                    )}>
                                        💬
                                    </div>
                                    <div className="leading-tight">
                                        <p className={cn(
                                            'text-xs uppercase tracking-[0.3em]',
                                            isModern ? (isDark ? 'text-slate-400' : 'text-slate-600') : (isDark ? 'text-[#bfdbfe]' : 'text-[#cfe0ff]')
                                        )}>Retro Room</p>
                                        <h1 className={cn(
                                            'text-lg font-semibold',
                                            isModern && !isDark && 'text-slate-900'
                                        )} style={{ fontFamily: 'Trebuchet MS, Tahoma, sans-serif' }}>
                                            Alles Bene Messenger
                                        </h1>
                                    </div>
                                </div>
                                <div className="ml-auto flex items-center gap-2">
                                    <div className={`hidden items-center gap-3 text-xs ${headerMutedTextClass} md:flex`}>
                                        <span className="inline-flex items-center gap-1">
                                            <CircleDot className="w-3 h-3" strokeWidth={3} style={{ color: headerStatusColors.awake }} />
                                            {awakeUsers.length} online
                                        </span>
                                        {isModern ? (
                                            <Separator orientation="vertical" className="hidden h-4 bg-white/40 md:block" decorative />
                                        ) : (
                                            <span className="h-4 w-px bg-white/40" />
                                        )}
                                        <span className="inline-flex items-center gap-1">
                                            <CircleDot className="w-3 h-3" strokeWidth={3} style={{ color: headerStatusColors.idle }} />
                                            {idleUsers.length} abwesend
                                        </span>
                                    </div>
                                    <ThemeSwitcher size="sm" className="hidden md:inline-flex" />
                                    {isModern ? (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowMobileUsers((val) => !val)}
                                            className={cn('md:hidden rounded-full px-3 py-1.5 text-[11px] font-semibold text-white/90', mobileToggleButtonClass)}
                                        >
                                            <Users className="h-4 w-4" strokeWidth={2.5} />
                                            <span>{totalUsers} Nutzer</span>
                                            {showMobileUsers ? (
                                                <ChevronsUp className="h-4 w-4" strokeWidth={2.5} />
                                            ) : (
                                                <ChevronsDown className="h-4 w-4" strokeWidth={2.5} />
                                            )}
                                        </Button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setShowMobileUsers((val) => !val)}
                                            className={`${mobileToggleButtonClass} md:hidden`}
                                        >
                                            <Users className="h-4 w-4" strokeWidth={2.5} />
                                            <span>{totalUsers} Nutzer</span>
                                            {showMobileUsers ? (
                                                <ChevronsUp className="h-4 w-4" strokeWidth={2.5} />
                                            ) : (
                                                <ChevronsDown className="h-4 w-4" strokeWidth={2.5} />
                                            )}
                                        </button>
                                    )}
                                    <ThemeSwitcher size="sm" className="md:hidden" />
                                </div>
                            </HeaderWrapper>

                            <div className="flex flex-1 flex-col gap-4 px-4 pb-5 pt-4 md:grid md:grid-cols-[minmax(0,1fr)_280px] md:gap-6 md:px-6 md:pb-6 md:pt-5">
                                <div className="relative flex min-h-[50vh] flex-col gap-3 md:min-h-0 md:gap-4">
                                    <div className={`flex-1 overflow-hidden rounded-[16px] ${chatBoardContainerClass}`}>
                                        <ChatBoard chatLayout={chatLayout} />
                                    </div>
                                    <div className={`sticky bottom-2 z-20 overflow-visible rounded-[14px] ${chatBarContainerClass} md:static md:backdrop-blur-none`}>
                                        <ChatBar chatLayout={chatLayout} />
                                    </div>

                                    {/* Mobile User List */}
                                    {showMobileUsers && (
                                        <div className="md:hidden">
                                            <div className={`rounded-[16px] ${mobileListContainerClass}`}>
                                                <div className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold ${sidebarHeaderClass}`}>
                                                    <Users className="h-5 w-5" strokeWidth={3} />
                                                    Online-Status
                                                </div>
                                                <UserStatusList
                                                    awakeUsers={awakeUsers}
                                                    idleUsers={idleUsers}
                                                    goneUsers={goneUsers}
                                                    collapsedSections={collapsedSections}
                                                    onToggleSection={toggleSection}
                                                    statusStyles={statusStyles}
                                                    isDark={isDark}
                                                    isModern={isModern}
                                                    currentUserId={currentUser?.uid}
                                                    formatLastSeen={formatLastSeen}
                                                    isMobile
                                                />
                                            </div>

                                            <div className="mt-3 grid grid-cols-1 gap-2">
                                                {isModern ? (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        onClick={handleInvite}
                                                        className={cn(actionButtonClassMobile, 'text-xs font-medium', inviteButtonToneClass)}
                                                    >
                                                        <Share2 className="h-3.5 w-3.5" strokeWidth={2} />
                                                        Invite a Friend
                                                    </Button>
                                                ) : (
                                                    <button
                                                        onClick={handleInvite}
                                                        className={actionButtonClassMobile}
                                                    >
                                                        <Share2 className="h-3.5 w-3.5" strokeWidth={2} />
                                                        Invite a Friend
                                                    </button>
                                                )}
                                                {isModern ? (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleOpenSettings}
                                                        className={cn(
                                                            'w-full justify-center rounded-2xl border-2 transition-all',
                                                            isDark
                                                                ? 'border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300'
                                                                : 'border-blue-300/50 bg-blue-50/80 hover:bg-blue-100 text-blue-700'
                                                        )}
                                                    >
                                                        <CircleUserRound className="h-3.5 w-3.5" strokeWidth={2} />
                                                        Settings
                                                    </Button>
                                                ) : (
                                                    <button
                                                        onClick={handleOpenSettings}
                                                        className={actionButtonClassMobile}
                                                    >
                                                        <CircleUserRound className="h-3.5 w-3.5" strokeWidth={2} />
                                                        Settings
                                                    </button>
                                                )}
                                                {isModern ? (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setShowLogoutDialog(true)}
                                                        disabled={isLoggingOut}
                                                        className={cn(
                                                            'w-full justify-center rounded-2xl border-2 transition-all',
                                                            isDark
                                                                ? 'border-red-500/30 bg-red-500/10 hover:bg-red-500/20'
                                                                : 'border-red-300/50 bg-red-50/80 hover:bg-red-100',
                                                            logoutButtonToneClass
                                                        )}
                                                    >
                                                        <CirclePower className="h-3.5 w-3.5" strokeWidth={2} />
                                                        {isLoggingOut ? 'Wird abgemeldet...' : 'Logout'}
                                                    </Button>
                                                ) : (
                                                    <button
                                                        onClick={() => setShowLogoutDialog(true)}
                                                        disabled={isLoggingOut}
                                                        className={actionButtonClassMobile}
                                                    >
                                                        <CirclePower className="h-3.5 w-3.5" strokeWidth={2} />
                                                        {isLoggingOut ? 'Wird abgemeldet...' : 'Logout'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Desktop Sidebar - mit fester Höhe für konsistente Darstellung */}
                                <aside className="hidden md:block">
                                    <div className={`rounded-[16px] overflow-hidden flex flex-col h-[580px] ${sidebarContainerClass}`}>
                                        {isModern ? (
                                            <CardHeader className={cn('px-5 py-4 flex-shrink-0', sidebarHeaderClass)}>
                                                <CardTitle className="text-sm font-semibold flex items-center gap-2.5">
                                                    <Users className="w-5 h-5" strokeWidth={2.5} />
                                                    Online-Status
                                                    <Badge 
                                                        variant="secondary" 
                                                        className={cn(
                                                            'ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                                                            isDark 
                                                                ? 'bg-slate-900/40 border-white/10 text-slate-300' 
                                                                : 'bg-white/80 border-slate-200/60 text-slate-700'
                                                        )}
                                                    >
                                                        {totalUsers} {totalUsers === 1 ? 'Nutzer' : 'Nutzer'}
                                                    </Badge>
                                                </CardTitle>
                                            </CardHeader>
                                        ) : (
                                            <div className={`${sidebarHeaderClass} px-4 py-3 flex-shrink-0`}> 
                                                <div className="text-sm font-semibold flex items-center gap-2">
                                                    <Users className="w-5 h-5" strokeWidth={3} />
                                                    Online-Status
                                                </div>
                                            </div>
                                        )}

                                        <UserStatusList
                                            awakeUsers={awakeUsers}
                                            idleUsers={idleUsers}
                                            goneUsers={goneUsers}
                                            collapsedSections={collapsedSections}
                                            onToggleSection={toggleSection}
                                            statusStyles={statusStyles}
                                            isDark={isDark}
                                            isModern={isModern}
                                            currentUserId={currentUser?.uid}
                                            formatLastSeen={formatLastSeen}
                                        />

                                        <div className={`${sidebarFooterClass} p-3 space-y-2 text-xs flex-shrink-0`}>
                                            {isModern ? (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    onClick={handleInvite}
                                                    className={cn(actionButtonClassDesktop, 'text-xs font-medium', inviteButtonToneClass)}
                                                >
                                                    <Share2 className="w-3.5 h-3.5" strokeWidth={2} />
                                                    Invite a Friend
                                                </Button>
                                            ) : (
                                                <button
                                                    onClick={handleInvite}
                                                    className={actionButtonClassDesktop}
                                                >
                                                    <Share2 className="w-3.5 h-3.5" strokeWidth={2} />
                                                    Invite a Friend
                                                </button>
                                            )}
                                            {isModern ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleOpenSettings}
                                                    className={cn(
                                                        'w-full justify-center rounded-2xl border-2 transition-all',
                                                        isDark
                                                            ? 'border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300'
                                                            : 'border-blue-300/50 bg-blue-50/80 hover:bg-blue-100 text-blue-700'
                                                    )}
                                                >
                                                    <CircleUserRound className="w-3.5 h-3.5" strokeWidth={2} />
                                                    Settings
                                                </Button>
                                            ) : (
                                                <button
                                                    onClick={handleOpenSettings}
                                                    className={actionButtonClassDesktop}
                                                >
                                                    <CircleUserRound className="w-3.5 h-3.5" strokeWidth={2} />
                                                    Settings
                                                </button>
                                            )}
                                            {isModern ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setShowLogoutDialog(true)}
                                                    disabled={isLoggingOut}
                                                    className={cn(
                                                        'w-full justify-center rounded-2xl border-2 transition-all',
                                                        isDark
                                                            ? 'border-red-500/30 bg-red-500/10 hover:bg-red-500/20'
                                                            : 'border-red-300/50 bg-red-50/80 hover:bg-red-100',
                                                        logoutButtonToneClass
                                                    )}
                                                >
                                                    <CirclePower className="w-3.5 h-3.5" strokeWidth={2} />
                                                    {isLoggingOut ? 'Wird abgemeldet...' : 'Logout'}
                                                </Button>
                                            ) : (
                                                <button
                                                    onClick={() => setShowLogoutDialog(true)}
                                                    disabled={isLoggingOut}
                                                    className={actionButtonClassDesktop}
                                                >
                                                    <CirclePower className="w-3.5 h-3.5" strokeWidth={2} />
                                                    {isLoggingOut ? 'Wird abgemeldet...' : 'Logout'}
                                                </button>
                                            )}
                                        </div>

                                        {/* Debug Info */}
                                        {import.meta.env.DEV && (
                                            <div className={`${debugPanelClass} px-3 py-2 text-[10px] flex-shrink-0`}>
                                                <div className={`mb-1 font-semibold ${debugValueAccentClass}`}>Debug (nur lokal)</div>
                                                <div className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1">
                                                    <span className={debugLabelClass}>Nutzer</span>
                                                    <span className={`font-medium break-all ${debugValueClass}`}>{currentUser?.email || 'Anonym'}</span>
                                                    <span className={debugLabelClass}>UID</span>
                                                    <span className={`font-mono ${debugValueClass}`}>{formatDebugId(currentUser?.uid || null)}</span>
                                                    <span className={debugLabelClass}>DocID</span>
                                                    <span className={`font-mono ${debugValueClass}`}>{formatDebugId(window.__userDocId || null)}</span>
                                                    <span className={debugLabelClass}>Gesamt</span>
                                                    <span className={`font-medium ${debugValueClass}`}>{totalUsers === 1 ? '1 Nutzer' : `${totalUsers} Nutzer`}</span>
                                                    <span className={debugLabelClass}>Status</span>
                                                    <span className={`font-mono ${debugValueClass}`}>
                                                        {awakeUsers.length}/{idleUsers.length}/{goneUsers.length}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </aside>
                            </div>
                        </div>
                    </LayoutShell>
                </div>
            </div>

            {/* Share Modal */}
            {isModern ? (
                <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
                    <DialogContent
                        overlayClassName={dialogOverlayToneClass}
                        overlayStyle={dialogOverlayToneStyle}
                        className={cn('max-w-md gap-5 !z-[9999]', dialogContentToneClass)}
                        data-theme={isDark ? 'dark' : 'light'}
                        style={dialogContentToneStyle}
                    >
                        <div className={shareGlowClass} />
                        <DialogHeader className="space-y-2 text-left">
                            <DialogTitle style={{ fontFamily: 'Trebuchet MS, Tahoma, sans-serif' }} className={shareHeadingClass}>
                                Freund einladen
                            </DialogTitle>
                            <DialogDescription className={shareTextClass}>
                                Teile diesen magischen Link mit deinen MSN-Buddies:
                            </DialogDescription>
                        </DialogHeader>
                        <Input
                            value={typeof window !== 'undefined' ? window.location.origin : ''}
                            readOnly
                            onClick={(e) => e.currentTarget.select()}
                            className={cn('mt-1', shareInputClass)}
                        />
                        <div className="grid grid-cols-3 gap-2 text-sm">
                            <Button type="button" variant="secondary" size="sm" onClick={copyLink} className="justify-center">
                                📋 Kopieren
                            </Button>
                            <Button type="button" variant="secondary" size="sm" onClick={shareWhatsApp} className="justify-center">
                                💬 WhatsApp
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setShowShareModal(false)}
                                className="justify-center"
                            >
                                Schließen
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            ) : (
                showShareModal && (
                    <div className={modalOverlayClass}>
                        <div className={shareCardClass}>
                            <div className={shareGlowClass} />
                            <h3 className={shareHeadingClass} style={{ fontFamily: 'Trebuchet MS, Tahoma, sans-serif' }}>
                                Freund einladen
                            </h3>
                            <p className={shareTextClass}>
                                Teile diesen magischen Link mit deinen MSN-Buddies:
                            </p>
                            <input
                                type="text"
                                value={window.location.origin}
                                readOnly
                                className={shareInputClass}
                                onClick={(e) => e.currentTarget.select()}
                            />
                            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                                <button
                                    onClick={copyLink}
                                    className={shareButtonClass}
                                >
                                    📋 Kopieren
                                </button>
                                <button
                                    onClick={shareWhatsApp}
                                    className={shareButtonClass}
                                >
                                    💬 WhatsApp
                                </button>
                                <button
                                    onClick={() => setShowShareModal(false)}
                                    className={shareButtonClass}
                                >
                                    Schließen
                                </button>
                            </div>
                        </div>
                    </div>
                )
            )}

            {/* Logout Confirmation Dialog */}
            {isModern ? (
                <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                    <DialogContent
                        overlayClassName={dialogOverlayToneClass}
                        overlayStyle={dialogOverlayToneStyle}
                        className={cn('max-w-md gap-5', logoutCardClass, dialogContentToneClass)}
                        data-theme={isDark ? 'dark' : 'light'}
                        style={dialogContentToneStyle}
                    >
                        <div className={logoutGlowClass} />
                        <DialogHeader className="space-y-3 text-left">
                            <div className="flex items-center gap-3">
                                <div className={logoutIconWrapClass}>
                                    <CirclePower className="w-5 h-5 text-[#ff6b00]" strokeWidth={2} />
                                </div>
                                <div>
                                    <DialogTitle className={logoutTitleClass} style={{ fontFamily: 'Trebuchet MS, Tahoma, sans-serif' }}>
                                        Ausloggen bestätigen
                                    </DialogTitle>
                                    <DialogDescription className={logoutSubtitleClass}>
                                        Möchtest du den Chat wirklich verlassen?
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                        <div className={logoutInfoBoxClass}>
                            <p className={logoutInfoTextClass}>
                                Du wirst aus dem Chat ausgeloggt und zur Login-Seite weitergeleitet.
                            </p>
                            <p className={logoutInfoSubTextClass}>
                                Dein Online-Status wird auf &quot;Gone&quot; gesetzt.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setShowLogoutDialog(false)}
                                className="flex-1 justify-center"
                            >
                                Abbrechen
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                    setShowLogoutDialog(false)
                                    handleLogout()
                                }}
                                className="flex-1 justify-center"
                            >
                                Ausloggen
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            ) : (
                showLogoutDialog && (
                    <div className={modalOverlayClass}>
                        <div className={logoutCardClass}>
                            <div className={logoutGlowClass} />

                            {/* Header */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className={logoutIconWrapClass}>
                                    <CirclePower className="w-5 h-5 text-[#ff6b00]" strokeWidth={2} />
                                </div>
                                <div>
                                    <h3 className={logoutTitleClass} style={{ fontFamily: 'Trebuchet MS, Tahoma, sans-serif' }}>
                                        Ausloggen bestätigen
                                    </h3>
                                    <p className={logoutSubtitleClass}>Möchtest du den Chat wirklich verlassen?</p>
                                </div>
                            </div>

                            {/* Content */}
                            <div className={logoutInfoBoxClass}>
                                <p className={logoutInfoTextClass}>
                                    Du wirst aus dem Chat ausgeloggt und zur Login-Seite weitergeleitet.
                                </p>
                                <p className={logoutInfoSubTextClass}>
                                    Dein Online-Status wird auf &quot;Gone&quot; gesetzt.
                                </p>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowLogoutDialog(false)}
                                    className={logoutCancelButtonClass}
                                >
                                    Abbrechen
                                </button>
                                <button
                                    onClick={() => {
                                        setShowLogoutDialog(false)
                                        handleLogout()
                                    }}
                                    className={logoutConfirmButtonClass}
                                >
                                    Ausloggen
                                </button>
                            </div>
                        </div>
                    </div>
                )
            )}

            {/* Settings Modal */}
            <SettingsPanel
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                currentDisplayName={currentDisplayName}
                chatLayout={chatLayout}
                onChatLayoutChange={(layout) => setChatLayout(layout)}
            />
        </div>
    )
}
