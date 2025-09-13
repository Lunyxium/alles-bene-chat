import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { FormProvider, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { db, auth } from '@/lib/firebase'
import { useState, useRef, useEffect } from 'react'
import { Howl } from 'howler'

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

    // Sound effects (MSN style)
    const messageSound = useRef(new Howl({
        src: ['data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp'],
        volume: 0.3
    }))

    const nudgeSound = useRef(new Howl({
        src: ['data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp'],
        volume: 0.5
    }))

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
        messageSound.current.play()
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

        // Shake animation
        const chatWindow = document.querySelector('.bg-\\[\\#ECE9D8\\]')
        if (chatWindow) {
            chatWindow.classList.add('animate-pulse')
            setTimeout(() => chatWindow.classList.remove('animate-pulse'), 500)
        }

        // nudgeSound.current.play() - disabled for now
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
            <div className="relative">
                {/* Emoji Picker */}
                {showEmojis && (
                    <div className="emoji-container absolute bottom-12 left-2 bg-white border border-[#7A96DF] rounded-md shadow-lg p-2 z-50">
                        <div className="grid grid-cols-8 gap-1">
                            {emojis.map((emoji, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => addEmoji(emoji)}
                                    className="w-8 h-8 hover:bg-[#E5F3FF] rounded flex items-center justify-center text-lg transition-colors"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input Bar */}
                <form onSubmit={onSend} className="flex gap-1 p-2 bg-[#F0EFE7] border-t border-[#7A96DF]">
                    {/* Emoji Button */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            setShowEmojis(!showEmojis)
                        }}
                        className="px-3 py-1.5 bg-gradient-to-b from-white to-[#ECE9D8] border border-[#003C74] rounded text-sm hover:from-[#E5F3FF] hover:to-[#C3E0FF] transition-colors"
                        title="Emojis"
                    >
                        😊
                    </button>

                    {/* Text Input */}
                    <input
                        {...form.register('text')}
                        ref={inputRef}
                        className="flex-1 px-3 py-1.5 border border-[#7A96DF] rounded text-sm focus:outline-none focus:border-[#0054E3] focus:ring-1 focus:ring-[#E5F3FF]"
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
                        className="px-4 py-1.5 bg-gradient-to-b from-white to-[#ECE9D8] border border-[#003C74] rounded text-sm hover:from-[#E5F3FF] hover:to-[#C3E0FF] transition-colors font-semibold"
                    >
                        Senden
                    </button>

                    {/* Nudge Button */}
                    <button
                        type="button"
                        onClick={sendNudge}
                        className="px-3 py-1.5 bg-gradient-to-b from-white to-[#ECE9D8] border border-[#003C74] rounded text-sm hover:from-[#E5F3FF] hover:to-[#C3E0FF] transition-colors"
                        title="Stupser senden"
                    >
                        👋
                    </button>
                </form>
            </div>
        </FormProvider>
    )
}