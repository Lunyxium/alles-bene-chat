import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { db, auth } from '@/lib/firebase'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Howl } from 'howler'
import GifPicker, { Theme, ContentFilter } from 'gif-picker-react'
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
    Film,
    X
} from 'lucide-react'
import { EmojiModal } from './emojiModal'

// ==================== SOUND IMPORTS ====================
import sentSound from '@/sounds/sent.mp3'
import receivedSound from '@/sounds/received.mp3'
import wakeupSound from '@/sounds/wakeup.mp3'

// ==================== SOUND INITIALIZATION ====================
const sounds = {
    sent: new Howl({ src: [sentSound], volume: 0.3 }),
    received: new Howl({ src: [receivedSound], volume: 0.3 }),
    wakeup: new Howl({ src: [wakeupSound], volume: 0.3 })
}

// ==================== TYPES & SCHEMAS ====================
const messageSchema = z.object({
    text: z.string().min(1).max(1000)
})

interface FormatOption {
    name: string
    syntax: string
    example: string
    icon: React.ReactNode
    wrap: [string, string]
}

// ==================== FORMAT OPTIONS CONFIGURATION ====================
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

// ==================== LIVE MARKDOWN PARSER ====================
/**
 * Parses plain text with Markdown syntax to HTML for live preview
 * Handles: Bold, Italic, Strike, Code, Emojis (makes them bigger)
 */
function parseMarkdownToHTML(text: string): string {
    if (!text) return ''

    // Escape HTML to prevent XSS
    const escapeHtml = (str: string) => {
        const div = document.createElement('div')
        div.textContent = str
        return div.innerHTML
    }

    let html = escapeHtml(text)

    // Parse Markdown (order matters!)
    // Code blocks first (to prevent other formatting inside)
    html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-[#0a4bdd]">$1</code>')

    // Bold (must come before italic)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')

    // Strikethrough
    html = html.replace(/~~([^~]+)~~/g, '<span style="text-decoration: line-through">$1</span>')

    // Quotes (line start only)
    html = html.replace(/^&gt; (.+)$/gm, '<div class="border-l-2 border-gray-400 pl-2 my-1">$1</div>')

    // Lists (line start only)
    html = html.replace(/^- (.+)$/gm, '<div class="pl-4">• $1</div>')

    // EMOJIS - Make them 50% bigger!
    html = html.replace(
        /([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{1FA70}-\u{1FAFF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F1FF}])/gu,
        '<span style="font-size: 1.5em; vertical-align: middle;">$1</span>'
    )

    // Line breaks
    html = html.replace(/\n/g, '<br>')

    return html
}

/**
 * Extracts plain text from HTML content
 */
function extractPlainText(html: string): string {
    const temp = document.createElement('div')
    temp.innerHTML = html
    return temp.textContent || temp.innerText || ''
}

// ==================== MAIN COMPONENT ====================
export function ChatBar() {
    // Form handling
    const form = useForm<{ text: string }>({
        resolver: zodResolver(messageSchema),
        defaultValues: { text: '' }
    })

    // UI State
    const [showEmojis, setShowEmojis] = useState(false)
    const [showGifs, setShowGifs] = useState(false)
    const [showFormatting, setShowFormatting] = useState(false)
    const [htmlContent, setHtmlContent] = useState('')

    // Refs
    const contentEditableRef = useRef<HTMLDivElement>(null)
    const lastCursorPosition = useRef(0)

    // ==================== HELPER FUNCTIONS ====================

    /**
     * Plays sound if not muted
     */
    const playSound = useCallback((sound: 'sent' | 'wakeup') => {
        const isMuted = localStorage.getItem('soundsMuted') === 'true'
        if (!isMuted) {
            sounds[sound].play()
        }
    }, [])

    /**
     * Gets current cursor position in contentEditable
     */
    const getCursorPosition = useCallback(() => {
        const selection = window.getSelection()
        if (!selection || selection.rangeCount === 0) return 0

        const range = selection.getRangeAt(0)
        const clonedRange = range.cloneRange()
        const editableElement = contentEditableRef.current

        if (!editableElement) return 0

        clonedRange.selectNodeContents(editableElement)
        clonedRange.setEnd(range.endContainer, range.endOffset)

        return clonedRange.toString().length
    }, [])

    /**
     * Sets cursor position in contentEditable
     */
    const setCursorPosition = useCallback((position: number) => {
        const editableElement = contentEditableRef.current
        if (!editableElement) return

        const textNodes: Text[] = []
        const walker = document.createTreeWalker(
            editableElement,
            NodeFilter.SHOW_TEXT,
            null
        )

        let node
        while (node = walker.nextNode()) {
            textNodes.push(node as Text)
        }

        let charCount = 0
        let targetNode: Text | null = null
        let targetOffset = 0

        for (const textNode of textNodes) {
            const nodeLength = textNode.textContent?.length || 0
            if (charCount + nodeLength >= position) {
                targetNode = textNode
                targetOffset = position - charCount
                break
            }
            charCount += nodeLength
        }

        if (targetNode) {
            const range = document.createRange()
            const selection = window.getSelection()

            range.setStart(targetNode, Math.min(targetOffset, targetNode.textContent?.length || 0))
            range.collapse(true)

            selection?.removeAllRanges()
            selection?.addRange(range)
        }
    }, [])

    // ==================== MESSAGE HANDLING ====================

    /**
     * Handles contentEditable input changes
     */
    const handleContentChange = useCallback(() => {
        if (!contentEditableRef.current) return

        // Get plain text for form
        const plainText = extractPlainText(contentEditableRef.current.innerHTML)
        form.setValue('text', plainText)

        // Store cursor position
        lastCursorPosition.current = getCursorPosition()

        // Update HTML with live markdown
        const newHtml = parseMarkdownToHTML(plainText)
        setHtmlContent(newHtml)

        // Restore cursor after React re-render
        setTimeout(() => {
            setCursorPosition(lastCursorPosition.current)
        }, 0)
    }, [form, getCursorPosition, setCursorPosition])

    /**
     * Sends the message
     */
    const onSend = form.handleSubmit(async ({ text }) => {
        if (!auth.currentUser || !text.trim()) return

        const nickname = auth.currentUser.displayName ||
            auth.currentUser.email?.split('@')[0] ||
            'Gast_' + auth.currentUser.uid.slice(0, 4)

        await addDoc(collection(db, 'rooms', 'global', 'messages'), {
            text: text.trim(),
            userId: auth.currentUser.uid,
            nickname,
            createdAt: serverTimestamp(),
            type: 'message'
        })

        // Reset form and content
        form.reset()
        setHtmlContent('')
        if (contentEditableRef.current) {
            contentEditableRef.current.innerHTML = ''
        }

        playSound('sent')
    })

    /**
     * Sends a wake up nudge
     */
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

        // Animate all chat windows
        document.querySelectorAll('[data-chat-window]').forEach(window => {
            window.classList.add('animate-bounce')
            setTimeout(() => window.classList.remove('animate-bounce'), 1000)
        })

        playSound('wakeup')
    }

    // ==================== CONTENT INSERTION ====================

    /**
     * Adds emoji at cursor position
     */
    const addEmoji = useCallback((emoji: string) => {
        if (!contentEditableRef.current) return

        contentEditableRef.current.focus()

        const selection = window.getSelection()
        if (!selection) return

        const range = selection.getRangeAt(0)
        range.deleteContents()

        const textNode = document.createTextNode(emoji)
        range.insertNode(textNode)
        range.setStartAfter(textNode)
        range.setEndAfter(textNode)

        selection.removeAllRanges()
        selection.addRange(range)

        handleContentChange()
    }, [handleContentChange])

    /**
     * Adds GIF URL at cursor position
     */
    const addGif = useCallback((gif: any) => {
        const gifUrl = gif.url ||
            gif.media_formats?.gif?.url ||
            gif.media?.[0]?.gif?.url ||
            gif.media_formats?.mediumgif?.url ||
            gif.media?.[0]?.mediumgif?.url ||
            gif.itemurl

        if (gifUrl && contentEditableRef.current) {
            contentEditableRef.current.focus()
            document.execCommand('insertText', false, ` ${gifUrl} `)
            handleContentChange()
        }
    }, [handleContentChange])

    /**
     * Applies markdown formatting to selected text
     */
    const applyFormat = useCallback((wrap: [string, string]) => {
        if (!contentEditableRef.current) return

        contentEditableRef.current.focus()

        const selection = window.getSelection()
        if (!selection || selection.rangeCount === 0) return

        const range = selection.getRangeAt(0)
        const selectedText = range.toString()

        if (selectedText) {
            // Wrap selected text
            document.execCommand('insertText', false, wrap[0] + selectedText + wrap[1])
        } else {
            // Insert with placeholder
            document.execCommand('insertText', false, wrap[0] + 'text' + wrap[1])
        }

        handleContentChange()
    }, [handleContentChange])

    // ==================== EVENT HANDLERS ====================

    /**
     * Handles key presses in contentEditable
     */
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        // Enter sends message (Shift+Enter for new line)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSend()
        }
    }, [onSend])

    /**
     * Handles paste events to strip formatting
     */
    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        e.preventDefault()
        const text = e.clipboardData.getData('text/plain')
        document.execCommand('insertText', false, text)
        handleContentChange()
    }, [handleContentChange])

    // ==================== EFFECTS ====================

    // Close popups on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement

            if (!target.closest('.emoji-container') &&
                !target.closest('.gif-container') &&
                !target.closest('.format-container') &&
                !target.closest('[data-popup-trigger]')) {
                setShowEmojis(false)
                setShowGifs(false)
                setShowFormatting(false)
            }
        }

        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
    }, [])

    // ==================== RENDER HELPERS ====================

    /**
     * Renders format example with actual styling
     */
    const renderFormatExample = (example: string, format: FormatOption) => {
        const styleMap: Record<string, JSX.Element> = {
            'Bold': <strong>{example}</strong>,
            'Italic': <em>{example}</em>,
            'Durchgestrichen': <span style={{ textDecoration: 'line-through' }}>{example}</span>,
            'Code': <code className="bg-gray-100 px-1 rounded">{example}</code>,
            'Quote': <span className="border-l-2 border-gray-400 pl-2">{example}</span>,
            'Liste': <span>• {example}</span>
        }

        return styleMap[format.name] || <span>{example}</span>
    }

    // ==================== MAIN RENDER ====================

    return (
        <div className="relative z-10" data-chat-bar>
            {/* Format Helper Popup */}
            {showFormatting && (
                <div className="format-container absolute bottom-28 left-8 bg-white/95 backdrop-blur-sm border border-[#9eb8ff] rounded-lg shadow-[0_10px_25px_rgba(58,92,173,0.15)] p-4 z-50 w-80">
                    <button
                        onClick={() => setShowFormatting(false)}
                        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                        title="Schliessen"
                    >
                        <X className="w-3 h-3" strokeWidth={2} />
                    </button>

                    <div className="text-xs font-semibold text-[#0a4bdd] mb-3">
                        Formatierungs-Legende
                    </div>

                    <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                        {formatOptions.map((format, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[#0a4bdd]">
                                    {format.syntax}
                                </code>
                                <ArrowBigRightDash className="w-3 h-3 text-gray-400" strokeWidth={2} />
                                <span className="flex-1">
                                    {renderFormatExample(format.example, format)}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-[#c7d9ff] pt-2">
                        <div className="text-[10px] text-gray-500 mb-1">
                            Markiere Text und klicke:
                        </div>
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

            {/* GIF Picker Popup */}
            {showGifs && (
                <div className="gif-container absolute bottom-28 left-8 z-50">
                    <div className="bg-white border-2 border-[#7a96df] rounded-xl shadow-[0_15px_35px_rgba(58,92,173,0.25)] overflow-hidden relative">
                        <button
                            onClick={() => setShowGifs(false)}
                            className="absolute top-2 right-2 z-50 w-6 h-6 rounded-full bg-white/90 hover:bg-white border border-gray-300 flex items-center justify-center transition-colors"
                            title="Schliessen"
                        >
                            <X className="w-4 h-4" strokeWidth={2} />
                        </button>

                        <div onClick={(e) => e.stopPropagation()}>
                            <GifPicker
                                tenorApiKey={import.meta.env.VITE_TENOR_API_KEY}
                                onGifClick={addGif}
                                width={450}
                                height={400}
                                theme={Theme.LIGHT}
                                locale="de_DE"
                                contentFilter={ContentFilter.MEDIUM}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Emoji Modal */}
            <EmojiModal
                isOpen={showEmojis}
                onClose={() => setShowEmojis(false)}
                onSelect={addEmoji}
            />

            {/* Main Input Bar */}
            <div className="rounded-[12px] overflow-hidden border border-transparent bg-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                <form
                    onSubmit={onSend}
                    className="flex gap-2 p-3 bg-gradient-to-r from-[#eef3ff] via-[#e6eeff] to-[#eef3ff] items-center"
                >
                    {/* Format/Emoji/GIF Buttons */}
                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            data-popup-trigger
                            onClick={(e) => {
                                e.stopPropagation()
                                setShowFormatting(!showFormatting)
                                setShowEmojis(false)
                                setShowGifs(false)
                            }}
                            className="px-2.5 py-1.5 bg-gradient-to-b from-[#f3e6ff] to-[#e6d4ff] border border-[#c09eff] rounded-md text-sm text-[#7c3aed] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-transform hover:-translate-y-[1px]"
                            title="Formatierung"
                        >
                            <Type className="w-4 h-4" strokeWidth={2} />
                        </button>

                        <button
                            type="button"
                            data-popup-trigger
                            onClick={(e) => {
                                e.stopPropagation()
                                setShowEmojis(!showEmojis)
                                setShowFormatting(false)
                                setShowGifs(false)
                            }}
                            className="px-2.5 py-1.5 bg-gradient-to-b from-[#e6f3ff] to-[#d4e9ff] border border-[#9eb8ff] rounded-md text-sm text-[#0a4bdd] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-transform hover:-translate-y-[1px]"
                            title="Emojis"
                        >
                            <SmilePlus className="w-4 h-4" strokeWidth={2} />
                        </button>

                        <button
                            type="button"
                            data-popup-trigger
                            onClick={(e) => {
                                e.stopPropagation()
                                setShowGifs(!showGifs)
                                setShowEmojis(false)
                                setShowFormatting(false)
                            }}
                            className="px-2.5 py-1.5 bg-gradient-to-b from-[#e6ffe6] to-[#d4ffd4] border border-[#9eff9e] rounded-md text-sm text-[#0a9e0a] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-transform hover:-translate-y-[1px]"
                            title="GIFs"
                        >
                            <Film className="w-4 h-4" strokeWidth={2} />
                        </button>
                    </div>

                    {/* ContentEditable Input with Live Markdown */}
                    <div className="relative flex-1">
                        <div
                            ref={contentEditableRef}
                            contentEditable
                            className="w-full min-h-[96px] max-h-[150px] overflow-y-auto rounded-md border border-[#9eb8ff] bg-white/95 px-3 py-2 pr-12 text-sm text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] focus:outline-none focus:border-[#0a4bdd] focus:ring-2 focus:ring-[#c4d4ff] placeholder:text-[#6c83ca]"
                            onInput={handleContentChange}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            dangerouslySetInnerHTML={{ __html: htmlContent }}
                            data-placeholder="Type a message..."
                            style={{
                                lineHeight: '1.5',
                                fontFamily: '"Tahoma", "Verdana", system-ui, sans-serif'
                            }}
                        />

                        {/* Character Counter */}
                        <div className="absolute bottom-2 right-2 text-[10px] text-[#a0b1d9] pointer-events-none select-none">
                            {form.watch('text').length}/1000
                        </div>

                        {/* Placeholder CSS (when empty) */}
                        <style jsx>{`
                            [contenteditable]:empty:before {
                                content: attr(data-placeholder);
                                color: #6c83ca;
                                pointer-events: none;
                                display: block;
                                position: absolute;
                            }
                        `}</style>
                    </div>

                    {/* Send & Wake Up Buttons */}
                    <div className="flex flex-col gap-2">
                        <button
                            type="submit"
                            className="px-4 py-2 bg-gradient-to-b from-[#0a4bdd] to-[#0840c7] border border-[#0036b3] rounded-md text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_4px_rgba(0,0,0,0.15)] transition-all hover:-translate-y-[1px] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_8px_rgba(0,0,0,0.2)] flex items-center gap-1.5"
                        >
                            <Send className="w-4 h-4" strokeWidth={2} />
                            <span>Send</span>
                        </button>

                        <button
                            type="button"
                            onClick={sendWakeUp}
                            className="px-3 py-1.5 bg-gradient-to-b from-white to-[#fff3e0] border border-[#ffb366] rounded-md text-xs text-[#ff6b00] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-[1px] flex items-center gap-1"
                            title="Wecke alle auf!"
                        >
                            <Zap className="w-3 h-3" strokeWidth={2.5} />
                            <span className="font-bold">Wake up!</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}