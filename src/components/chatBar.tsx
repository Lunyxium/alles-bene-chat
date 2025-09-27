import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { db, auth } from '@/lib/firebase'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Howl } from 'howler'
import { SmilePlus, Send, Zap, Type, Film } from 'lucide-react'
import { EmojiPicker } from './emojiPicker'
import { FormatHelper } from './formatHelper'
import { GifPicker } from './gifPicker'
import {
    EMOJI_INPUT_STYLES,
    MAX_GIF_PER_MESSAGE,
    MAX_MESSAGE_LENGTH,
    GIF_CLASS,
    GIF_BLOCK_CLASS,
    WRAPS
} from '@/constants/editorConstants'
import {
    normalizeInputDOM,
    serializeToMarkdown,
    saveSelection,
    restoreSelection,
    insertEmoji,
    insertText,
    toggleWrap,
    getCurrentParagraph,
    caretAtParagraphStart,
    caretAtParagraphEnd,
    setCaretAtParagraphStart,
    escapeRegExp
} from '@/utils/editorHelpers'

// ==================== SOUND IMPORTS ====================
import sentSound from '@/sounds/sent.mp3'
import wakeupSound from '@/sounds/wakeup.mp3'

const sounds = {
    sent: new Howl({ src: [sentSound], volume: 0.3 }),
    wakeup: new Howl({ src: [wakeupSound], volume: 0.3 })
}

// ==================== SCHEMA ====================
const messageSchema = z.object({
    text: z.string().min(1).max(MAX_MESSAGE_LENGTH)
})

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
    const [gifLimitHit, setGifLimitHit] = useState(false)

    // Refs
    const contentEditableRef = useRef<HTMLDivElement>(null)
    const lastSelectionRef = useRef<ReturnType<typeof saveSelection>>(null)

    // ==================== HELPERS ====================
    const playSound = useCallback((sound: 'sent' | 'wakeup') => {
        const isMuted = localStorage.getItem('soundsMuted') === 'true'
        if (!isMuted) sounds[sound].play()
    }, [])

    const updateForm = useCallback(() => {
        const el = contentEditableRef.current
        if (!el) return
        const markdown = serializeToMarkdown(el)
        form.setValue('text', markdown, { shouldValidate: false, shouldDirty: true })
    }, [form])

    // ==================== INITIALIZATION ====================
    useEffect(() => {
        const el = contentEditableRef.current
        if (!el) return

        normalizeInputDOM(el)

        if (el.childNodes.length === 0) {
            const p = document.createElement('div')
            p.setAttribute('data-paragraph', '1')
            p.appendChild(document.createElement('br'))
            el.appendChild(p)
        }
    }, [])

    // ==================== MESSAGE HANDLING ====================
    const onSend = useCallback(async () => {
        const el = contentEditableRef.current
        if (!el || !auth.currentUser) return

        const markdown = serializeToMarkdown(el)
        if (!markdown.trim()) return

        const parse = messageSchema.safeParse({ text: markdown })
        if (!parse.success) return

        const nickname = auth.currentUser.displayName ||
            auth.currentUser.email?.split('@')[0] ||
            'Gast_' + auth.currentUser.uid.slice(0, 4)

        await addDoc(collection(db, 'rooms', 'global', 'messages'), {
            text: markdown.trim(),
            userId: auth.currentUser.uid,
            nickname,
            createdAt: serverTimestamp(),
            type: 'message'
        })

        // Reset
        form.reset()
        el.innerHTML = ''
        const p = document.createElement('div')
        p.setAttribute('data-paragraph', '1')
        p.appendChild(document.createElement('br'))
        el.appendChild(p)
        lastSelectionRef.current = null

        playSound('sent')
    }, [form, playSound])

    // ==================== EVENT HANDLERS ====================
    const handleInput = useCallback(() => {
        lastSelectionRef.current = saveSelection(contentEditableRef.current!)
        updateForm()
    }, [updateForm])

    const handleBlur = useCallback(() => {
        // Save selection when editor loses focus
        lastSelectionRef.current = saveSelection(contentEditableRef.current!)
    }, [])

    const handleFocus = useCallback(() => {
        // When editor regains focus, restore last known selection if available
        if (lastSelectionRef.current) {
            restoreSelection(contentEditableRef.current!, lastSelectionRef.current)
        }
    }, [])

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        const el = contentEditableRef.current
        if (!el) return

        // Backspace at paragraph start -> delete previous GIF
        if (e.key === 'Backspace') {
            const p = getCurrentParagraph(el)
            if (p && caretAtParagraphStart(p)) {
                const prev = p.previousSibling as HTMLElement | null
                if (prev?.classList?.contains(GIF_BLOCK_CLASS)) {
                    e.preventDefault()
                    prev.remove()
                    setCaretAtParagraphStart(p)
                    normalizeInputDOM(el)
                    updateForm()
                    return
                }
            }
        }

        // Delete at paragraph end -> delete next GIF
        if (e.key === 'Delete') {
            const p = getCurrentParagraph(el)
            if (p && caretAtParagraphEnd(p)) {
                const next = p.nextSibling as HTMLElement | null
                if (next?.classList?.contains(GIF_BLOCK_CLASS)) {
                    e.preventDefault()
                    next.remove()
                    setCaretAtParagraphStart(p)
                    normalizeInputDOM(el)
                    updateForm()
                    return
                }
            }
        }

        // Enter without Shift -> send
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSend()
            return
        }

        // Keyboard shortcuts
        const meta = e.ctrlKey || e.metaKey
        if (meta) {
            const key = e.key.toLowerCase()
            if (key === 'b') { e.preventDefault(); applyMarkdown(WRAPS.bold) }
            else if (key === 'i') { e.preventDefault(); applyMarkdown(WRAPS.italic) }
            else if (key === 's') { e.preventDefault(); applyMarkdown(WRAPS.strike) }
            else if (key === 'e') { e.preventDefault(); applyMarkdown(WRAPS.code) }
        }
    }, [onSend, updateForm])

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        e.preventDefault()
        const el = contentEditableRef.current
        if (!el) return

        const text = e.clipboardData.getData('text/plain')
        insertText(el, text, lastSelectionRef.current)
        normalizeInputDOM(el)
        updateForm()
    }, [updateForm])

    // ==================== MARKDOWN HELPERS ====================
    const applyMarkdown = useCallback((wrap: [string, string]) => {
        const el = contentEditableRef.current
        if (!el) return

        el.focus()

        const sel = window.getSelection()
        if (!sel || sel.rangeCount === 0) {
            insertText(el, wrap[0] + wrap[1], lastSelectionRef.current)
            normalizeInputDOM(el)
            updateForm()
            return
        }

        // Use current selection or restore saved selection
        if (lastSelectionRef.current && lastSelectionRef.current.text.length > 0) {
            restoreSelection(el, lastSelectionRef.current)
        }

        const range = sel.getRangeAt(0)
        const selected = range.toString()

        // Handle prefix-only formats (Quote/List)
        if (wrap[1] === '') {
            const replacement = selected
                .split(/\n/)
                .map((line) =>
                    line.startsWith(wrap[0])
                        ? line.replace(new RegExp('^' + escapeRegExp(wrap[0])), '')
                        : wrap[0] + line
                )
                .join('\n')

            range.deleteContents()
            range.insertNode(document.createTextNode(replacement))
        } else {
            // FIXED: Simply wrap the selected text
            const replacement = toggleWrap(selected, wrap)
            range.deleteContents()
            range.insertNode(document.createTextNode(replacement))
        }

        normalizeInputDOM(el)
        lastSelectionRef.current = saveSelection(el)
        updateForm()
    }, [updateForm])

    // ==================== GIF HANDLING ====================
    const insertGif = useCallback((url: string) => {
        const el = contentEditableRef.current
        if (!el) return

        // Check GIF limit
        const currentGifs = el.querySelectorAll(`img.${GIF_CLASS}, img[data-gif]`).length
        if (currentGifs >= MAX_GIF_PER_MESSAGE) {
            setGifLimitHit(true)
            setTimeout(() => setGifLimitHit(false), 1200)
            return
        }

        el.focus()
        if (lastSelectionRef.current) restoreSelection(el, lastSelectionRef.current)

        const sel = window.getSelection()
        if (!sel) return

        const range = sel.rangeCount === 0
            ? (() => {
                const r = document.createRange()
                r.selectNodeContents(el)
                r.collapse(false)
                sel.addRange(r)
                return r
            })()
            : sel.getRangeAt(0)

        // Create GIF block
        const wrapper = document.createElement('div')
        wrapper.className = GIF_BLOCK_CLASS
        wrapper.contentEditable = 'false'
        wrapper.style.display = 'block'
        wrapper.style.margin = '6px 0'

        const img = document.createElement('img')
        img.src = url
        img.alt = 'gif'
        img.dataset.gif = '1'
        img.className = GIF_CLASS
        img.setAttribute('contenteditable', 'false')
        img.style.display = 'block'
        img.style.maxHeight = '180px'
        img.style.maxWidth = '100%'

        wrapper.appendChild(img)
        range.insertNode(wrapper)

        // Add paragraph after
        const p = document.createElement('div')
        p.setAttribute('data-paragraph', '1')
        p.appendChild(document.createElement('br'))
        wrapper.after(p)

        // Move cursor to new paragraph
        const newRange = document.createRange()
        newRange.selectNodeContents(p)
        newRange.collapse(true)
        sel.removeAllRanges()
        sel.addRange(newRange)

        normalizeInputDOM(el)
        updateForm()
    }, [updateForm])

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

        document.querySelectorAll('[data-chat-window]').forEach((window) => {
            window.classList.add('animate-bounce')
            setTimeout(() => window.classList.remove('animate-bounce'), 1000)
        })

        playSound('wakeup')
    }

    // ==================== POPUP MANAGEMENT ====================
    const handlePopupToggle = useCallback((type: 'emoji' | 'gif' | 'format') => {
        const el = contentEditableRef.current
        if (el) {
            // Save selection but DON'T restore it - let it stay visible
            lastSelectionRef.current = saveSelection(el)
        }

        if (type === 'emoji') {
            setShowEmojis(v => !v)
            setShowGifs(false)
            setShowFormatting(false)
        } else if (type === 'gif') {
            setShowGifs(v => !v)
            setShowEmojis(false)
            setShowFormatting(false)
        } else {
            setShowFormatting(v => !v)
            setShowEmojis(false)
            setShowGifs(false)
        }
        // DON'T mess with focus or selection here
    }, [])

    // Close popups on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (!target.closest('.emoji-container, .gif-container, .format-container, [data-popup-trigger]')) {
                setShowEmojis(false)
                setShowGifs(false)
                setShowFormatting(false)
            }
        }
        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
    }, [])

    // ==================== RENDER ====================
    return (
        <div className="relative z-10" data-chat-bar>
            <style>{EMOJI_INPUT_STYLES}</style>

            {/* Format Helper */}
            <FormatHelper
                isOpen={showFormatting}
                onClose={() => setShowFormatting(false)}
                onFormatSelect={(wrap) => {
                    // Use saved selection if available, otherwise current selection
                    if (lastSelectionRef.current && lastSelectionRef.current.text.length > 0) {
                        const el = contentEditableRef.current
                        if (el) {
                            restoreSelection(el, lastSelectionRef.current)
                        }
                    }
                    applyMarkdown(wrap)
                    setShowFormatting(false)
                }}
            />

            {/* GIF Picker */}
            <GifPicker
                isOpen={showGifs}
                onClose={() => setShowGifs(false)}
                onGifSelect={(url) => {
                    insertGif(url)
                    setShowGifs(false)
                }}
            />

            {/* Emoji Picker */}
            <EmojiPicker
                isOpen={showEmojis}
                onClose={() => setShowEmojis(false)}
                onSelect={(emoji) => {
                    const el = contentEditableRef.current
                    if (!el) return

                    // If we have saved selection with text, replace it
                    if (lastSelectionRef.current && lastSelectionRef.current.text.length > 0) {
                        restoreSelection(el, lastSelectionRef.current)
                        const sel = window.getSelection()
                        if (sel && sel.rangeCount > 0) {
                            const range = sel.getRangeAt(0)
                            range.deleteContents()
                            insertEmoji(el, emoji)
                        }
                    } else {
                        // No selection, just insert at cursor
                        insertEmoji(el, emoji)
                    }

                    updateForm()
                    // DON'T close emoji picker - let it stay open
                }}
            />

            {/* Main Input Bar */}
            <div className={`rounded-[12px] overflow-hidden border ${
                gifLimitHit ? 'gif-limit-hit border-red-300' : 'border-transparent'
            } bg-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]`}>
                <form onSubmit={form.handleSubmit(onSend)} className="flex gap-2 p-3 bg-gradient-to-r from-[#eef3ff] via-[#e6eeff] to-[#eef3ff] items-center">

                    {/* Format/Emoji/GIF Buttons */}
                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            data-popup-trigger
                            onClick={() => handlePopupToggle('format')}
                            onMouseDown={(e) => e.preventDefault()}
                            className="px-2.5 py-1.5 bg-gradient-to-b from-[#f3e6ff] to-[#e6d4ff] border border-[#c09eff] rounded-md text-sm text-[#7c3aed] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-transform hover:-translate-y-[1px]"
                            title="Formatierung"
                        >
                            <Type className="w-4 h-4" strokeWidth={2} />
                        </button>

                        <button
                            type="button"
                            data-popup-trigger
                            onClick={() => handlePopupToggle('emoji')}
                            onMouseDown={(e) => e.preventDefault()}
                            className="px-2.5 py-1.5 bg-gradient-to-b from-[#e6f3ff] to-[#d4e9ff] border border-[#9eb8ff] rounded-md text-sm text-[#0a4bdd] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-transform hover:-translate-y-[1px]"
                            title="Emojis"
                        >
                            <SmilePlus className="w-4 h-4" strokeWidth={2} />
                        </button>

                        <button
                            type="button"
                            data-popup-trigger
                            onClick={() => handlePopupToggle('gif')}
                            onMouseDown={(e) => e.preventDefault()}
                            className="px-2.5 py-1.5 bg-gradient-to-b from-[#e6ffe6] to-[#d4ffd4] border border-[#9eff9e] rounded-md text-sm text-[#0a9e0a] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-transform hover:-translate-y-[1px]"
                            title="GIFs"
                        >
                            <Film className="w-4 h-4" strokeWidth={2} />
                        </button>
                    </div>

                    {/* ContentEditable Input */}
                    <div className="relative flex-1">
                        <div
                            ref={contentEditableRef}
                            contentEditable
                            className="w-full min-h-[96px] max-h-[180px] overflow-y-auto rounded-md border border-[#9eb8ff] bg-white/95 px-3 py-2 pr-12 text-sm text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] focus:outline-none focus:border-[#0a4bdd] focus:ring-2 focus:ring-[#c4d4ff]"
                            onInput={handleInput}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            onBlur={handleBlur}
                            onFocus={handleFocus}
                            data-placeholder="Type a message...  **bold**  _italic_  ~~strike~~  `code`"
                            style={{ lineHeight: '1.5', fontFamily: '"Tahoma", "Verdana", system-ui, sans-serif' }}
                        />

                        {/* Character Counter */}
                        <div className="absolute bottom-2 right-2 text-[10px] text-[#a0b1d9] pointer-events-none select-none">
                            {form.watch('text').length}/{MAX_MESSAGE_LENGTH}
                        </div>
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