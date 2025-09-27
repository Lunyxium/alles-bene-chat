import { collection, orderBy, query, onSnapshot, Timestamp, where } from 'firebase/firestore'
import { useEffect, useState, useRef } from 'react'
import { db, auth } from '@/lib/firebase'
import { ChatBubble } from './chatBubble'
import { BellRing, BellOff } from 'lucide-react'

interface Message {
    id: string
    text: string
    userId: string
    nickname: string
    createdAt: Timestamp | null
    type?: 'message' | 'nudge' | 'system' | 'wakeup'
}

export function ChatBoard() {
    const [messages, setMessages] = useState<Message[]>([])
    const [soundsMuted, setSoundsMuted] = useState(() => {
        return localStorage.getItem('soundsMuted') === 'true'
    })
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const chatContainerRef = useRef<HTMLDivElement>(null)

    const toggleSounds = () => {
        const newMutedState = !soundsMuted
        setSoundsMuted(newMutedState)
        localStorage.setItem('soundsMuted', String(newMutedState))
    }

    useEffect(() => {
        // Calculate 72 hours ago
        const now = new Date()
        const seventyTwoHoursAgo = new Date(now.getTime() - (72 * 60 * 60 * 1000))
        const cutoffTimestamp = Timestamp.fromDate(seventyTwoHoursAgo)

        // Query for messages from the last 72 hours
        const q = query(
            collection(db, 'rooms', 'global', 'messages'),
            where('createdAt', '>=', cutoffTimestamp),
            orderBy('createdAt', 'desc')
        )

        const unsubscribe = onSnapshot(q, (snap) => {
            const newMessages = snap.docs
                .map(d => ({
                    id: d.id,
                    ...d.data()
                } as Message))
                .reverse() // Reverse to show oldest first

            setMessages(newMessages)

            // Auto-scroll to bottom for new messages
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 100)
        })

        // Welcome message (only visual, not stored in DB)
        if (auth.currentUser) {
            const userName = auth.currentUser.displayName ||
                auth.currentUser.email?.split('@')[0] ||
                'Gast'

            setMessages(prev => [...prev, {
                id: 'welcome-' + Date.now(),
                text: `${userName} ist dem Chat beigetreten! 🎉`,
                userId: 'system',
                nickname: 'System',
                createdAt: null,
                type: 'system'
            }])
        }

        return () => unsubscribe()
    }, [])

    return (
        <div
            data-chat-window
            className="flex h-[460px] flex-col overflow-hidden bg-gradient-to-b from-[#f7faff] to-[#eef3ff]"
        >
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-[#eaf1ff] via-[#dfe9ff] to-[#eaf1ff] px-4 py-3 border-b border-[#c7d9ff] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border border-[#9eb8ff] bg-white/80 flex items-center justify-center text-[#0a4bdd] text-sm">
                        💬
                    </div>
                    <div className="leading-tight">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-[#6c83ca]">Chat-Verlauf</p>
                        <span className="text-sm font-semibold text-[#0a4bdd]" style={{ fontFamily: 'Trebuchet MS, Tahoma, sans-serif' }}>
                            Globaler Nostalgie-Channel
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#5b6ea5]">
                    <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 bg-[#7FBA00] rounded-full" />
                        Live
                    </span>
                    <span className="h-4 w-px bg-[#c7d9ff]" />
                    <span>Messagecounter past 72h: {messages.filter(m => m.type !== 'system').length}</span>
                </div>
            </div>

            {/* Messages Area */}
            <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto px-5 py-4 space-y-2"
                style={{
                    backgroundImage: 'linear-gradient(135deg, rgba(122,150,223,0.06) 25%, transparent 25%, transparent 50%, rgba(122,150,223,0.06) 50%, rgba(122,150,223,0.06) 75%, transparent 75%, transparent)',
                    backgroundSize: '40px 40px'
                }}
            >
                {messages.length === 0 ? (
                    <div className="text-center text-[#4b5f9b] text-sm mt-10">
                        <div className="mb-3 text-xl">🔭</div>
                        <div className="font-semibold">Noch keine Nachrichten in den letzten 72 Stunden.</div>
                        <div className="text-xs mt-1 text-[#6c83ca]">Sei der Erste und sage Hallo! 👋</div>
                    </div>
                ) : (
                    messages.map(msg => <ChatBubble key={msg.id} msg={msg} />)
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Typing Indicator / Status with Sound Toggle */}
            <div className="px-4 py-2 bg-gradient-to-r from-[#eaf1ff] to-[#dfe9ff] border-t border-[#c7d9ff] text-[11px] text-[#5b6ea5] flex items-center justify-between">
                <span>Tippe eine Nachricht oder sende ein Wake up! ⚡</span>
                <button
                    onClick={toggleSounds}
                    className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/30 transition-colors"
                    title={soundsMuted ? "Sounds aktivieren" : "Sounds stummschalten"}
                >
                    {soundsMuted ? (
                        <>
                            <BellOff className="w-3 h-3" strokeWidth={2} />
                            <span className="text-[10px]">Stumm</span>
                        </>
                    ) : (
                        <>
                            <BellRing className="w-3 h-3" strokeWidth={2} />
                            <span className="text-[10px]">Sounds an</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}