import { auth } from '@/lib/firebase'

interface Message {
    id: string
    text: string
    userId?: string
    nickname?: string
    createdAt?: any
    type?: 'message' | 'nudge' | 'system'
}

export function ChatBubble({ msg }: { msg: Message }) {
    const isOwnMessage = auth.currentUser?.uid === msg.userId
    const timestamp = msg.createdAt?.toDate?.() || new Date()
    const timeString = timestamp.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
    })

    // System messages
    if (msg.type === 'system') {
        return (
            <div className="text-center py-2">
                <span className="inline-block px-3 py-1 bg-[#E8F5E9] rounded-full text-xs text-[#4CAF50] font-semibold">
                    *** {msg.text} ***
                </span>
            </div>
        )
    }

    // Nudge messages
    if (msg.type === 'nudge') {
        return (
            <div className="text-center py-2 animate-pulse">
                <span className="inline-block px-3 py-1 bg-[#FFF3E0] rounded-full text-xs text-[#FF6B00] font-bold">
                    🔔 {msg.nickname} {msg.text}
                </span>
            </div>
        )
    }

    // Regular messages - MSN Style
    return (
        <div className={`my-1 text-sm flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                <div className="flex items-baseline gap-1 mb-0.5">
                    <span className="text-[10px] text-gray-500">[{timeString}]</span>
                    <span className={`text-xs font-bold ${
                        isOwnMessage ? 'text-[#DC2626]' : 'text-[#0054E3]'
                    }`}>
                        {msg.nickname || 'Anonym'}:
                    </span>
                </div>
                <div className={`inline-block px-3 py-1.5 rounded-lg ${
                    isOwnMessage
                        ? 'bg-gradient-to-br from-[#E3F2FD] to-[#BBDEFB] text-black'
                        : 'bg-white border border-[#D1D5DB] text-black'
                }`}>
                    <span className="text-sm break-words">{msg.text}</span>
                </div>
            </div>
        </div>
    )
}