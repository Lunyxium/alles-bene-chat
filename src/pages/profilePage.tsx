import { useState, useEffect } from 'react'
import { useAuth } from '@/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useNavigate } from 'react-router-dom'

export function ProfilePage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [displayName, setDisplayName] = useState('')
    const [bio, setBio] = useState('')
    const [saving, setSaving] = useState(false)

    const resolveUserDocId = () => {
        if (!user) {
            return null
        }

        if (typeof window !== 'undefined') {
            const browserWindow = window as typeof window & { __userDocId?: string }
            const storedId = browserWindow.__userDocId || localStorage.getItem('userDocId')

            if (storedId) {
                browserWindow.__userDocId = storedId
                return storedId
            }
        }

        const initialName = user.displayName || user.email?.split('@')[0] || 'user'
        const cleanInitialName = initialName.toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .substring(0, 20)
        const shortId = user.uid.slice(0, 8)
        const fixedDocId = `${cleanInitialName}_${shortId}`

        if (typeof window !== 'undefined') {
            const browserWindow = window as typeof window & { __userDocId?: string }
            browserWindow.__userDocId = fixedDocId
            localStorage.setItem('userDocId', fixedDocId)
        }

        return fixedDocId
    }

    useEffect(() => {
        if (!user) return

        // Load user profile
        const loadProfile = async () => {
            const userDocId = resolveUserDocId()
            if (!userDocId) {
                return
            }

            const userDoc = await getDoc(doc(db, 'users', userDocId))
            if (userDoc.exists()) {
                const data = userDoc.data()
                setDisplayName(data.displayName || '')
                setBio(data.bio || '')
            } else {
                setDisplayName(user.displayName || user.email?.split('@')[0] || '')
            }
        }

        loadProfile()
    }, [user])

    const handleSave = async () => {
        if (!user) return

        setSaving(true)
        try {
            const userDocId = resolveUserDocId()
            if (!userDocId) {
                throw new Error('Benutzer-Dokument konnte nicht bestimmt werden')
            }

            await setDoc(doc(db, 'users', userDocId), {
                displayName,
                bio,
                email: user.email,
                updatedAt: new Date()
            }, { merge: true })

            alert('Profil wurde gespeichert! ✅')
        } catch (error) {
            console.error('Error saving profile:', error)
            alert('Fehler beim Speichern des Profils')
        } finally {
            setSaving(false)
        }
    }

    if (!user) {
        return (
            <div className="p-6">
                <p>Bitte melde dich an, um dein Profil zu sehen.</p>
            </div>
        )
    }

    return (
        <section className="min-h-screen bg-gradient-to-b from-[#5c7cfa] to-[#3864f4] p-4">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-lg shadow-xl p-6">
                    <h1 className="text-2xl font-bold text-[#0054E3] mb-6">Mein Profil</h1>

                    <div className="space-y-4">
                        {/* Email (read-only) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                E-Mail
                            </label>
                            <input
                                type="email"
                                value={user.email || 'Anonymer Nutzer'}
                                disabled
                                className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50"
                            />
                        </div>

                        {/* Display Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Anzeigename
                            </label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Dein Nickname im Chat"
                                className="w-full px-3 py-2 border border-[#7A96DF] rounded focus:outline-none focus:border-[#0054E3]"
                            />
                        </div>

                        {/* Bio */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Über mich
                            </label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Erzähle etwas über dich..."
                                rows={4}
                                className="w-full px-3 py-2 border border-[#7A96DF] rounded focus:outline-none focus:border-[#0054E3]"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 px-4 py-2 bg-gradient-to-b from-[#0054E3] to-[#0046C7] text-white rounded hover:from-[#0046C7] hover:to-[#003C74] transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Speichert...' : 'Speichern'}
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className="flex-1 px-4 py-2 bg-gradient-to-b from-white to-[#ECE9D8] border border-[#003C74] rounded hover:from-[#E5F3FF] hover:to-[#C3E0FF] transition-colors"
                            >
                                Zurück zum Chat
                            </button>
                        </div>
                    </div>

                    {/* User Info */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                            User ID: {user.uid}<br/>
                            Provider: {user.providerData[0]?.providerId || 'anonymous'}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}
