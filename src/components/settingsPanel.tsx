import { useState, useRef } from 'react'
import { auth, db } from '@/lib/firebase'
import { doc, updateDoc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { deleteUser, updateProfile } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@/hooks/useTheme'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface SettingsModalProps {
    isOpen: boolean
    onClose: () => void
    currentDisplayName: string
    chatLayout: 'classic' | 'modern'
    onChatLayoutChange: (layout: 'classic' | 'modern') => void
}

export function SettingsPanel({
    isOpen,
    onClose,
    currentDisplayName,
    chatLayout,
    onChatLayoutChange
}: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'support'>('profile')
    const [displayName, setDisplayName] = useState(currentDisplayName)
    const [isUpdatingName, setIsUpdatingName] = useState(false)
    const [isDeletingAccount, setIsDeletingAccount] = useState(false)
    const [supportForm, setSupportForm] = useState({
        subject: '',
        message: '',
        email: auth.currentUser?.email || ''
    })
    const [isSendingSupport, setIsSendingSupport] = useState(false)
    const navigate = useNavigate()
    const hasAutoFocusedRef = useRef(false)
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    const overlayClass = isDark
        ? 'fixed inset-0 bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4'
        : 'fixed inset-0 bg-[#1a225040]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4'

    const containerClass = isDark
        ? 'relative w-full max-w-lg rounded-2xl border border-[#1d3a7a] bg-[#0f172a]/95 text-[#dbeafe] shadow-[0_20px_45px_rgba(8,47,73,0.55)] overflow-hidden'
        : 'relative w-full max-w-lg rounded-2xl border border-[#7fa6f7] bg-white/95 shadow-[0_18px_40px_rgba(40,94,173,0.25)] overflow-hidden'

    const accentGlowClass = isDark
        ? 'absolute -top-8 right-8 w-24 h-24 bg-[radial-gradient(circle,#1d4ed820,transparent_70%)] blur-xl'
        : 'absolute -top-8 right-8 w-24 h-24 bg-[radial-gradient(circle,#7fa6ff4d,transparent_70%)] blur-xl'

    const headerGradientClass = isDark
        ? 'bg-gradient-to-r from-[#1d4ed8] via-[#1e3a8a] to-[#1d4ed8]'
        : 'bg-gradient-to-r from-[#0a4bdd] via-[#2a63f1] to-[#0a4bdd]'

    const headerSubtitleClass = isDark ? 'text-[#9fb7dd]' : 'text-[#cfe0ff]'

    const closeButtonClass = isDark
        ? 'w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[#dbeafe] text-sm transition-colors cursor-pointer'
        : 'w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-sm transition-colors cursor-pointer'

    const tabBarClass = isDark
        ? 'bg-[#111c34] border-b border-[#1d3a7a]'
        : 'bg-[#f2f6ff] border-b border-[#c7d9ff]'

    const getTabButtonClass = (tabId: string) => {
        if (activeTab === tabId) {
            return isDark
                ? 'px-3 py-1.5 rounded-md text-xs font-medium transition-all bg-[#0f172a] border border-[#1d3a7a] text-[#bfdbfe] shadow-sm'
                : 'px-3 py-1.5 rounded-md text-xs font-medium transition-all bg-white border border-[#9eb8ff] text-[#0a4bdd] shadow-sm'
        }
        return isDark
            ? 'px-3 py-1.5 rounded-md text-xs font-medium transition-all text-[#7d90c5] hover:bg-[#162347]'
            : 'px-3 py-1.5 rounded-md text-xs font-medium transition-all text-[#5c6fb9] hover:bg-white/60'
    }

    const contentWrapperClass = isDark
        ? 'p-6 max-h-96 overflow-y-auto text-[#dbeafe]'
        : 'p-6 max-h-96 overflow-y-auto'

    const labelClass = isDark ? 'block text-sm font-medium text-[#bfdbfe] mb-2' : 'block text-sm font-medium text-[#0a4bdd] mb-2'
    const helperTextClass = isDark ? 'mt-1 text-xs text-[#7aa2f5]' : 'mt-1 text-xs text-[#6c83ca]'

    const inputBaseClass = isDark
        ? 'w-full rounded-md border border-[#1d3a7a] bg-[#0b1225] px-3 py-2 text-sm text-[#bfdbfe] focus:outline-none focus:border-[#60a5fa] focus:ring-2 focus:ring-[#1d4ed8]'
        : 'w-full rounded-md border border-[#9eb8ff] bg-white/95 px-3 py-2 text-sm text-[#0a4bdd] focus:outline-none focus:border-[#0a4bdd] focus:ring-2 focus:ring-[#c4d4ff]'

    const primaryButtonClass = isDark
        ? 'w-full rounded-md border border-[#1d4ed8] bg-gradient-to-b from-[#1d4ed8] to-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-transform hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed'
        : 'w-full rounded-md border border-[#9eb8ff] bg-gradient-to-b from-white to-[#e6eeff] px-4 py-2 text-sm font-semibold text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed'

    const dangerButtonClass = isDark
        ? 'w-full rounded-md border border-[#b91c1c] bg-gradient-to-b from-[#451a1a] to-[#2d0f0f] px-4 py-2 text-sm font-semibold text-[#fca5a5] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-transform hover:-translate-y-[1px] disabled:opacity-50'
        : 'w-full rounded-md border border-[#dc2626] bg-gradient-to-b from-[#fef2f2] to-[#fee2e2] px-4 py-2 text-sm font-semibold text-[#dc2626] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-[1px] disabled:opacity-50'

    const infoCardClass = isDark
        ? 'bg-[#101a32] border border-[#1d3a7a] rounded-lg p-4'
        : 'bg-[#f5f8ff] border border-[#c7d9ff] rounded-lg p-4'

    const infoCardPrimaryTextClass = isDark ? 'text-sm font-semibold text-[#bfdbfe] mb-2' : 'text-sm font-semibold text-[#0a4bdd] mb-2'
    const infoCardSecondaryTextClass = isDark ? 'text-xs text-[#93c5fd] space-y-1' : 'text-xs text-[#5c6fb9] space-y-1'

    const supportIntroCardClass = isDark
        ? 'bg-[#101a32] border border-[#1d3a7a] rounded-lg p-4'
        : 'bg-[#f0f7ff] border border-[#b3d9ff] rounded-lg p-4'

    const supportIntroTitleClass = isDark ? 'text-sm font-semibold text-[#bfdbfe] mb-1' : 'text-sm font-semibold text-[#0a4bdd] mb-1'
    const supportIntroTextClass = isDark ? 'text-xs text-[#93c5fd]' : 'text-xs text-[#5c6fb9]'

    const supportDividerClass = isDark ? 'border-t border-[#1d3a7a] pt-3' : 'border-t border-[#c7d9ff] pt-3'

    const layoutCardClass = isDark
        ? 'rounded-lg border border-[#1d3a7a] bg-[#101a32]/90 p-4 shadow-[0_10px_24px_rgba(8,47,73,0.35)] backdrop-blur-sm'
        : 'rounded-lg border border-[#b3c7ff] bg-[#f2f6ff] p-4 shadow-[0_12px_28px_rgba(40,94,173,0.18)] backdrop-blur-sm'

    const layoutOptionBaseClass = isDark
        ? 'flex gap-3 rounded-md border border-[#1d3a7a] bg-[#0b1225]/75 px-3 py-2 text-left transition-all hover:bg-[#14203d]/90 focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/40'
        : 'flex gap-3 rounded-md border border-[#b7ccff] bg-white/80 px-3 py-2 text-left transition-all hover:bg-[#e6eeff] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30'

    const layoutOptionActiveClass = isDark
        ? 'border-[#38bdf8] bg-[#111f3a] shadow-[0_12px_24px_rgba(14,116,144,0.35)]'
        : 'border-[#2563eb] bg-white shadow-[0_14px_32px_rgba(37,99,235,0.18)]'

    const layoutOptionTitleClass = isDark
        ? 'text-sm font-semibold text-[#dbeafe]'
        : 'text-sm font-semibold text-[#0a3fb0]'

    const layoutOptionDescriptionClass = isDark
        ? 'text-[11px] leading-relaxed text-[#8da3d7]'
        : 'text-[11px] leading-relaxed text-[#5d73c4]'

    const layoutHeadingTitleClass = isDark
        ? 'text-base font-semibold text-[#dbeafe]'
        : 'text-base font-semibold text-[#0a3fb0]'

    const layoutHeadingSubtitleClass = isDark
        ? 'text-[12px] text-[#8da3d7]'
        : 'text-[12px] text-[#5d73c4]'

    const layoutOptionBadgeClass = isDark
        ? 'inline-flex items-center rounded-full border border-[#38bdf8]/60 bg-[#1d4ed810] px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-[#38bdf8]'
        : 'inline-flex items-center rounded-full border border-[#2563eb]/50 bg-[#e0ecff] px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-[#1d4ed8]'

    const layoutIndicatorBaseClass = isDark
        ? 'mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full border border-[#1d3a7a] transition-colors'
        : 'mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full border border-[#b7ccff] transition-colors'

    const layoutIndicatorActiveClass = isDark ? 'border-[#38bdf8] bg-[#38bdf8]' : 'border-[#2563eb] bg-[#2563eb]'

    const resolveUserDocId = () => {
        if (typeof window === 'undefined') {
            return null
        }

        const browserWindow = window as typeof window & { __userDocId?: string }
        const storedId = browserWindow.__userDocId || localStorage.getItem('userDocId')

        if (storedId) {
            browserWindow.__userDocId = storedId
            return storedId
        }

        const current = auth.currentUser
        if (!current) {
            return null
        }

        const initialName = current.displayName ||
            current.email?.split('@')[0] ||
            'user'

        const cleanInitialName = initialName.toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .substring(0, 20)

        const shortId = current.uid.slice(0, 8)
        const fixedDocId = `${cleanInitialName}_${shortId}`

        browserWindow.__userDocId = fixedDocId
        localStorage.setItem('userDocId', fixedDocId)

        return fixedDocId
    }

    if (!isOpen) return null

    const resetForm = () => {
        setActiveTab('profile')
        setDisplayName(currentDisplayName)
        setIsUpdatingName(false)
        setIsDeletingAccount(false)
        setIsSendingSupport(false)
        setSupportForm({
            subject: '',
            message: '',
            email: auth.currentUser?.email || ''
        })
        // Reset für nächstes Öffnen
        hasAutoFocusedRef.current = false
    }

    const handleClose = () => {
        resetForm()
        onClose()
    }

    const handleUpdateDisplayName = async () => {
        if (!auth.currentUser || !displayName.trim()) return

        setIsUpdatingName(true)
        try {
            // Update Firebase Auth profile
            await updateProfile(auth.currentUser, {
                displayName: displayName.trim()
            })

            const userDocId = resolveUserDocId()
            if (!userDocId) {
                throw new Error('Konnte Benutzer-Dokument nicht ermitteln')
            }

            // Update das EXISTIERENDE Dokument mit der festen ID
            const userRef = doc(db, 'users', userDocId)
            await updateDoc(userRef, {
                displayName: displayName.trim(),
                updatedAt: serverTimestamp()
            })

            alert('✅ Anzeigename wurde erfolgreich geändert!')
        } catch (error) {
            console.error('Error updating display name:', error)
            alert('❌ Fehler beim Ändern des Anzeigenamens. Bitte versuche es erneut.')
        } finally {
            setIsUpdatingName(false)
        }
    }

    const handleDeleteAccount = async () => {
        if (!auth.currentUser) return

        const confirmation = window.confirm(
            '⚠️ ACHTUNG: Account unwiderruflich löschen?\n\n' +
            'Diese Aktion kann nicht rückgängig gemacht werden. Alle deine Daten werden permanent gelöscht.\n\n' +
            'Klicke "OK" um fortzufahren oder "Abbrechen" um abzubrechen.'
        )

        if (!confirmation) return

        const finalConfirmation = window.confirm(
            '🔴 LETZTE WARNUNG!\n\n' +
            'Bist du dir absolut sicher, dass du deinen Account löschen möchtest?\n\n' +
            'Dies ist die letzte Chance zum Abbrechen!'
        )

        if (!finalConfirmation) return

        setIsDeletingAccount(true)
        try {
            const userDocId = resolveUserDocId()
            const legacyDocId = auth.currentUser.uid

            if (userDocId) {
                const userRef = doc(db, 'users', userDocId)
                await deleteDoc(userRef)
            }

            if (legacyDocId && legacyDocId !== userDocId) {
                await deleteDoc(doc(db, 'users', legacyDocId)).catch(() => undefined)
            }

            // Delete the Firebase Auth user
            await deleteUser(auth.currentUser)

            if (typeof window !== 'undefined') {
                localStorage.removeItem('userDocId')
                const browserWindow = window as typeof window & { __userDocId?: string }
                delete browserWindow.__userDocId
            }

            alert('Account wurde erfolgreich gelöscht. Auf Wiedersehen! 👋')
            navigate('/login')
        } catch (error) {
            console.error('Error deleting account:', error)
            alert('❌ Fehler beim Löschen des Accounts. Bitte versuche es erneut oder kontaktiere den Support.')
            setIsDeletingAccount(false)
        }
    }

    const handleLogout = async () => {
        const confirmLogout = window.confirm(
            'Möchtest du dich wirklich ausloggen?\n\n' +
            'Klicke "OK" zum Ausloggen oder "Abbrechen" um eingeloggt zu bleiben.'
        )

        if (!confirmLogout) return

        try {
            // Set user offline
            if (auth.currentUser) {
                const userDocId = resolveUserDocId()
                if (userDocId) {
                    await updateDoc(doc(db, 'users', userDocId), {
                        isOnline: false,
                        status: 'gone',
                        lastSeen: serverTimestamp()
                    })
                }
            }

            await auth.signOut()
            navigate('/login')
        } catch (error) {
            console.error('Logout error:', error)
            alert('❌ Fehler beim Ausloggen. Bitte versuche es erneut.')
        }
    }

    const handleSupportSubmit = async () => {
        if (!supportForm.subject.trim() || !supportForm.message.trim()) {
            alert('Bitte fülle alle Felder aus.')
            return
        }

        setIsSendingSupport(true)
        try {
            // In einer echten App würdest du hier eine E-Mail senden oder ein Ticket erstellen
            // Für dieses Demo speichern wir es in Firestore
            const ticketRef = doc(db, 'support_tickets', Date.now().toString())
            await setDoc(ticketRef, {
                userId: auth.currentUser?.uid || 'anonymous',
                email: supportForm.email,
                subject: supportForm.subject,
                message: supportForm.message,
                createdAt: serverTimestamp(),
                status: 'open'
            })

            alert('✅ Support-Anfrage wurde erfolgreich gesendet! Wir melden uns bald bei dir.')
            setSupportForm({ subject: '', message: '', email: auth.currentUser?.email || '' })
        } catch (error) {
            console.error('Error sending support request:', error)
            alert('❌ Fehler beim Senden der Support-Anfrage. Bitte versuche es erneut.')
        } finally {
            setIsSendingSupport(false)
        }
    }

    return (
        <div
            className={overlayClass}
            onClick={(e) => {
                e.stopPropagation()
                if (e.target === e.currentTarget) {
                    handleClose()
                }
            }}
            onKeyDown={(e) => {
                if (e.key === 'Escape') {
                    e.preventDefault()
                    handleClose()
                }
            }}
            ref={(el) => {
                // Auto-focus NUR beim allerersten Render
                if (el && !hasAutoFocusedRef.current) {
                    setTimeout(() => {
                        el.focus()
                        hasAutoFocusedRef.current = true
                    }, 50)
                }
            }}
            tabIndex={0}
            style={{ outline: 'none' }}
        >
            <div className={containerClass}>
                <div className={accentGlowClass} />

                {/* Header */}
                <div className={`${headerGradientClass} px-6 py-4 text-white`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full border border-white/40 bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                ⚙️
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold" style={{ fontFamily: 'Trebuchet MS, Tahoma, sans-serif' }}>
                                    Einstellungen
                                </h3>
                                <p className={`text-xs ${headerSubtitleClass}`}>Account & Profil verwalten</p>
                            </div>
                        </div>
                        <button
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleClose()
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    e.preventDefault()
                                    handleClose()
                                }
                            }}
                            onMouseDown={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                            }}
                            className={closeButtonClass}
                            type="button"
                            style={{ zIndex: 9999 }}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className={`${tabBarClass} px-6 py-3`}>
                    <div className="flex gap-1">
                        {[
                            { id: 'profile', label: '👤 Profil', icon: '👤' },
                            { id: 'account', label: '🔧 Account', icon: '🔧' },
                            { id: 'support', label: '💬 Support', icon: '💬' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setActiveTab(tab.id as any)
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                        e.preventDefault()
                                        handleClose()
                                    }
                                }}
                                type="button"
                                className={getTabButtonClass(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className={contentWrapperClass}>
                    {activeTab === 'profile' && (
                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>
                                    Anzeigename im Chat
                                </label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className={inputBaseClass}
                                    placeholder="Dein Nickname..."
                                />
                                <p className={helperTextClass}>
                                    Dieser Name wird anderen Usern angezeigt
                                </p>
                            </div>
                            <button
                                onClick={handleUpdateDisplayName}
                                disabled={isUpdatingName || displayName.trim() === currentDisplayName}
                                type="button"
                                className={primaryButtonClass}
                            >
                                {isUpdatingName ? '⏳ Speichert...' : '💾 Namen speichern'}
                            </button>

                            <div className={layoutCardClass}>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                    <div>
                                        <h4 className={layoutHeadingTitleClass}>Layout Theme</h4>
                                        <p className={layoutHeadingSubtitleClass}>
                                            Wähle zwischen dem klassischen Layout und der neuen modernen Variante.
                                        </p>
                                    </div>
                                    <Badge variant="secondary" className={layoutOptionBadgeClass}>
                                        Nur Chat
                                    </Badge>
                                </div>

                                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {[
                                        {
                                            id: 'classic' as const,
                                            title: 'Classic',
                                            description: 'Retro MSN Messenger-Optik mit kräftigen Farben und nostalgischem Charme.'
                                        },
                                        {
                                            id: 'modern' as const,
                                            title: 'Modern',
                                            description: 'Ultra-modernes Glassmorphismus-Design mit Floating-Effekten und Micro-Animations.'
                                        }
                                    ].map((option) => {
                                        const isActive = chatLayout === option.id
                                        return (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() => onChatLayoutChange(option.id)}
                                                className={`${layoutOptionBaseClass} ${isActive ? layoutOptionActiveClass : ''}`.trim()}
                                            >
                                                <span
                                                    className={`${layoutIndicatorBaseClass} ${isActive ? layoutIndicatorActiveClass : ''}`.trim()}
                                                />
                                                <span className="flex flex-col">
                                                    <span className={layoutOptionTitleClass}>{option.title}</span>
                                                    <span className={layoutOptionDescriptionClass}>{option.description}</span>
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'account' && (
                        <div className="space-y-4">
                            <div className={infoCardClass}>
                                <h4 className={infoCardPrimaryTextClass}>Account-Informationen</h4>
                                <div className={infoCardSecondaryTextClass}>
                                    <p><strong>E-Mail:</strong> {auth.currentUser?.email || 'Anonymer Nutzer'}</p>
                                    <p><strong>Provider:</strong> {auth.currentUser?.providerData[0]?.providerId || 'anonymous'}</p>
                                    <p><strong>User ID:</strong> {auth.currentUser?.uid?.slice(0, 20)}...</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={handleLogout}
                                    type="button"
                                    className={primaryButtonClass}
                                >
                                    🚪 Ausloggen
                                </button>

                                <div className={supportDividerClass}>
                                    <p className={`text-xs mb-2 font-medium ${isDark ? 'text-[#fca5a5]' : 'text-[#dc2626]'}`}>⚠️ Gefahrenzone</p>
                                    <button
                                        onClick={handleDeleteAccount}
                                        disabled={isDeletingAccount}
                                        type="button"
                                        className={dangerButtonClass}
                                    >
                                        {isDeletingAccount ? '⏳ Löscht Account...' : '🗑️ Account unwiderruflich löschen'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'support' && (
                        <div className="space-y-4">
                            <div className={supportIntroCardClass}>
                                <h4 className={supportIntroTitleClass}>💡 Brauchst du Hilfe?</h4>
                                <p className={supportIntroTextClass}>
                                    Unser Team hilft dir gerne bei Problemen oder Fragen weiter!
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className={labelClass.replace('mb-2', 'mb-1')}>
                                        E-Mail
                                    </label>
                                    <input
                                        type="email"
                                        value={supportForm.email}
                                        onChange={(e) => setSupportForm({...supportForm, email: e.target.value})}
                                        className={inputBaseClass}
                                        placeholder="deine@email.com"
                                    />
                                </div>

                                <div>
                                    <label className={labelClass.replace('mb-2', 'mb-1')}>
                                        Betreff
                                    </label>
                                    <input
                                        type="text"
                                        value={supportForm.subject}
                                        onChange={(e) => setSupportForm({...supportForm, subject: e.target.value})}
                                        className={inputBaseClass}
                                        placeholder="Kurze Beschreibung des Problems..."
                                    />
                                </div>

                                <div>
                                    <label className={labelClass.replace('mb-2', 'mb-1')}>
                                        Nachricht
                                    </label>
                                    <textarea
                                        value={supportForm.message}
                                        onChange={(e) => setSupportForm({...supportForm, message: e.target.value})}
                                        rows={4}
                                        className={`${inputBaseClass} resize-none`}
                                        placeholder="Beschreibe dein Problem oder deine Frage ausführlich..."
                                    />
                                </div>

                                <button
                                    onClick={handleSupportSubmit}
                                    disabled={isSendingSupport || !supportForm.subject.trim() || !supportForm.message.trim()}
                                    type="button"
                                    className={primaryButtonClass}
                                >
                                    {isSendingSupport ? '⏳ Wird gesendet...' : '📧 Support kontaktieren'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
