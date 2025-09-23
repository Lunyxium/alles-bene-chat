import { useState, useRef } from 'react'
import { auth, db } from '@/lib/firebase'
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { deleteUser, updateProfile } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'

interface SettingsModalProps {
    isOpen: boolean
    onClose: () => void
    currentDisplayName: string
}

export function SettingsPanel({ isOpen, onClose, currentDisplayName }: SettingsModalProps) {
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

            // Hole die FESTE Dokument-ID aus localStorage oder generiere sie
            let userDocId = localStorage.getItem('userDocId')

            if (!userDocId) {
                // Falls keine ID gespeichert, generiere eine (sollte eigentlich nicht passieren)
                const initialName = auth.currentUser.displayName ||
                    auth.currentUser.email?.split('@')[0] ||
                    'user'
                const cleanInitialName = initialName.toLowerCase()
                    .replace(/[^a-z0-9]/g, '_')
                    .replace(/_+/g, '_')
                    .substring(0, 20)
                const shortId = auth.currentUser.uid.slice(0, 8)
                userDocId = `${cleanInitialName}_${shortId}`
                localStorage.setItem('userDocId', userDocId)
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
            const userId = auth.currentUser.uid

            // Set user offline and remove from users collection
            const userRef = doc(db, 'users', userId)
            await deleteDoc(userRef)

            // Delete the Firebase Auth user
            await deleteUser(auth.currentUser)

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
                const userRef = doc(db, 'users', auth.currentUser.uid)
                await updateDoc(userRef, {
                    isOnline: false,
                    lastSeen: serverTimestamp()
                })
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
            await updateDoc(doc(db, 'support_tickets', Date.now().toString()), {
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
            className="fixed inset-0 bg-[#1a225040]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
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
            <div className="relative w-full max-w-lg rounded-2xl border border-[#7fa6f7] bg-white/95 shadow-[0_18px_40px_rgba(40,94,173,0.25)] overflow-hidden">
                <div className="absolute -top-8 right-8 w-24 h-24 bg-[radial-gradient(circle,#7fa6ff4d,transparent_70%)] blur-xl" />

                {/* Header */}
                <div className="bg-gradient-to-r from-[#0a4bdd] via-[#2a63f1] to-[#0a4bdd] px-6 py-4 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full border border-white/40 bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                ⚙️
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold" style={{ fontFamily: 'Trebuchet MS, Tahoma, sans-serif' }}>
                                    Einstellungen
                                </h3>
                                <p className="text-xs text-[#cfe0ff]">Account & Profil verwalten</p>
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
                            className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-sm transition-colors cursor-pointer"
                            type="button"
                            style={{ zIndex: 9999 }}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="bg-[#f2f6ff] border-b border-[#c7d9ff] px-6 py-3">
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
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-white border border-[#9eb8ff] text-[#0a4bdd] shadow-sm'
                                        : 'text-[#5c6fb9] hover:bg-white/60'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 max-h-96 overflow-y-auto">
                    {activeTab === 'profile' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#0a4bdd] mb-2">
                                    Anzeigename im Chat
                                </label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="w-full rounded-md border border-[#9eb8ff] bg-white/95 px-3 py-2 text-sm text-[#0a4bdd] focus:outline-none focus:border-[#0a4bdd] focus:ring-2 focus:ring-[#c4d4ff]"
                                    placeholder="Dein Nickname..."
                                />
                                <p className="mt-1 text-xs text-[#6c83ca]">
                                    Dieser Name wird anderen Usern angezeigt
                                </p>
                            </div>
                            <button
                                onClick={handleUpdateDisplayName}
                                disabled={isUpdatingName || displayName.trim() === currentDisplayName}
                                type="button"
                                className="w-full rounded-md border border-[#9eb8ff] bg-gradient-to-b from-white to-[#e6eeff] px-4 py-2 text-sm font-semibold text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isUpdatingName ? '⏳ Speichert...' : '💾 Namen speichern'}
                            </button>
                        </div>
                    )}

                    {activeTab === 'account' && (
                        <div className="space-y-4">
                            <div className="bg-[#f5f8ff] border border-[#c7d9ff] rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-[#0a4bdd] mb-2">Account-Informationen</h4>
                                <div className="text-xs text-[#5c6fb9] space-y-1">
                                    <p><strong>E-Mail:</strong> {auth.currentUser?.email || 'Anonymer Nutzer'}</p>
                                    <p><strong>Provider:</strong> {auth.currentUser?.providerData[0]?.providerId || 'anonymous'}</p>
                                    <p><strong>User ID:</strong> {auth.currentUser?.uid?.slice(0, 20)}...</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={handleLogout}
                                    type="button"
                                    className="w-full rounded-md border border-[#9eb8ff] bg-gradient-to-b from-white to-[#e6eeff] px-4 py-2 text-sm font-semibold text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-[1px]"
                                >
                                    🚪 Ausloggen
                                </button>

                                <div className="border-t border-[#c7d9ff] pt-3">
                                    <p className="text-xs text-[#dc2626] mb-2 font-medium">⚠️ Gefahrenzone</p>
                                    <button
                                        onClick={handleDeleteAccount}
                                        disabled={isDeletingAccount}
                                        type="button"
                                        className="w-full rounded-md border border-[#dc2626] bg-gradient-to-b from-[#fef2f2] to-[#fee2e2] px-4 py-2 text-sm font-semibold text-[#dc2626] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-[1px] disabled:opacity-50"
                                    >
                                        {isDeletingAccount ? '⏳ Löscht Account...' : '🗑️ Account unwiderruflich löschen'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'support' && (
                        <div className="space-y-4">
                            <div className="bg-[#f0f7ff] border border-[#b3d9ff] rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-[#0a4bdd] mb-1">💡 Brauchst du Hilfe?</h4>
                                <p className="text-xs text-[#5c6fb9]">
                                    Unser Team hilft dir gerne bei Problemen oder Fragen weiter!
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-[#0a4bdd] mb-1">
                                        E-Mail
                                    </label>
                                    <input
                                        type="email"
                                        value={supportForm.email}
                                        onChange={(e) => setSupportForm({...supportForm, email: e.target.value})}
                                        className="w-full rounded-md border border-[#9eb8ff] bg-white/95 px-3 py-2 text-sm text-[#0a4bdd] focus:outline-none focus:border-[#0a4bdd] focus:ring-2 focus:ring-[#c4d4ff]"
                                        placeholder="deine@email.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#0a4bdd] mb-1">
                                        Betreff
                                    </label>
                                    <input
                                        type="text"
                                        value={supportForm.subject}
                                        onChange={(e) => setSupportForm({...supportForm, subject: e.target.value})}
                                        className="w-full rounded-md border border-[#9eb8ff] bg-white/95 px-3 py-2 text-sm text-[#0a4bdd] focus:outline-none focus:border-[#0a4bdd] focus:ring-2 focus:ring-[#c4d4ff]"
                                        placeholder="Kurze Beschreibung des Problems..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#0a4bdd] mb-1">
                                        Nachricht
                                    </label>
                                    <textarea
                                        value={supportForm.message}
                                        onChange={(e) => setSupportForm({...supportForm, message: e.target.value})}
                                        rows={4}
                                        className="w-full rounded-md border border-[#9eb8ff] bg-white/95 px-3 py-2 text-sm text-[#0a4bdd] focus:outline-none focus:border-[#0a4bdd] focus:ring-2 focus:ring-[#c4d4ff] resize-none"
                                        placeholder="Beschreibe dein Problem oder deine Frage ausführlich..."
                                    />
                                </div>

                                <button
                                    onClick={handleSupportSubmit}
                                    disabled={isSendingSupport || !supportForm.subject.trim() || !supportForm.message.trim()}
                                    type="button"
                                    className="w-full rounded-md border border-[#9eb8ff] bg-gradient-to-b from-white to-[#e6eeff] px-4 py-2 text-sm font-semibold text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
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