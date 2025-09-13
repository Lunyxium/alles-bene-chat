import { collection, limit, orderBy, query, onSnapshot, Timestamp } from 'firebase/firestore'
import { useEffect, useState, useRef } from 'react'
import { db, auth } from '@/lib/firebase'
import { ChatBubble } from './chatBubble'

interface Message {
    id: string
    text: string
    userId: string
    nickname: string
    createdAt: Timestamp | null
    type?: 'message' | 'nudge' | 'system'
}

export function ChatBoard() {
    const [messages, setMessages] = useState<Message[]>([])
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const chatContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const q = query(
            collection(db, 'rooms', 'global', 'messages'),
            orderBy('createdAt', 'desc'),
            limit(100)
        )

        const unsubscribe = onSnapshot(q, (snap) => {
            const newMessages = snap.docs
                .map(d => ({
                    id: d.id,
                    ...d.data()
                } as Message))
                .reverse()

            setMessages(newMessages)

            // Auto-scroll to bottom for new messages
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 100)
        })

        // Welcome message
        if (auth.currentUser) {
            const userName = auth.currentUser.displayName ||
                auth.currentUser.email?.split('@')[0] ||
                'Gast'

            // System welcome message (only visual, not stored in DB)
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
        <div className="bg-white border border-[#7A96DF] rounded overflow-hidden h-[450px] flex flex-col">
            {/* Chat Header */}
            <div className="bg-gradient-to-b from-[#F5F5F5] to-[#E8E8E8] px-3 py-1 border-b border-[#7A96DF]">
                <span className="text-xs text-[#0054E3] font-semibold">Chat-Verlauf</span>
            </div>

            {/* Messages Area */}
            <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-3 space-y-2 bg-white"
                style={{
                    backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(122, 150, 223, 0.05) 25%, rgba(122, 150, 223, 0.05) 26%, transparent 27%, transparent 74%, rgba(122, 150, 223, 0.05) 75%, rgba(122, 150, 223, 0.05) 76%, transparent 77%, transparent)',
                    backgroundSize: '50px 50px'
                }}
            >
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm mt-8">
                        <div className="mb-2">📭</div>
                        <div>Noch keine Nachrichten vorhanden.</div>
                        <div className="text-xs mt-1">Sei der Erste und sage Hallo! 👋</div>
                    </div>
                ) : (
                    messages.map(msg => <ChatBubble key={msg.id} msg={msg} />)
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Typing Indicator (optional) */}
            <div className="px-3 py-1 border-t border-gray-100 bg-gray-50 min-h-[20px]">
                {/* Could add typing indicator here */}
            </div>
        </div>
    )
}