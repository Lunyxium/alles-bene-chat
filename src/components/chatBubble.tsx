import { auth } from '@/lib/firebase'
import { useEffect, useRef } from 'react'
import { Howl } from 'howler'
import receivedSound from '@/sounds/received.mp3'
import wakeupSound from '@/sounds/wakeup.mp3'

// Initialize Howler sounds
const sounds = {
    received: new Howl({
        src: [receivedSound],
        volume: 0.3
    }),
    wakeup: new Howl({
        src: [wakeupSound],
        volume: 0.3
    })
}

interface Message {
    id: string
    text: string
    userId?: string
    nickname?: string
    createdAt?: any
    type?: 'message' | 'nudge' | 'system' | 'wakeup'
}

// Track which messages already played sounds
const playedMessages = new Set<string>()

// Rich-Text Parser with BIGGER Emojis and GIF support + FIXED ITALIC
function parseRichText(text: string): React.ReactNode {
    // Escape HTML first
    const escapeHtml = (str: string) => {
        const div = document.createElement('div')
        div.textContent = str
        return div.innerHTML
    }

    let formatted = escapeHtml(text)

    // Parse GIF URLs FIRST (before other formatting)
    formatted = formatted.replace(
        /(https?:\/\/[^\s]+\.gif(?:\?[^\s]*)?|https?:\/\/(?:tenor\.com|media\.tenor\.com|media\.giphy\.com|i\.giphy\.com)[^\s]+)/gi,
        '<img src="$1" alt="GIF" style="max-width: 300px; max-height: 300px; border-radius: 8px; display: block; margin: 8px 0;" />'
    )

    // Parse in order of precedence
    // Code blocks first (to prevent other formatting inside)
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-[#0a4bdd]">$1</code>')

    // Bold (must come before italic to handle **text* correctly)
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

    // FIXED: Italic - support both * and _ syntax
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>')

    // Strikethrough
    formatted = formatted.replace(/~~([^~]+)~~/g, '<span style="text-decoration: line-through">$1</span>')

    // Quotes (only at line start)
    formatted = formatted.replace(/^&gt; (.+)$/gm, '<div class="border-l-2 border-gray-400 pl-2 my-1">$1</div>')

    // Lists (only at line start)
    formatted = formatted.replace(/^- (.+)$/gm, '<div class="pl-4">• $1</div>')

    // Make ONLY emoji characters MUCH MUCH bigger (NOT numbers, letters or regular text)
    formatted = formatted.replace(
        /([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}](?![\d])|[\u{1FA70}-\u{1FAFF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F1FF}])/gu,
        '<span style="font-size: 32px; line-height: 1; vertical-align: middle; display: inline-block;">$1</span>'
    )

    // Convert line breaks
    formatted = formatted.replace(/\n/g, '<br/>')

    return <span dangerouslySetInnerHTML={{ __html: formatted }} />
}

export function ChatBubble({ msg }: { msg: Message }) {
    const isOwnMessage = auth.currentUser?.uid === msg.userId
    const timestamp = msg.createdAt?.toDate?.() || new Date()

    // Format timestamp based on age
    const formatTimestamp = (date: Date) => {
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

        const timeString = date.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit'
        })

        if (messageDay.getTime() === today.getTime()) {
            return timeString
        } else if (messageDay.getTime() === yesterday.getTime()) {
            return `Gestern, ${timeString}`
        } else {
            const dateString = date.toLocaleDateString('de-DE', {
                day: 'numeric',
                month: 'short'
            })
            return `${dateString} • ${timeString}`
        }
    }

    const timeString = formatTimestamp(timestamp)
    const bubbleRef = useRef<HTMLDivElement>(null)

    // Play sounds only for NEW messages
    useEffect(() => {
        const isMuted = localStorage.getItem('soundsMuted') === 'true'

        if (playedMessages.has(msg.id) || isMuted) {
            return
        }

        const messageAge = msg.createdAt?.toDate?.() || new Date()
        const now = new Date()
        const ageInSeconds = (now.getTime() - messageAge.getTime()) / 1000

        if (ageInSeconds < 5) {
            if (msg.type === 'wakeup') {
                sounds.wakeup.play()

                if (bubbleRef.current) {
                    bubbleRef.current.classList.add('animate-bounce')
                    setTimeout(() => {
                        bubbleRef.current?.classList.remove('animate-bounce')
                    }, 1000)
                }
            } else if (msg.type === 'message' && msg.userId !== auth.currentUser?.uid) {
                sounds.received.play()
            }

            playedMessages.add(msg.id)
        }
    }, [msg.id, msg.type, msg.userId, msg.createdAt])

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

    // Wake up messages
    if (msg.type === 'wakeup') {
        return (
            <div ref={bubbleRef} className="text-center py-2">
                <span className="inline-block px-3 py-1 bg-gradient-to-r from-[#fef3c7] to-[#fed7aa] border border-[#fb923c] rounded-full text-xs text-[#ea580c] font-semibold">
                    ⚡ {msg.nickname} ruft: Wake up! ⚡
                </span>
            </div>
        )
    }

    // Nudge messages (legacy)
    if (msg.type === 'nudge') {
        return (
            <div className="text-center py-2 animate-pulse">
                <span className="inline-block px-3 py-1 bg-[#FFF3E0] rounded-full text-xs text-[#FF6B00] font-bold">
                    📢 {msg.nickname} {msg.text}
                </span>
            </div>
        )
    }

    // Regular messages - MSN Style with Rich Text
    return (
        <div className={`my-1 flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-baseline gap-1 mb-0.5`}>
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
                    <div className="text-sm break-words text-left" style={{ lineHeight: '1.5' }}>
                        {parseRichText(msg.text)}
                    </div>
                </div>
            </div>
        </div>
    )
}