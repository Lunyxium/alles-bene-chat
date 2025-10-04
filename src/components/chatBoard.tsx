import { collection, orderBy, query, onSnapshot, Timestamp, where } from 'firebase/firestore'
import { useEffect, useState, useRef } from 'react'
import { db, auth } from '@/lib/firebase'
import { ChatBubble } from './chatBubble'
import { BellRing, BellOff } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Message {
    id: string
    text: string
    userId: string
    nickname: string
    createdAt: Timestamp | null
    type?: 'message' | 'nudge' | 'system' | 'wakeup'
}

export function ChatBoard({ chatLayout = 'classic' }: { chatLayout?: 'classic' | 'modern' }) {
    const [messages, setMessages] = useState<Message[]>([])
    const [soundsMuted, setSoundsMuted] = useState(() => {
        return localStorage.getItem('soundsMuted') === 'true'
    })
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const chatContainerRef = useRef<HTMLDivElement>(null)
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const isModern = chatLayout === 'modern'

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

    const wrapperClass = isDark
        ? 'flex h-[60vh] max-h-[70vh] flex-col overflow-hidden bg-gradient-to-b from-[#111c3a] to-[#091326] md:h-[460px] md:max-h-none'
        : 'flex h-[60vh] max-h-[70vh] flex-col overflow-hidden bg-gradient-to-b from-[#f7faff] to-[#eef3ff] md:h-[460px] md:max-h-none'

    const headerClass = isDark
        ? 'flex items-center justify-between border-b border-[#1d3a7a] bg-gradient-to-r from-[#172554] via-[#1e3a8a] to-[#172554] px-4 py-3 text-[#bfdbfe]'
        : 'flex items-center justify-between border-b border-[#c7d9ff] bg-gradient-to-r from-[#eaf1ff] via-[#dfe9ff] to-[#eaf1ff] px-4 py-3'

    const headerIconClass = isDark
        ? 'w-8 h-8 rounded-full border border-[#1d3a7a] bg-[#152141] flex items-center justify-center text-[#bfdbfe] text-sm'
        : 'w-8 h-8 rounded-full border border-[#9eb8ff] bg-white/80 flex items-center justify-center text-[#0a4bdd] text-sm'

    const headerSubtitleClass = isDark ? 'text-[11px] uppercase tracking-[0.3em] text-[#8fa9e8]' : 'text-[11px] uppercase tracking-[0.3em] text-[#6c83ca]'
    const headerTitleClass = isDark ? 'text-sm font-semibold text-[#e2e8f0]' : 'text-sm font-semibold text-[#0a4bdd]'

    const headerMetaClass = isDark ? 'flex items-center gap-2 text-[11px] text-[#9fb7dd]' : 'flex items-center gap-2 text-[11px] text-[#5b6ea5]'
    const headerDividerClass = isDark ? 'h-4 w-px bg-[#1d3a7a]' : 'h-4 w-px bg-[#c7d9ff]'

    const messageAreaClass = `flex-1 overflow-y-auto px-4 py-3 space-y-2 md:px-5 md:py-4 ${isDark ? 'text-[#dbeafe]' : ''}`
    const messageAreaStyle = isDark
        ? {
            backgroundColor: '#0f172a',
            backgroundImage: 'linear-gradient(135deg, rgba(37,99,235,0.08) 25%, transparent 25%, transparent 50%, rgba(37,99,235,0.08) 50%, rgba(37,99,235,0.08) 75%, transparent 75%, transparent)',
            backgroundSize: '40px 40px'
        }
        : {
            backgroundImage: 'linear-gradient(135deg, rgba(122,150,223,0.06) 25%, transparent 25%, transparent 50%, rgba(122,150,223,0.06) 50%, rgba(122,150,223,0.06) 75%, transparent 75%, transparent)',
            backgroundSize: '40px 40px'
        }

    const emptyStateClass = isDark ? 'text-center text-[#93c5fd] text-sm mt-10' : 'text-center text-[#4b5f9b] text-sm mt-10'
    const emptyStateSubClass = isDark ? 'text-xs mt-1 text-[#7aa2f5]' : 'text-xs mt-1 text-[#6c83ca]'

    const footerClass = isDark
        ? 'flex items-center justify-between border-t border-[#1d3a7a] bg-gradient-to-r from-[#162347] to-[#0f1a33] px-3 py-2 text-[11px] text-[#9fb7dd] md:px-4'
        : 'flex items-center justify-between border-t border-[#c7d9ff] bg-gradient-to-r from-[#eaf1ff] to-[#dfe9ff] px-3 py-2 text-[11px] text-[#5b6ea5] md:px-4'

    const soundToggleClass = isDark
        ? 'flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 transition-colors text-[#bfdbfe]'
        : 'flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/30 transition-colors'

    if (isModern) {
        return (
            <Card
                data-chat-window
                className={cn(
                    'flex h-[60vh] max-h-[70vh] flex-col overflow-hidden border-0 shadow-none backdrop-blur-[40px] md:h-[460px] md:max-h-none transition-all duration-300',
                    isDark
                        ? 'bg-slate-950/30'
                        : 'bg-white/95'
                )}
            >
                {/* Modern Chat Header */}
                <CardHeader className={cn(
                    'flex-row items-center justify-between space-y-0 border-b-2 px-6 py-4 backdrop-blur-sm transition-all',
                    isDark
                        ? 'border-white/[0.04] bg-slate-900/40'
                        : 'border-slate-300/90 bg-slate-50/90'
                )}>
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-2xl border-2 text-lg shadow-sm transition-transform hover:scale-105',
                            isDark
                                ? 'border-blue-400/20 bg-blue-500/10'
                                : 'border-blue-200 bg-blue-50/50'
                        )}>
                            💬
                        </div>
                        <CardTitle className={cn(
                            'text-base font-semibold',
                            isDark ? 'text-slate-100' : 'text-slate-900'
                        )}>
                            Globaler Nostalgie-Channel
                        </CardTitle>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                        <Badge variant="outline" className={cn(
                            'gap-1.5 rounded-xl border-2 px-2.5 py-1 shadow-sm',
                            isDark
                                ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                                : 'border-emerald-500 bg-emerald-100 text-emerald-800'
                        )}>
                            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                            Live
                        </Badge>
                        <Badge variant="outline" className={cn(
                            'rounded-xl border-2 px-2.5 py-1 shadow-sm',
                            isDark
                                ? 'border-blue-400/20 bg-blue-500/10 text-blue-300'
                                : 'border-blue-500 bg-blue-100 text-blue-800'
                        )}>
                            {messages.filter(m => m.type !== 'system').length} Nachrichten
                        </Badge>
                    </div>
                </CardHeader>

                {/* Modern Messages Area */}
                <CardContent
                    ref={chatContainerRef}
                    className={cn(
                        'flex-1 space-y-2 overflow-y-auto p-6',
                        isDark ? 'text-slate-100' : 'text-slate-900'
                    )}
                    style={isDark
                        ? {
                            backgroundColor: 'rgba(15, 23, 42, 0.3)',
                            backgroundImage: 'linear-gradient(135deg, rgba(59,130,246,0.05) 25%, transparent 25%, transparent 50%, rgba(59,130,246,0.05) 50%, rgba(59,130,246,0.05) 75%, transparent 75%, transparent)',
                            backgroundSize: '40px 40px'
                        }
                        : {
                            backgroundColor: 'rgba(248, 250, 252, 0.95)',
                            backgroundImage: 'linear-gradient(135deg, rgba(148,163,184,0.04) 25%, transparent 25%, transparent 50%, rgba(148,163,184,0.04) 50%, rgba(148,163,184,0.04) 75%, transparent 75%, transparent)',
                            backgroundSize: '40px 40px'
                        }
                    }
                >
                    {messages.length === 0 ? (
                        <div className={cn(
                            'mt-10 text-center text-sm',
                            isDark ? 'text-slate-400' : 'text-slate-600'
                        )}>
                            <div className="mb-3 text-xl">🔭</div>
                            <div className="font-semibold">Noch keine Nachrichten in den letzten 72 Stunden.</div>
                            <div className={cn('mt-1 text-xs', isDark ? 'text-slate-500' : 'text-slate-500')}>
                                Sei der Erste und sage Hallo! 👋
                            </div>
                        </div>
                    ) : (
                        messages.map(msg => <ChatBubble key={msg.id} msg={msg} />)
                    )}
                    <div ref={messagesEndRef} />
                </CardContent>

                {/* Modern Footer with Sound Toggle */}
                <CardFooter className={cn(
                    'items-center justify-between border-t-2 px-6 py-3 text-xs backdrop-blur-sm transition-all',
                    isDark
                        ? 'border-white/[0.04] bg-slate-900/40 text-slate-400'
                        : 'border-slate-300/90 bg-slate-50/90 text-slate-700'
                )}>
                    <span className="truncate pr-2">Tippe eine Nachricht oder sende ein Wake up! ⚡</span>
                    <Button
                        onClick={toggleSounds}
                        variant="ghost"
                        size="sm"
                        className={cn(
                            'h-8 gap-1.5 rounded-xl px-3 text-xs transition-all',
                            isDark
                                ? 'hover:bg-white/10 text-slate-300 hover:text-slate-100'
                                : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                        )}
                        title={soundsMuted ? "Sounds aktivieren" : "Sounds stummschalten"}
                    >
                        {soundsMuted ? (
                            <>
                                <BellOff className="h-3 w-3" strokeWidth={2} />
                                <span>Stumm</span>
                            </>
                        ) : (
                            <>
                                <BellRing className="h-3 w-3" strokeWidth={2} />
                                <span>Laut</span>
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        )
    }

    return (
        <div
            data-chat-window
            className={wrapperClass}
        >
            {/* Chat Header */}
            <div className={headerClass}>
                <div className="flex items-center gap-3">
                    <div className={headerIconClass}>
                        💬
                    </div>
                    <div className="leading-tight">
                        <p className={headerSubtitleClass}>Chat-Verlauf</p>
                        <span className={headerTitleClass} style={{ fontFamily: 'Trebuchet MS, Tahoma, sans-serif' }}>
                            Globaler Nostalgie-Channel
                        </span>
                    </div>
                </div>
                <div className={headerMetaClass}>
                    <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 bg-[#7FBA00] rounded-full" />
                        Live
                    </span>
                    <span className={headerDividerClass} />
                    <span>Messagecounter past 72h: {messages.filter(m => m.type !== 'system').length}</span>
                </div>
            </div>

            {/* Messages Area */}
            <div
                ref={chatContainerRef}
                className={messageAreaClass}
                style={messageAreaStyle}
            >
                {messages.length === 0 ? (
                    <div className={emptyStateClass}>
                        <div className="mb-3 text-xl">🔭</div>
                        <div className="font-semibold">Noch keine Nachrichten in den letzten 72 Stunden.</div>
                        <div className={emptyStateSubClass}>Sei der Erste und sage Hallo! 👋</div>
                    </div>
                ) : (
                    messages.map(msg => <ChatBubble key={msg.id} msg={msg} />)
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Typing Indicator / Status with Sound Toggle */}
            <div className={footerClass}>
                <span className="truncate pr-2">Tippe eine Nachricht oder sende ein Wake up! ⚡</span>
                <button
                    onClick={toggleSounds}
                    className={soundToggleClass}
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
