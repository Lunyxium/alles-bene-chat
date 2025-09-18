import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { FormProvider, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { db, auth } from '@/lib/firebase'
import { useState, useRef, useEffect } from 'react'

const schema = z.object({ text: z.string().min(1).max(500) })

const emojis = [
    '😀', '😂', '😍', '🤔', '😎', '😢', '😡', '👍',
    '👎', '❤️', '🎉', '🔥', '😴', '🤗', '🙈', '✨'
]

export function ChatBar() {
    const form = useForm<{ text: string }>({
        resolver: zodResolver(schema),
        defaultValues: { text: '' }
    })
    const [showEmojis, setShowEmojis] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    // Sound effects (MSN style) - Vereinfacht oder mit korrekten Base64 Strings
    // Option 1: Verwende Web Audio API direkt für simple Töne
    const playMessageSound = () => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)

            oscillator.frequency.value = 800 // Frequenz in Hz
            oscillator.type = 'sine'

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)

            oscillator.start(audioContext.currentTime)
            oscillator.stop(audioContext.currentTime + 0.2)
        } catch (error) {
            console.log('Sound playback failed:', error)
        }
    }

    const playNudgeSound = () => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

            // Erstelle zwei Oszillatoren für einen "Nudge" Sound
            for (let i = 0; i < 2; i++) {
                setTimeout(() => {
                    const oscillator = audioContext.createOscillator()
                    const gainNode = audioContext.createGain()

                    oscillator.connect(gainNode)
                    gainNode.connect(audioContext.destination)

                    oscillator.frequency.value = 600 + (i * 200) // Verschiedene Frequenzen
                    oscillator.type = 'sine'

                    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

                    oscillator.start(audioContext.currentTime)
                    oscillator.stop(audioContext.currentTime + 0.1)
                }, i * 100)
            }
        } catch (error) {
            console.log('Nudge sound playback failed:', error)
        }
    }

    const onSend = form.handleSubmit(async ({ text }) => {
        if (!auth.currentUser) return

        const nickname = auth.currentUser.displayName ||
            auth.currentUser.email?.split('@')[0] ||
            'Gast_' + auth.currentUser.uid.slice(0, 4)

        await addDoc(collection(db, 'rooms', 'global', 'messages'), {
            text,
            userId: auth.currentUser.uid,
            nickname,
            createdAt: serverTimestamp(),
            type: 'message'
        })

        form.reset()
        playMessageSound() // Verwende die neue Funktion
    })

    const sendNudge = async () => {
        if (!auth.currentUser) return

        const nickname = auth.currentUser.displayName ||
            auth.currentUser.email?.split('@')[0] ||
            'Gast'

        await addDoc(collection(db, 'rooms', 'global', 'messages'), {
            text: 'hat einen Stupser gesendet! 👋',
            userId: auth.currentUser.uid,
            nickname,
            createdAt: serverTimestamp(),
            type: 'nudge'
        })

        // Shake animation für das Chat-Fenster
        const chatWindows = document.querySelectorAll('[data-chat-window]')
        chatWindows.forEach(window => {
            window.classList.add('animate-pulse')
            setTimeout(() => window.classList.remove('animate-pulse'), 500)
        })

        playNudgeSound() // Verwende die neue Funktion
    }

    const addEmoji = (emoji: string) => {
        const currentValue = form.getValues('text')
        form.setValue('text', currentValue + emoji)
        setShowEmojis(false)
        inputRef.current?.focus()
    }

    // Close emoji picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (!target.closest('.emoji-container')) {
                setShowEmojis(false)
            }
        }

        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
    }, [])

    return (
        <FormProvider {...form}>
            <div className="relative z-10" data-chat-bar>
                {/* Emoji Picker */}
                {showEmojis && (
                    <div className="emoji-container absolute bottom-14 left-2 bg-white/95 backdrop-blur-sm border border-[#9eb8ff] rounded-lg shadow-[0_10px_25px_rgba(58,92,173,0.15)] p-3 z-50">
                        <div className="grid grid-cols-8 gap-1.5">
                            {emojis.map((emoji, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => addEmoji(emoji)}
                                    className="w-8 h-8 hover:bg-[#e5f3ff] rounded-md flex items-center justify-center text-lg transition-colors"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input Bar */}
                <div className="rounded-[12px] overflow-hidden border border-transparent bg-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                    <form
                        onSubmit={onSend}
                        className="flex gap-2 p-3 bg-gradient-to-r from-[#eef3ff] via-[#e6eeff] to-[#eef3ff]"
                    >
                        {/* Emoji Button */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                setShowEmojis(!showEmojis)
                            }}
                            className="px-3 py-2 bg-gradient-to-b from-white to-[#e6eeff] border border-[#9eb8ff] rounded-md text-sm text-[#0a4bdd] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-transform hover:-translate-y-[1px] hover:from-white hover:to-[#dbe5ff]"
                            title="Emojis"
                        >
                            😊
                        </button>

                        {/* Text Input */}
                        <input
                            {...form.register('text')}
                            ref={inputRef}
                            className="flex-1 rounded-md border border-[#9eb8ff] bg-white/95 px-3 py-2 text-sm text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] focus:outline-none focus:border-[#0a4bdd] focus:ring-2 focus:ring-[#c4d4ff] placeholder:text-[#6c83ca]"
                            placeholder="Nachricht eingeben..."
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    onSend()
                                }
                            }}
                        />

                        {/* Send Button */}
                        <button
                            type="submit"
                            className="px-4 py-2 bg-gradient-to-b from-white to-[#e6eeff] border border-[#9eb8ff] rounded-md text-sm font-semibold text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-[1px] hover:from-white hover:to-[#dbe5ff]"
                        >
                            Senden
                        </button>

                        {/* Nudge Button */}
                        <button
                            type="button"
                            onClick={sendNudge}
                            className="px-3 py-2 bg-gradient-to-b from-white to-[#e6eeff] border border-[#9eb8ff] rounded-md text-sm text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-[1px] hover:from-white hover:to-[#dbe5ff]"
                            title="Stupser senden"
                        >
                            👋
                        </button>
                    </form>
                </div>
            </div>
        </FormProvider>
    )
}
