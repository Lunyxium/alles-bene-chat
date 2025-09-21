import { auth } from '@/lib/firebase'
import { useEffect, useRef, useState } from 'react'
import { Howl } from 'howler'
import receivedSound from '@/sounds/received.mp3'
import wakeupSound from '@/sounds/wakeup.mp3'

// Initialize Howler sounds
const sounds = {
    received: new Howl({
        src: [receivedSound],
        volume: 0.3  // 30% volume
    }),
    wakeup: new Howl({
        src: [wakeupSound],
        volume: 0.3  // 30% volume
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

// Rich-Text Parser
function parseRichText(text: string): React.ReactNode {
    // Escape HTML first
    const escapeHtml = (str: string) => {
        const div = document.createElement('div')
        div.textContent = str
        return div.innerHTML
    }

    let formatted = escapeHtml(text)

    // Parse in order of precedence
    // Code blocks first (to prevent other formatting inside)
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-[#0a4bdd]">$1</code>')

    // Bold (must come before italic to handle **text* correctly)
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

    // Italic
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>')

    // Strikethrough
    formatted = formatted.replace(/~~([^~]+)~~/g, '<span style="text-decoration: line-through">$1</span>')

    // Quotes (only at line start)
    formatted = formatted.replace(/^&gt; (.+)$/gm, '<div class="border-l-2 border-gray-400 pl-2 my-1">$1</div>')

    // Lists (only at line start)
    formatted = formatted.replace(/^- (.+)$/gm, '<div class="pl-4">• $1</div>')

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
            // Today - just show time
            return timeString
        } else if (messageDay.getTime() === yesterday.getTime()) {
            // Yesterday
            return `Gestern, ${timeString}`
        } else {
            // Older - show date with month name for better readability
            const dateString = date.toLocaleDateString('de-DE', {
                day: 'numeric',
                month: 'short'  // Jan, Feb, Mär, etc.
            })
            return `${dateString} • ${timeString}`
        }
    }

    const timeString = formatTimestamp(timestamp)
    const bubbleRef = useRef<HTMLDivElement>(null)

    // Play sounds only for NEW messages
    useEffect(() => {
        // Check if sounds are muted
        const isMuted = localStorage.getItem('soundsMuted') === 'true'

        // Don't play if already played or muted
        if (playedMessages.has(msg.id) || isMuted) {
            return
        }

        // Only play sounds for messages less than 5 seconds old
        const messageAge = msg.createdAt?.toDate?.() || new Date()
        const now = new Date()
        const ageInSeconds = (now.getTime() - messageAge.getTime()) / 1000

        if (ageInSeconds < 5) {  // Only play for fresh messages
            if (msg.type === 'wakeup') {
                // Play wake up sound for everyone
                sounds.wakeup.play()

                // Shake animation
                if (bubbleRef.current) {
                    bubbleRef.current.classList.add('animate-bounce')
                    setTimeout(() => {
                        bubbleRef.current?.classList.remove('animate-bounce')
                    }, 1000)
                }
            } else if (msg.type === 'message' && msg.userId !== auth.currentUser?.uid) {
                // Play received sound for messages from others
                sounds.received.play()
            }

            // Mark as played
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
                    🔔 {msg.nickname} {msg.text}
                </span>
            </div>
        )
    }

    // Regular messages - MSN Style with Rich Text
    return (
        <div className={`my-1 text-sm flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
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
                    <div className="text-sm break-words text-left">
                        {parseRichText(msg.text)}
                    </div>
                </div>
            </div>
        </div>
    )
}