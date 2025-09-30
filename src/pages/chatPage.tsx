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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
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

type ChatLayoutMode = 'classic' | 'modern'

interface LayoutClassTokens {
    pageBackgroundClass: string
    cardShellClass: string
    innerPanelBackground: string
    headerGradientClass: string
    headerMutedTextClass: string
    chatBoardContainerClass: string
    chatBarContainerClass: string
    mobileListContainerClass: string
    sidebarContainerClass: string
    sidebarHeaderClass: string
    sidebarFooterClass: string
    debugPanelClass: string
    debugLabelClass: string
    debugValueClass: string
    debugValueAccentClass: string
    mobileToggleButtonClass: string
    backgroundGlowTopLeft: string
    backgroundGlowTopRight: string
    backgroundGlowBottom: string
    actionButtonClassMobile: string
    actionButtonClassDesktop: string
    modalOverlayClass: string
    shareCardClass: string
    shareGlowClass: string
    shareHeadingClass: string
    shareTextClass: string
    shareInputClass: string
    shareButtonClass: string
    logoutCardClass: string
    logoutGlowClass: string
    logoutIconWrapClass: string
    logoutTitleClass: string
    logoutSubtitleClass: string
    logoutInfoBoxClass: string
    logoutInfoTextClass: string
    logoutInfoSubTextClass: string
    logoutCancelButtonClass: string
    logoutConfirmButtonClass: string
}

interface StatusCardVariant {
    self: string
    other: string
    hover: string
    text: string
    subText: string
}

type StatusAppearance = Record<'dark' | 'light', StatusCardVariant>

interface StatusStyleTokens {
    awake: StatusAppearance
    idle: StatusAppearance
    gone: StatusAppearance
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
    const [collapsedSections, setCollapsedSections] = useState({
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

    const layoutClasses = useMemo<LayoutClassTokens>(() => {
        const classicDark: LayoutClassTokens = {
            pageBackgroundClass: 'bg-gradient-to-br from-[#0b1120] via-[#10172a] to-[#0f172a]',
            cardShellClass: 'border border-[#1d3a7a] bg-[#0f172a]/95 backdrop-blur-sm shadow-[0_20px_45px_rgba(8,47,73,0.45)] text-[#e2e8f0]',
            innerPanelBackground: 'bg-[#0f172a]/95',
            headerGradientClass: 'bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#1e3a8a]',
            headerMutedTextClass: 'text-[#93c5fd]',
            chatBoardContainerClass: 'border border-[#1d3a7a] bg-[#0f172a] shadow-[0_12px_30px_rgba(8,47,73,0.25)]',
            chatBarContainerClass: 'border border-[#1d3a7a] bg-[#101a32]/95 shadow-[0_10px_20px_rgba(8,47,73,0.25)] backdrop-blur',
            mobileListContainerClass: 'border border-[#1d3a7a] bg-[#101a32]/95 shadow-[0_12px_28px_rgba(8,47,73,0.3)]',
            sidebarContainerClass: 'border border-[#1d3a7a] bg-[#101a32]/95 shadow-[0_12px_28px_rgba(8,47,73,0.28)]',
            sidebarHeaderClass: 'bg-gradient-to-r from-[#1e3a8a]/80 via-[#1d4ed8]/70 to-[#1e3a8a]/80 border-b border-[#243b73] text-[#bfdbfe]',
            sidebarFooterClass: 'border-t border-[#243b73] bg-[#0f1a33]',
            debugPanelClass: 'border-t border-[#243b73] bg-[#0f172a]/90 text-[#9fb7dd]',
            debugLabelClass: 'text-[#7d90c5]',
            debugValueClass: 'text-[#dbeafe]',
            debugValueAccentClass: 'text-[#93c5fd]',
            mobileToggleButtonClass: 'inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition',
            backgroundGlowTopLeft: 'bg-[radial-gradient(circle,#1e3a8a33,transparent_70%)]',
            backgroundGlowTopRight: 'bg-[radial-gradient(circle,#1d4ed820,transparent_70%)]',
            backgroundGlowBottom: 'bg-[radial-gradient(circle,#312e8130,transparent_70%)]',
            actionButtonClassMobile: 'flex w-full items-center justify-center gap-1.5 rounded-md border border-[#1d3a7a] bg-[#14203d] px-3 py-2 text-[11px] font-medium text-[#bfdbfe] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-transform hover:-translate-y-[0.5px] disabled:cursor-not-allowed disabled:opacity-60',
            actionButtonClassDesktop: 'w-full rounded-md border border-[#1d3a7a] bg-[#14203d] px-3 py-1.5 text-[11px] font-medium text-[#bfdbfe] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-transform hover:-translate-y-[0.5px] disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-1.5',
            modalOverlayClass: 'fixed inset-0 bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4',
            shareCardClass: 'relative w-full max-w-md rounded-2xl border border-[#1d3a7a] bg-[#0f172a]/95 text-[#dbeafe] shadow-[0_18px_40px_rgba(8,47,73,0.55)] p-6',
            shareGlowClass: 'absolute -top-8 right-8 w-24 h-24 bg-[radial-gradient(circle,#1d4ed820,transparent_70%)] blur-xl',
            shareHeadingClass: 'text-lg font-semibold text-[#dbeafe]',
            shareTextClass: 'mt-2 text-sm text-[#9fb7dd]',
            shareInputClass: 'mt-4 w-full rounded-md border border-[#1d3a7a] bg-[#0b1225] px-3 py-2 text-sm text-[#bfdbfe] focus:outline-none focus:border-[#60a5fa] focus:ring-2 focus:ring-[#1d4ed8]',
            shareButtonClass: 'rounded-md border border-[#1d3a7a] bg-[#14203d] px-3 py-2 text-[#bfdbfe] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-transform hover:-translate-y-[2px]',
            logoutCardClass: 'relative w-full max-w-md rounded-2xl border border-[#1d3a7a] bg-[#0f172a]/95 text-[#dbeafe] shadow-[0_18px_40px_rgba(8,47,73,0.55)] p-6',
            logoutGlowClass: 'absolute -top-8 right-8 w-24 h-24 bg-[radial-gradient(circle,#1d4ed820,transparent_70%)] blur-xl',
            logoutIconWrapClass: 'w-10 h-10 rounded-full border border-[#b91c1c] bg-gradient-to-b from-[#3f1d1d] to-[#2c1515] flex items-center justify-center',
            logoutTitleClass: 'text-lg font-semibold text-[#dbeafe]',
            logoutSubtitleClass: 'text-xs text-[#93c5fd]',
            logoutInfoBoxClass: 'bg-[#101a32] border border-[#1d3a7a] rounded-lg p-4 mb-4',
            logoutInfoTextClass: 'text-sm text-[#bfdbfe]',
            logoutInfoSubTextClass: 'text-xs text-[#93c5fd] mt-2',
            logoutCancelButtonClass: 'flex-1 rounded-md border border-[#1d3a7a] bg-[#14203d] px-3 py-2 text-sm font-medium text-[#bfdbfe] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-transform hover:-translate-y-[1px]',
            logoutConfirmButtonClass: 'flex-1 rounded-md border border-[#b91c1c] bg-gradient-to-b from-[#451a1a] to-[#2d0f0f] px-3 py-2 text-sm font-semibold text-[#fca5a5] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-transform hover:-translate-y-[1px]'
        }

        const classicLight: LayoutClassTokens = {
            pageBackgroundClass: 'bg-gradient-to-br from-[#9ecdfb] via-[#c2dcff] to-[#f1f6ff]',
            cardShellClass: 'border border-[#7fa6f7] bg-white/95 backdrop-blur-sm shadow-[0_20px_45px_rgba(40,94,173,0.28)]',
            innerPanelBackground: 'bg-[#f9fbff]/95',
            headerGradientClass: 'bg-gradient-to-r from-[#0a4bdd] via-[#2a63f1] to-[#0a4bdd]',
            headerMutedTextClass: 'text-[#d7e6ff]',
            chatBoardContainerClass: 'border border-[#7a96df] bg-white shadow-[0_12px_30px_rgba(58,92,173,0.15)]',
            chatBarContainerClass: 'border border-[#7a96df] bg-white/95 shadow-[0_10px_20px_rgba(58,92,173,0.12)] backdrop-blur',
            mobileListContainerClass: 'border border-[#7a96df] bg-white/95 shadow-[0_12px_28px_rgba(58,92,173,0.18)]',
            sidebarContainerClass: 'border border-[#7a96df] bg-white/95 shadow-[0_12px_28px_rgba(58,92,173,0.18)]',
            sidebarHeaderClass: 'bg-gradient-to-r from-[#eaf1ff] to-[#dfe9ff] border-b border-[#c7d9ff] text-[#0a4bdd]',
            sidebarFooterClass: 'border-t border-[#c7d9ff] bg-[#f2f6ff]',
            debugPanelClass: 'border-t border-[#c7d9ff] bg-white/90 text-[#5c6fb9]',
            debugLabelClass: 'text-[#6c83ca]',
            debugValueClass: 'text-[#0a4bdd]',
            debugValueAccentClass: 'text-[#3f58b1]',
            mobileToggleButtonClass: 'inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-[11px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition',
            backgroundGlowTopLeft: 'bg-[radial-gradient(circle,#ffffff75,transparent_70%)]',
            backgroundGlowTopRight: 'bg-[radial-gradient(circle,#7fa6ff4d,transparent_70%)]',
            backgroundGlowBottom: 'bg-[radial-gradient(circle,#c7d9ff80,transparent_70%)]',
            actionButtonClassMobile: 'flex w-full items-center justify-center gap-1.5 rounded-md border border-[#9eb8ff] bg-gradient-to-b from-white to-[#e6eeff] px-3 py-2 text-[11px] font-medium text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-[0.5px] disabled:cursor-not-allowed disabled:opacity-60',
            actionButtonClassDesktop: 'w-full rounded-md border border-[#9eb8ff] bg-gradient-to-b from-white to-[#e6eeff] px-3 py-1.5 text-[11px] font-medium text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-[0.5px] disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-1.5',
            modalOverlayClass: 'fixed inset-0 bg-[#1a225040]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4',
            shareCardClass: 'relative w-full max-w-md rounded-2xl border border-[#7fa6f7] bg-white/95 shadow-[0_18px_40px_rgba(40,94,173,0.25)] p-6',
            shareGlowClass: 'absolute -top-8 right-8 w-24 h-24 bg-[radial-gradient(circle,#7fa6ff4d,transparent_70%)] blur-xl',
            shareHeadingClass: 'text-lg font-semibold text-[#0a4bdd]',
            shareTextClass: 'mt-2 text-sm text-[#4b5f9b]',
            shareInputClass: 'mt-4 w-full rounded-md border border-[#7a96df] bg-[#f5f8ff] px-3 py-2 text-sm text-[#0a4bdd] focus:outline-none focus:ring-2 focus:ring-[#b7c8ff]',
            shareButtonClass: 'rounded-md border border-[#7a96df] bg-gradient-to-b from-white to-[#e6eeff] px-3 py-2 text-[#0a4bdd] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-transform hover:-translate-y-[2px]',
            logoutCardClass: 'relative w-full max-w-md rounded-2xl border border-[#7fa6f7] bg-white/95 shadow-[0_18px_40px_rgba(40,94,173,0.25)] p-6',
            logoutGlowClass: 'absolute -top-8 right-8 w-24 h-24 bg-[radial-gradient(circle,#7fa6ff4d,transparent_70%)] blur-xl',
            logoutIconWrapClass: 'w-10 h-10 rounded-full border border-[#9eb8ff] bg-gradient-to-b from-[#fff3e0] to-[#ffe6cc] flex items-center justify-center',
            logoutTitleClass: 'text-lg font-semibold text-[#0a4bdd]',
            logoutSubtitleClass: 'text-xs text-[#6c83ca]',
            logoutInfoBoxClass: 'bg-[#f5f8ff] border border-[#c7d9ff] rounded-lg p-4 mb-4',
            logoutInfoTextClass: 'text-sm text-[#4b5f9b]',
            logoutInfoSubTextClass: 'text-xs text-[#6c83ca] mt-2',
            logoutCancelButtonClass: 'flex-1 rounded-md border border-[#9eb8ff] bg-gradient-to-b from-white to-[#e6eeff] px-3 py-2 text-sm font-medium text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-transform hover:-translate-y-[1px]',
            logoutConfirmButtonClass: 'flex-1 rounded-md border border-[#dc2626] bg-gradient-to-b from-[#fef2f2] to-[#fee2e2] px-3 py-2 text-sm font-semibold text-[#dc2626] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-transform hover:-translate-y-[1px]'
        }

        const modernDark: LayoutClassTokens = {
            pageBackgroundClass: 'bg-gradient-to-br from-[#0d0f15] via-[#161925] to-[#1f2430]',
            cardShellClass: 'border border-slate-800/80 bg-[#1f242f]/95 backdrop-blur-2xl text-slate-100 shadow-[0_24px_60px_rgba(6,10,20,0.55)]',
            innerPanelBackground: 'bg-[#1a1f2a]/90 backdrop-blur-xl',
            headerGradientClass: 'bg-gradient-to-r from-[#1e293b] via-[#232c3f] to-[#1e1f29] border-b border-slate-700/70',
            headerMutedTextClass: 'text-slate-400',
            chatBoardContainerClass: 'border border-slate-800/60 bg-[#161b24]/90 shadow-[0_20px_48px_rgba(5,8,15,0.55)] backdrop-blur-xl',
            chatBarContainerClass: 'border border-slate-800/70 bg-[#161c26]/90 shadow-[0_18px_38px_rgba(5,8,15,0.45)] backdrop-blur-2xl ring-1 ring-slate-700/60',
            mobileListContainerClass: 'border border-slate-800/70 bg-[#1b202c]/90 shadow-[0_20px_40px_rgba(5,8,16,0.5)] backdrop-blur-xl',
            sidebarContainerClass: 'border border-slate-800/80 bg-[#1b202c]/90 shadow-[0_24px_48px_rgba(5,8,16,0.55)] backdrop-blur-xl ring-1 ring-slate-700/50',
            sidebarHeaderClass: 'bg-[#1f2530]/90 border-b border-slate-700/60 text-slate-100/80',
            sidebarFooterClass: 'border-t border-slate-800/70 bg-[#171c25]/90',
            debugPanelClass: 'border-t border-slate-800/70 bg-[#141923]/90 text-slate-400',
            debugLabelClass: 'text-slate-500',
            debugValueClass: 'text-slate-200',
            debugValueAccentClass: 'text-[#60a5fa]',
            mobileToggleButtonClass: 'inline-flex items-center gap-1 rounded-full border border-slate-700/70 bg-[#202733]/80 px-3 py-1.5 text-[11px] font-semibold text-slate-200 shadow-[0_8px_18px_rgba(15,19,28,0.45)] transition hover:-translate-y-[1px]',
            backgroundGlowTopLeft: 'bg-[radial-gradient(circle,#5865f233,transparent_70%)]',
            backgroundGlowTopRight: 'bg-[radial-gradient(circle,#7dd3fc22,transparent_70%)]',
            backgroundGlowBottom: 'bg-[radial-gradient(circle,#22c55e25,transparent_70%)]',
            actionButtonClassMobile: 'flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-700/70 bg-[#202733]/80 px-3 py-2 text-[11px] font-medium text-slate-100 shadow-[0_12px_26px_rgba(15,19,28,0.45)] transition-all hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60',
            actionButtonClassDesktop: 'w-full rounded-md border border-slate-700/70 bg-[#202733]/80 px-3 py-1.5 text-[11px] font-medium text-slate-100 shadow-[0_12px_26px_rgba(15,19,28,0.45)] transition-all hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-1.5',
            modalOverlayClass: 'fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4',
            shareCardClass: 'relative w-full max-w-md rounded-2xl border border-slate-800/80 bg-[#1f242f]/95 text-slate-100 shadow-[0_26px_55px_rgba(6,10,20,0.65)] p-6 backdrop-blur-xl',
            shareGlowClass: 'absolute -top-8 right-8 w-24 h-24 bg-[radial-gradient(circle,#5865f235,transparent_70%)] blur-2xl',
            shareHeadingClass: 'text-lg font-semibold text-slate-100',
            shareTextClass: 'mt-2 text-sm text-slate-400',
            shareInputClass: 'mt-4 w-full rounded-md border border-slate-700 bg-[#111720]/90 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-[#60a5fa] focus:ring-2 focus:ring-[#60a5fa]/40',
            shareButtonClass: 'rounded-md border border-slate-700/80 bg-[#202733]/85 px-3 py-2 text-slate-100 font-medium shadow-[0_10px_24px_rgba(15,19,28,0.45)] transition-transform hover:-translate-y-[1px]',
            logoutCardClass: 'relative w-full max-w-md rounded-2xl border border-red-500/40 bg-[#1f242f]/95 text-slate-100 shadow-[0_28px_58px_rgba(6,10,20,0.6)] p-6 backdrop-blur-xl',
            logoutGlowClass: 'absolute -top-10 right-8 w-28 h-28 bg-[radial-gradient(circle,#f8717130,transparent_70%)] blur-2xl',
            logoutIconWrapClass: 'w-10 h-10 rounded-full border border-red-500/40 bg-gradient-to-b from-[#2a0f12] to-[#16080a] flex items-center justify-center',
            logoutTitleClass: 'text-lg font-semibold text-slate-100',
            logoutSubtitleClass: 'text-xs text-slate-400',
            logoutInfoBoxClass: 'bg-[#171c25]/90 border border-slate-700/80 rounded-lg p-4 mb-4',
            logoutInfoTextClass: 'text-sm text-slate-200',
            logoutInfoSubTextClass: 'text-xs text-slate-400 mt-2',
            logoutCancelButtonClass: 'flex-1 rounded-md border border-slate-700/70 bg-[#202733]/85 px-3 py-2 text-sm font-medium text-slate-100 shadow-[0_10px_24px_rgba(15,19,28,0.45)] transition-transform hover:-translate-y-[1px]',
            logoutConfirmButtonClass: 'flex-1 rounded-md border border-red-500/50 bg-gradient-to-b from-[#2c0f12] to-[#150809] px-3 py-2 text-sm font-semibold text-red-300 shadow-[0_10px_24px_rgba(44,15,18,0.55)] transition-transform hover:-translate-y-[1px]'
        }

        const modernLight: LayoutClassTokens = {
            pageBackgroundClass: 'bg-gradient-to-br from-[#f0fdf4] via-[#ffffff] to-[#e0f2f1]',
            cardShellClass: 'border border-emerald-200/80 bg-white/90 backdrop-blur-2xl shadow-[0_26px_60px_rgba(15,94,78,0.16)]',
            innerPanelBackground: 'bg-white/85 backdrop-blur-xl',
            headerGradientClass: 'bg-gradient-to-r from-[#e8fff1] via-[#d8fce5] to-[#e0f2f1] border-b border-emerald-200/70',
            headerMutedTextClass: 'text-emerald-700/70',
            chatBoardContainerClass: 'border border-emerald-200/60 bg-white/90 shadow-[0_20px_45px_rgba(15,94,78,0.12)] backdrop-blur-xl',
            chatBarContainerClass: 'border border-emerald-200/60 bg-white/90 shadow-[0_18px_40px_rgba(15,94,78,0.12)] backdrop-blur-xl ring-1 ring-emerald-200/70',
            mobileListContainerClass: 'border border-emerald-200/70 bg-white/90 shadow-[0_22px_42px_rgba(15,94,78,0.16)] backdrop-blur-xl',
            sidebarContainerClass: 'border border-emerald-200/70 bg-white/90 shadow-[0_24px_48px_rgba(15,94,78,0.16)] backdrop-blur-xl ring-1 ring-emerald-200/60',
            sidebarHeaderClass: 'bg-[#eafaf1] border-b border-emerald-200 text-emerald-800',
            sidebarFooterClass: 'border-t border-emerald-200 bg-[#f0fff4]',
            debugPanelClass: 'border-t border-emerald-200 bg-white/85 text-emerald-700/70',
            debugLabelClass: 'text-emerald-500',
            debugValueClass: 'text-emerald-800',
            debugValueAccentClass: 'text-emerald-600',
            mobileToggleButtonClass: 'inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white/85 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 shadow-[0_10px_20px_rgba(15,94,78,0.12)] transition hover:-translate-y-[1px]',
            backgroundGlowTopLeft: 'bg-[radial-gradient(circle,#6ee7b733,transparent_70%)]',
            backgroundGlowTopRight: 'bg-[radial-gradient(circle,#86efac33,transparent_70%)]',
            backgroundGlowBottom: 'bg-[radial-gradient(circle,#a5f3fc30,transparent_70%)]',
            actionButtonClassMobile: 'flex w-full items-center justify-center gap-1.5 rounded-md border border-emerald-200 bg-white/85 px-3 py-2 text-[11px] font-medium text-emerald-700 shadow-[0_12px_26px_rgba(15,94,78,0.14)] transition-all hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60',
            actionButtonClassDesktop: 'w-full rounded-md border border-emerald-200 bg-white/85 px-3 py-1.5 text-[11px] font-medium text-emerald-700 shadow-[0_12px_26px_rgba(15,94,78,0.14)] transition-all hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-1.5',
            modalOverlayClass: 'fixed inset-0 bg-emerald-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4',
            shareCardClass: 'relative w-full max-w-md rounded-2xl border border-emerald-200 bg-white/90 text-emerald-900 shadow-[0_28px_60px_rgba(15,94,78,0.18)] p-6 backdrop-blur-xl',
            shareGlowClass: 'absolute -top-8 right-8 w-24 h-24 bg-[radial-gradient(circle,#6ee7b733,transparent_70%)] blur-2xl',
            shareHeadingClass: 'text-lg font-semibold text-emerald-800',
            shareTextClass: 'mt-2 text-sm text-emerald-600',
            shareInputClass: 'mt-4 w-full rounded-md border border-emerald-200 bg-white/90 px-3 py-2 text-sm text-emerald-900 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/60',
            shareButtonClass: 'rounded-md border border-emerald-200 bg-white px-3 py-2 text-emerald-700 font-medium shadow-[0_12px_22px_rgba(15,94,78,0.14)] transition-transform hover:-translate-y-[1px]',
            logoutCardClass: 'relative w-full max-w-md rounded-2xl border border-red-300/60 bg-white/90 text-emerald-900 shadow-[0_28px_60px_rgba(15,94,78,0.18)] p-6 backdrop-blur-xl',
            logoutGlowClass: 'absolute -top-10 right-8 w-28 h-28 bg-[radial-gradient(circle,#fca5a530,transparent_70%)] blur-2xl',
            logoutIconWrapClass: 'w-10 h-10 rounded-full border border-red-300/60 bg-gradient-to-b from-[#fff1f2] to-[#ffe4e6] flex items-center justify-center',
            logoutTitleClass: 'text-lg font-semibold text-emerald-900',
            logoutSubtitleClass: 'text-xs text-emerald-600',
            logoutInfoBoxClass: 'bg-[#f5fffa] border border-emerald-200 rounded-lg p-4 mb-4',
            logoutInfoTextClass: 'text-sm text-emerald-800',
            logoutInfoSubTextClass: 'text-xs text-emerald-600 mt-2',
            logoutCancelButtonClass: 'flex-1 rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-700 shadow-[0_10px_22px_rgba(15,94,78,0.12)] transition-transform hover:-translate-y-[1px]',
            logoutConfirmButtonClass: 'flex-1 rounded-md border border-red-300/60 bg-gradient-to-b from-[#fff1f2] to-[#ffe4e6] px-3 py-2 text-sm font-semibold text-red-500 shadow-[0_12px_24px_rgba(248,113,113,0.25)] transition-transform hover:-translate-y-[1px]'
        }

        if (isModern) {
            return isDark ? modernDark : modernLight
        }
        return isDark ? classicDark : classicLight
    }, [isModern, isDark])

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

    const statusStyles = useMemo<StatusStyleTokens>(() => {
        const classic: StatusStyleTokens = {
            awake: {
                dark: {
                    self: 'border border-[#1e3a7a] bg-[#12213d]',
                    other: 'border border-transparent',
                    hover: 'hover:bg-[#1b2d4b]',
                    text: 'text-[#dbeafe]',
                    subText: 'text-[#93c5fd]'
                },
                light: {
                    self: 'border border-[#c7d9ff] bg-[#f0f7ff]',
                    other: 'border border-transparent',
                    hover: 'hover:bg-[#e5f3ff]',
                    text: 'text-[#0f3fae]',
                    subText: 'text-[#6c83ca]'
                }
            },
            idle: {
                dark: {
                    self: 'border border-[#f97316] bg-[#3a2614]',
                    other: 'border border-transparent',
                    hover: 'hover:bg-[#4a2f17]',
                    text: 'text-[#facc15]',
                    subText: 'text-[#fbd38d]'
                },
                light: {
                    self: 'border border-[#ffd9b3] bg-[#fff8f0]',
                    other: 'border border-transparent',
                    hover: 'hover:bg-[#fff3e0]',
                    text: 'text-[#b87100]',
                    subText: 'text-[#cc9966]'
                }
            },
            gone: {
                dark: {
                    self: 'border border-[#334155] bg-[#111827]',
                    other: 'border border-transparent',
                    hover: 'hover:bg-[#1f2937]',
                    text: 'text-[#cbd5f5]',
                    subText: 'text-[#94a3b8]'
                },
                light: {
                    self: 'border border-gray-200 bg-gray-50',
                    other: 'border border-transparent',
                    hover: 'hover:bg-gray-50',
                    text: 'text-gray-600',
                    subText: 'text-gray-400'
                }
            }
        }

        const modern: StatusStyleTokens = {
            awake: {
                dark: {
                    self: 'border border-[#38bdf8]/60 bg-[#10254b]/80 shadow-[0_12px_24px_rgba(16,37,75,0.35)]',
                    other: 'border border-transparent bg-[#0f1f3d]/40',
                    hover: 'hover:bg-[#132c5e]/70',
                    text: 'text-[#e0eaff]',
                    subText: 'text-[#8fb5ff]'
                },
                light: {
                    self: 'border border-[#60a5fa]/60 bg-[#e2f0ff]',
                    other: 'border border-transparent bg-[#f3f8ff]/70',
                    hover: 'hover:bg-[#eef4ff]',
                    text: 'text-[#1e3a8a]',
                    subText: 'text-[#4c65aa]'
                }
            },
            idle: {
                dark: {
                    self: 'border border-[#f97316]/60 bg-[#2d1a0d]/80 shadow-[0_10px_20px_rgba(45,26,13,0.4)]',
                    other: 'border border-transparent bg-[#1f1a2f]/40',
                    hover: 'hover:bg-[#3b2413]/70',
                    text: 'text-[#fbbf24]',
                    subText: 'text-[#f59e0b]'
                },
                light: {
                    self: 'border border-[#f97316]/50 bg-[#fff1e0]',
                    other: 'border border-transparent bg-[#fff7ed]/60',
                    hover: 'hover:bg-[#fff3e0]',
                    text: 'text-[#b45309]',
                    subText: 'text-[#d97706]'
                }
            },
            gone: {
                dark: {
                    self: 'border border-[#475569]/60 bg-[#111827]/70',
                    other: 'border border-transparent bg-[#0f172a]/30',
                    hover: 'hover:bg-[#1f2937]/60',
                    text: 'text-[#94a3b8]',
                    subText: 'text-[#64748b]'
                },
                light: {
                    self: 'border border-[#cbd5f5] bg-[#f8fafc]',
                    other: 'border border-transparent bg-[#f1f5f9]',
                    hover: 'hover:bg-[#eef2f7]',
                    text: 'text-[#64748b]',
                    subText: 'text-[#94a3b8]'
                }
            }
        }

        return isModern ? modern : classic
    }, [isModern])

    const headerStatusColors = isModern
        ? { awake: '#38bdf8', idle: '#f59e0b' }
        : { awake: '#4CAF50', idle: '#FF9800' }

    // Toggle collapse state
    const toggleSection = (section: 'awake' | 'idle' | 'gone') => {
        setCollapsedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }))
    }

    // User Status Component mit Layout-Wechsel je nach Modus
    const UserStatusList = ({ isMobile = false }: { isMobile?: boolean }) => {
        const statusColorPalette = isModern
            ? { awake: '#60a5fa', idle: '#fbbf24', gone: '#94a3b8' }
            : { awake: '#4CAF50', idle: '#FF9800', gone: '#9E9E9E' }

        const emptyStateClasses = isModern
            ? {
                awake: isDark ? 'text-slate-500' : 'text-emerald-500',
                idle: isDark ? 'text-amber-400/80' : 'text-amber-600',
                gone: isDark ? 'text-slate-500' : 'text-slate-400'
            }
            : {
                awake: isDark ? 'text-[#647bb0]' : 'text-[#6c83ca]',
                idle: isDark ? 'text-[#f3c78a]' : 'text-[#cc9966]',
                gone: isDark ? 'text-[#64748b]' : 'text-gray-400'
            }

        const renderUserCard = (user: OnlineUser, status: UserStatus, faded?: boolean) => {
            const variant = statusStyles[status][isDark ? 'dark' : 'light']
            const isSelfUser = user.uid === currentUser?.uid
            const cardClass = cn(
                'flex items-center gap-3 rounded-md px-2 py-2 transition-colors',
                isSelfUser ? variant.self : variant.other,
                variant.hover,
                faded && 'opacity-60'
            )
            const iconColor = faded ? '#9E9E9E' : statusColorPalette[status]
            const initials = user.displayName?.[0]?.toUpperCase() || 'A'

            return (
                <div key={user.id} className={cardClass}>
                    {isModern ? (
                        <div className="relative">
                            <Avatar className={cn('h-8 w-8 border', isDark ? 'border-slate-800/60' : 'border-emerald-200/70')}>
                                {user.photoURL ? (
                                    <AvatarImage src={user.photoURL} alt={user.displayName} />
                                ) : (
                                    <AvatarFallback>{initials}</AvatarFallback>
                                )}
                            </Avatar>
                            <span
                                className={cn(
                                    'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2',
                                    isDark ? 'border-[#1a1f2a]' : 'border-white'
                                )}
                                style={{ backgroundColor: iconColor }}
                            />
                        </div>
                    ) : (
                        <CircleDot className="w-3 h-3" strokeWidth={4} style={{ color: iconColor }} />
                    )}
                    <div className="flex-1 min-w-0">
                        <div className={cn('font-medium truncate', variant.text)}>
                            {user.displayName}
                            {isSelfUser && ' (Du)'}
                        </div>
                        <div className={cn('text-[10px]', variant.subText)}>
                            {formatLastSeen(user.lastActivity, user.lastSeen)}
                        </div>
                    </div>
                </div>
            )
        }

        const renderSection = (
            status: UserStatus,
            icon: React.ReactNode,
            label: string,
            users: OnlineUser[],
            collapsed: boolean,
            toggle: () => void
        ) => (
            <section key={status}>
                <div
                    className="flex items-center gap-2 font-semibold mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={toggle}
                    style={{ color: statusColorPalette[status] }}
                >
                    {icon}
                    <span>
                        {label} ({users.length})
                    </span>
                    {collapsed ? (
                        <ChevronsUp className="w-3 h-3 ml-auto" strokeWidth={2} />
                    ) : (
                        <ChevronsDown className="w-3 h-3 ml-auto" strokeWidth={2} />
                    )}
                </div>
                {!collapsed && (
                    <div className="space-y-1 pl-6">
                        {users.length > 0 ? (
                            users.map(user => renderUserCard(user, status, status === 'gone'))
                        ) : (
                            <div className={cn('italic pl-2', emptyStateClasses[status])}>
                                {status === 'awake' && 'Niemand ist online...'}
                                {status === 'idle' && 'Niemand ist abwesend...'}
                                {status === 'gone' && 'Niemand ist offline...'}
                            </div>
                        )}
                    </div>
                )}
            </section>
        )

        const sections = [
            renderSection('awake', <CirclePlus className="w-5 h-5" strokeWidth={3} />, 'Online', awakeUsers, collapsedSections.awake, () => toggleSection('awake')),
            renderSection('idle', <CircleEllipsis className="w-5 h-5" strokeWidth={3} />, 'Abwesend', idleUsers, collapsedSections.idle, () => toggleSection('idle')),
            renderSection('gone', <CircleSlash className="w-5 h-5" strokeWidth={3} />, 'Offline', goneUsers, collapsedSections.gone, () => toggleSection('gone'))
        ]

        if (isModern) {
            const modernClass = cn(
                'space-y-6 text-xs',
                isDark ? 'text-slate-300' : 'text-emerald-900/80',
                isMobile ? 'px-3 py-3' : 'px-3 py-4 pr-4'
            )

            if (isMobile) {
                return <div className={modernClass}>{sections}</div>
            }

            return (
                <ScrollArea className="flex-1 h-full">
                    <div className={modernClass}>{sections}</div>
                </ScrollArea>
            )
        }

        const legacyWrapper = isDark
            ? `${isMobile ? '' : 'flex-1 overflow-y-auto'} p-3 space-y-4 text-xs text-[#cbd5f5]`
            : `${isMobile ? '' : 'flex-1 overflow-y-auto'} p-3 space-y-4 text-xs`

        return <div className={legacyWrapper}>{sections}</div>
    }

    const totalUsers = awakeUsers.length + idleUsers.length + goneUsers.length

    const LayoutShell = (isModern ? Card : 'div') as React.ElementType
    const HeaderWrapper = (isModern ? CardHeader : 'div') as React.ElementType

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
                            <HeaderWrapper className={cn('flex items-center gap-4 px-4 py-3 md:px-5', headerGradientClass, isModern ? 'border-none text-white/90' : 'text-white')}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full border border-white/40 bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg">
                                        💬
                                    </div>
                                    <div className="leading-tight">
                                        <p className={`text-xs uppercase tracking-[0.3em] ${isDark ? 'text-[#bfdbfe]' : 'text-[#cfe0ff]'}`}>Retro Room</p>
                                        <h1 className="text-lg font-semibold" style={{ fontFamily: 'Trebuchet MS, Tahoma, sans-serif' }}>
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
                                        <ChatBoard />
                                    </div>
                                    <div className={`sticky bottom-2 z-20 overflow-visible rounded-[14px] ${chatBarContainerClass} md:static md:backdrop-blur-none`}>
                                        <ChatBar />
                                    </div>

                                    {/* Mobile User List */}
                                    {showMobileUsers && (
                                        <div className="md:hidden">
                                            <div className={`rounded-[16px] ${mobileListContainerClass}`}>
                                                <div className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold ${sidebarHeaderClass}`}>
                                                    <Users className="h-5 w-5" strokeWidth={3} />
                                                    Online-Status
                                                </div>
                                                <UserStatusList isMobile={true} />
                                            </div>

                                            <div className="mt-3 grid grid-cols-1 gap-2">
                                                {isModern ? (
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={handleInvite}
                                                        className="w-full justify-center"
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
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={handleOpenSettings}
                                                        className="w-full justify-center"
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
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => setShowLogoutDialog(true)}
                                                        disabled={isLoggingOut}
                                                        className="w-full justify-center"
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
                                        <div className={`${sidebarHeaderClass} px-4 py-3 flex-shrink-0`}> 
                                            <div className="text-sm font-semibold flex items-center gap-2">
                                                <Users className="w-5 h-5" strokeWidth={3} />
                                                Online-Status
                                            </div>
                                        </div>

                                        <UserStatusList />

                                        <div className={`${sidebarFooterClass} p-3 space-y-2 text-xs flex-shrink-0`}>
                                            {isModern ? (
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={handleInvite}
                                                    className="w-full justify-center"
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
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={handleOpenSettings}
                                                    className="w-full justify-center"
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
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => setShowLogoutDialog(true)}
                                                    disabled={isLoggingOut}
                                                    className="w-full justify-center"
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
                    <DialogContent className={cn('max-w-md gap-5', shareCardClass)}>
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
                    <DialogContent className={cn('max-w-md gap-5', logoutCardClass)}>
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
