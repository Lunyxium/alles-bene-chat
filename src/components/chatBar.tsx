import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { FormProvider, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { db, auth } from '@/lib/firebase'
import { useState, useRef, useEffect } from 'react'
import { Howl } from 'howler'
import GifPicker from 'gif-picker-react'
import {
    SmilePlus,
    Send,
    Zap,
    Type,
    Bold,
    Italic,
    Strikethrough,
    Code,
    Quote,
    List,
    ArrowBigRightDash,
    Film
} from 'lucide-react'

// Import der neuen EmojiModal Komponente
import { EmojiModal } from './emojiModal'

// Import sound files
import sentSound from '@/sounds/sent.mp3'
import receivedSound from '@/sounds/received.mp3'
import wakeupSound from '@/sounds/wakeup.mp3'

// Initialize Howler sounds
const sounds = {
    sent: new Howl({
        src: [sentSound],
        volume: 0.3
    }),
    received: new Howl({
        src: [receivedSound],
        volume: 0.3
    }),
    wakeup: new Howl({
        src: [wakeupSound],
        volume: 0.3
    })
}

const schema = z.object({ text: z.string().min(1).max(1000) })

interface FormatOption {
    name: string
    syntax: string
    example: string
    icon: React.ReactNode
    wrap: [string, string]
}

const formatOptions: FormatOption[] = [
    {
        name: 'Bold',
        syntax: '**text**',
        example: 'bold text',
        icon: <Bold className="w-3 h-3" strokeWidth={2.5} />,
        wrap: ['**', '**']
    },
    {
        name: 'Italic',
        syntax: '*text*',
        example: 'italic text',
        icon: <Italic className="w-3 h-3" strokeWidth={2.5} />,
        wrap: ['*', '*']
    },
    {
        name: 'Durchgestrichen',
        syntax: '~~text~~',
        example: 'durchgestrichen',
        icon: <Strikethrough className="w-3 h-3" strokeWidth={2.5} />,
        wrap: ['~~', '~~']
    },
    {
        name: 'Code',
        syntax: '`code`',
        example: 'code',
        icon: <Code className="w-3 h-3" strokeWidth={2.5} />,
        wrap: ['`', '`']
    },
    {
        name: 'Quote',
        syntax: '> text',
        example: 'Zitat',
        icon: <Quote className="w-3 h-3" strokeWidth={2.5} />,
        wrap: ['> ', '']
    },
    {
        name: 'Liste',
        syntax: '- item',
        example: 'Listeneintrag',
        icon: <List className="w-3 h-3" strokeWidth={2.5} />,
        wrap: ['- ', '']
    }
]

export function ChatBar() {
    const form = useForm<{ text: string }>({
        resolver: zodResolver(schema),
        defaultValues: { text: '' }
    })
    const [showEmojis, setShowEmojis] = useState(false)
    const [showGifs, setShowGifs] = useState(false)
    const [showFormatting, setShowFormatting] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const { ref: registerTextRef, ...textField } = form.register('text')

    // Sound effects using Howler
    const playMessageSound = () => {
        const isMuted = localStorage.getItem('soundsMuted') === 'true'
        if (!isMuted) {
            sounds.sent.play()
        }
    }

    const playWakeUpSound = () => {
        const isMuted = localStorage.getItem('soundsMuted') === 'true'
        if (!isMuted) {
            sounds.wakeup.play()
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
        playMessageSound()

        // Reset textarea height nach dem Senden
        if (textareaRef.current) {
            textareaRef.current.style.height = '96px'
        }
    })

    const sendWakeUp = async () => {
        if (!auth.currentUser) return

        const nickname = auth.currentUser.displayName ||
            auth.currentUser.email?.split('@')[0] ||
            'Gast'

        await addDoc(collection(db, 'rooms', 'global', 'messages'), {
            text: 'ruft: Wake up!',
            userId: auth.currentUser.uid,
            nickname,
            createdAt: serverTimestamp(),
            type: 'wakeup'
        })

        // Trigger animation and sound for everyone
        const chatWindows = document.querySelectorAll('[data-chat-window]')
        chatWindows.forEach(window => {
            window.classList.add('animate-bounce')
            setTimeout(() => window.classList.remove('animate-bounce'), 1000)
        })

        // Play sound locally too
        playWakeUpSound()
    }

    // Emoji Handler - Verbessert für bessere Cursor-Position
    const addEmoji = (emoji: string) => {
        const currentValue = form.getValues('text')
        const textarea = textareaRef.current

        if (textarea) {
            const start = textarea.selectionStart
            const end = textarea.selectionEnd
            const newText = currentValue.slice(0, start) + emoji + currentValue.slice(end)
            form.setValue('text', newText)

            // Set cursor position after emoji with proper focus
            setTimeout(() => {
                textarea.focus()
                const newPos = start + emoji.length
                textarea.setSelectionRange(newPos, newPos)

                // Trigger auto-resize
                textarea.dispatchEvent(new Event('input', { bubbles: true }))
            }, 0)
        } else {
            form.setValue('text', currentValue + emoji)
            textareaRef.current?.focus()
        }
    }

    // GIF Handler - fügt GIF als Markdown-Bild ein statt nur URL
    const addGif = (gif: any) => {
        // Verschiedene mögliche URL-Strukturen von Tenor
        const gifUrl = gif.url ||
            gif.media_formats?.gif?.url ||
            gif.media?.[0]?.gif?.url ||
            gif.media_formats?.mediumgif?.url ||
            gif.media?.[0]?.mediumgif?.url ||
            gif.itemurl

        if (gifUrl) {
            const currentValue = form.getValues('text')
            // Füge GIF als spezielle Markierung ein
            form.setValue('text', currentValue + ' ' + gifUrl + ' ')
            setShowGifs(false)
            textareaRef.current?.focus()
        }
    }

    const applyFormat = (wrap: [string, string]) => {
        const textarea = textareaRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const text = form.getValues('text')

        if (start === end) {
            // Kein Text markiert - füge Placeholder ein
            const newText = text.slice(0, start) + wrap[0] + 'text' + wrap[1] + text.slice(end)
            form.setValue('text', newText)

            // Setze Cursor zwischen die Wrapper
            setTimeout(() => {
                textarea.focus()
                textarea.setSelectionRange(start + wrap[0].length, start + wrap[0].length + 4)
            }, 0)
        } else {
            // Text markiert - wrappe ihn
            const selectedText = text.slice(start, end)
            const newText = text.slice(0, start) + wrap[0] + selectedText + wrap[1] + text.slice(end)
            form.setValue('text', newText)

            // Setze Cursor ans Ende
            setTimeout(() => {
                textarea.focus()
                const newPos = start + wrap[0].length + selectedText.length + wrap[1].length
                textarea.setSelectionRange(newPos, newPos)
            }, 0)
        }

        setShowFormatting(false)
    }

    // Auto-resize textarea bei Input
    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const textarea = e.target

        // Reset height to measure the actual content height
        textarea.style.height = '96px'

        // Set new height based on scrollHeight, max 150px
        const newHeight = Math.min(textarea.scrollHeight, 150)
        textarea.style.height = `${newHeight}px`
    }

    // Close popups when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (!target.closest('.emoji-container') && !target.closest('.gif-container') && !target.closest('.format-container')) {
                setShowEmojis(false)
                setShowGifs(false)
                setShowFormatting(false)
            }
        }

        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
    }, [])

    // Format the example text with the actual formatting
    const formatExample = (example: string, format: FormatOption) => {
        switch(format.name) {
            case 'Bold':
                return <strong>{example}</strong>
            case 'Italic':
                return <em>{example}</em>
            case 'Durchgestrichen':
                return <span style={{ textDecoration: 'line-through' }}>{example}</span>
            case 'Code':
                return <code className="bg-gray-100 px-1 rounded">{example}</code>
            case 'Quote':
                return <span className="border-l-2 border-gray-400 pl-2">{example}</span>
            case 'Liste':
                return <span>• {example}</span>
            default:
                return <span>{example}</span>
        }
    }

    return (
        <FormProvider {...form}>
            <div className="relative z-10" data-chat-bar>
                {/* Formatting Helper - positioned above format button */}
                {showFormatting && (
                    <div className="format-container absolute bottom-28 left-8 bg-white/95 backdrop-blur-sm border border-[#9eb8ff] rounded-lg shadow-[0_10px_25px_rgba(58,92,173,0.15)] p-4 z-50 w-80">
                        <div className="text-xs font-semibold text-[#0a4bdd] mb-3">Formatierungs-Legende</div>

                        {/* Legend */}
                        <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                            {formatOptions.map((format, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[#0a4bdd]">
                                        {format.syntax}
                                    </code>
                                    <ArrowBigRightDash className="w-3 h-3 text-gray-400" strokeWidth={2} />
                                    <span className="flex-1">
                                        {formatExample(format.example, format)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Quick Format Buttons */}
                        <div className="border-t border-[#c7d9ff] pt-2">
                            <div className="text-[10px] text-gray-500 mb-1">Markiere Text und klicke:</div>
                            <div className="flex gap-1">
                                {formatOptions.map((format, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => applyFormat(format.wrap)}
                                        className="p-1.5 hover:bg-[#e5f3ff] rounded transition-colors"
                                        title={format.name}
                                    >
                                        {format.icon}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tenor GIF Picker */}
                {showGifs && (
                    <div className="gif-container absolute bottom-28 left-8 z-50">
                        <div className="bg-white border-2 border-[#7a96df] rounded-xl shadow-[0_15px_35px_rgba(58,92,173,0.25)] overflow-hidden">
                            <div onClick={(e) => e.stopPropagation()}>
                                <GifPicker
                                    tenorApiKey={import.meta.env.VITE_TENOR_API_KEY}
                                    onGifClick={(gif) => {
                                        console.log('GIF selected:', gif)
                                        addGif(gif)
                                    }}
                                    width={450}
                                    height={400}
                                    theme="light"
                                    locale="de_DE"
                                    searchPlaceholder="GIFs suchen..."
                                    contentFilter="medium"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Emoji Modal - Saubere Integration */}
                <EmojiModal
                    isOpen={showEmojis}
                    onClose={() => setShowEmojis(false)}
                    onSelect={addEmoji}
                />

                {/* Input Bar */}
                <div className="rounded-[12px] overflow-hidden border border-transparent bg-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                    <form
                        onSubmit={onSend}
                        className="flex gap-2 p-3 bg-gradient-to-r from-[#eef3ff] via-[#e6eeff] to-[#eef3ff] items-center"
                    >
                        {/* Left buttons - centered */}
                        <div className="flex flex-col gap-2">
                            {/* Format Button - purple tone */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setShowFormatting(!showFormatting)
                                    setShowEmojis(false)
                                    setShowGifs(false)
                                }}
                                className="px-2.5 py-1.5 bg-gradient-to-b from-[#f3e6ff] to-[#e6d4ff] border border-[#c09eff] rounded-md text-sm text-[#7c3aed] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-transform hover:-translate-y-[1px] hover:from-[#f0e0ff] hover:to-[#dfc4ff]"
                                title="Formatierung"
                            >
                                <Type className="w-4 h-4" strokeWidth={2} />
                            </button>

                            {/* Emoji Button - blue tone like main theme */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setShowEmojis(!showEmojis)
                                    setShowFormatting(false)
                                    setShowGifs(false)
                                }}
                                className="px-2.5 py-1.5 bg-gradient-to-b from-[#e6f3ff] to-[#d4e9ff] border border-[#9eb8ff] rounded-md text-sm text-[#0a4bdd] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-transform hover:-translate-y-[1px] hover:from-[#e0f0ff] hover:to-[#c4dfff]"
                                title="Emojis"
                            >
                                <SmilePlus className="w-4 h-4" strokeWidth={2} />
                            </button>

                            {/* GIF Button - green tone */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setShowGifs(!showGifs)
                                    setShowEmojis(false)
                                    setShowFormatting(false)
                                }}
                                className="px-2.5 py-1.5 bg-gradient-to-b from-[#e6ffe6] to-[#d4ffd4] border border-[#9eff9e] rounded-md text-sm text-[#0a9e0a] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-transform hover:-translate-y-[1px] hover:from-[#e0ffe0] hover:to-[#c4ffc4]"
                                title="GIFs"
                            >
                                <Film className="w-4 h-4" strokeWidth={2} />
                            </button>
                        </div>

                        {/* Textarea Input with floating character counter */}
                        <div className="relative flex-1">
                            <textarea
                                {...textField}
                                ref={(element) => {
                                    registerTextRef(element)
                                    textareaRef.current = element ?? null
                                }}
                                className="w-full rounded-md border border-[#9eb8ff] bg-white/95 px-3 py-2 pr-12 text-sm text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] focus:outline-none focus:border-[#0a4bdd] focus:ring-2 focus:ring-[#c4d4ff] placeholder:text-[#6c83ca] resize-none overflow-y-auto"
                                placeholder="Type a message..."
                                autoComplete="off"
                                style={{
                                    minHeight: '96px',
                                    maxHeight: '150px',
                                    lineHeight: '1.5',
                                    fontSize: '16px'
                                }}
                                onChange={(e) => {
                                    textField.onChange(e)
                                    handleTextareaChange(e)
                                }}
                                onKeyDown={(e) => {
                                    // Enter ohne Shift = Senden
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        onSend()
                                    }
                                    // Shift+Enter = Neue Zeile (Default-Verhalten)
                                }}
                            />
                            {/* Floating character counter */}
                            <div className="absolute bottom-2 right-2 text-[10px] text-[#a0b1d9] pointer-events-none select-none">
                                {form.watch('text').length}/1000
                            </div>
                        </div>

                        {/* Right buttons - centered */}
                        <div className="flex flex-col gap-2">
                            {/* Send Button - Primary action, prominent */}
                            <button
                                type="submit"
                                className="px-4 py-2 bg-gradient-to-b from-[#0a4bdd] to-[#0840c7] border border-[#0036b3] rounded-md text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_4px_rgba(0,0,0,0.15)] transition-all hover:-translate-y-[1px] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_8px_rgba(0,0,0,0.2)] flex items-center gap-1.5"
                            >
                                <Send className="w-4 h-4" strokeWidth={2} />
                                <span>Send</span>
                            </button>

                            {/* Wake Up Button - Smaller, less prominent */}
                            <button
                                type="button"
                                onClick={sendWakeUp}
                                className="px-3 py-1.5 bg-gradient-to-b from-white to-[#fff3e0] border border-[#ffb366] rounded-md text-xs text-[#ff6b00] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-[1px] hover:from-[#fffaf0] hover:to-[#ffe6cc] flex items-center gap-1"
                                title="Wecke alle auf!"
                            >
                                <Zap className="w-3 h-3" strokeWidth={2.5} />
                                <span className="font-bold">Wake up!</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </FormProvider>
    )
}