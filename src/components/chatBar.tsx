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
import { useTheme } from '@/hooks/useTheme'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
export function ChatBar({ chatLayout = 'classic' }: { chatLayout?: 'classic' | 'modern' }) {
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
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const isModern = chatLayout === 'modern'

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
    if (isModern) {
        // Modern Mode mit shadcn Komponenten
        const cardClass = cn(
            'border overflow-hidden',
            isDark 
                ? 'border-white/[0.04] bg-slate-950/25 shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-[32px] rounded-2xl'
                : 'border-slate-200/80 bg-white/95 shadow-[0_4px_24px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,1)] backdrop-blur-[32px] rounded-2xl',
            gifLimitHit && (isDark ? 'border-orange-500/30' : 'border-red-300/60')
        )

        const inputClass = cn(
            'w-full min-h-[64px] max-h-[180px] overflow-y-auto rounded-xl border px-4 py-3 pr-12 text-sm focus:outline-none md:min-h-[96px] transition-all',
            isDark
                ? 'border-white/[0.08] bg-slate-950/30 text-slate-100 placeholder:text-slate-500 focus:border-blue-400/40 focus:ring-4 focus:ring-blue-400/10'
                : 'border-slate-300/80 bg-white/95 text-slate-900 placeholder:text-slate-400 focus:border-blue-400/60 focus:ring-4 focus:ring-blue-400/10'
        )

        return (
            <div className="relative z-10" data-chat-bar>
                <style>{EMOJI_INPUT_STYLES}</style>

                <FormatHelper
                    isOpen={showFormatting}
                    onClose={() => setShowFormatting(false)}
                    onFormatSelect={(wrap) => {
                        if (lastSelectionRef.current && lastSelectionRef.current.text.length > 0) {
                            const el = contentEditableRef.current
                            if (el) restoreSelection(el, lastSelectionRef.current)
                        }
                        applyMarkdown(wrap)
                        setShowFormatting(false)
                    }}
                />

                <GifPicker
                    isOpen={showGifs}
                    onClose={() => setShowGifs(false)}
                    onGifSelect={(url) => {
                        insertGif(url)
                        setShowGifs(false)
                    }}
                />

                <EmojiPicker
                    isOpen={showEmojis}
                    onClose={() => setShowEmojis(false)}
                    onSelect={(emoji) => {
                        const el = contentEditableRef.current
                        if (!el) return
                        if (lastSelectionRef.current && lastSelectionRef.current.text.length > 0) {
                            restoreSelection(el, lastSelectionRef.current)
                            const sel = window.getSelection()
                            if (sel && sel.rangeCount > 0) {
                                const range = sel.getRangeAt(0)
                                range.deleteContents()
                                insertEmoji(el, emoji)
                            }
                        } else {
                            insertEmoji(el, emoji)
                        }
                        updateForm()
                    }}
                />

                <Card className={cardClass}>
                    <CardContent className="p-4">
                        <form onSubmit={form.handleSubmit(onSend)} className="flex flex-col gap-3 md:flex-row md:items-start md:gap-3">
                            {/* Toolbar */}
                            <div className="flex gap-2 md:flex-col">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    data-popup-trigger
                                    onClick={() => handlePopupToggle('format')}
                                    onMouseDown={(e) => e.preventDefault()}
                                    className={cn(
                                        'rounded-xl transition-all border-2',
                                        isDark
                                            ? 'border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20'
                                            : 'border-purple-300/50 bg-purple-50/80 hover:bg-purple-100'
                                    )}
                                    title="Formatierung"
                                >
                                    <Type className={cn('w-4 h-4', isDark ? 'text-purple-300' : 'text-purple-700')} strokeWidth={2} />
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    data-popup-trigger
                                    onClick={() => handlePopupToggle('emoji')}
                                    onMouseDown={(e) => e.preventDefault()}
                                    className={cn(
                                        'rounded-xl transition-all border-2',
                                        isDark
                                            ? 'border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20'
                                            : 'border-blue-300/50 bg-blue-50/80 hover:bg-blue-100'
                                    )}
                                    title="Emojis"
                                >
                                    <SmilePlus className={cn('w-4 h-4', isDark ? 'text-blue-300' : 'text-blue-700')} strokeWidth={2} />
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    data-popup-trigger
                                    onClick={() => handlePopupToggle('gif')}
                                    onMouseDown={(e) => e.preventDefault()}
                                    className={cn(
                                        'rounded-xl transition-all border-2',
                                        isDark
                                            ? 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20'
                                            : 'border-emerald-300/50 bg-emerald-50/80 hover:bg-emerald-100'
                                    )}
                                    title="GIFs"
                                >
                                    <Film className={cn('w-4 h-4', isDark ? 'text-emerald-300' : 'text-emerald-700')} strokeWidth={2} />
                                </Button>
                            </div>

                            {/* Input */}
                            <div className="relative flex-1">
                                <div
                                    ref={contentEditableRef}
                                    contentEditable
                                    className={inputClass}
                                    onInput={handleInput}
                                    onKeyDown={handleKeyDown}
                                    onPaste={handlePaste}
                                    onBlur={handleBlur}
                                    onFocus={handleFocus}
                                    data-placeholder="Type a message...  **bold**  _italic_  ~~strike~~  `code`"
                                    style={{ lineHeight: '1.5', fontFamily: '"Tahoma", "Verdana", system-ui, sans-serif' }}
                                />
                                <div className={cn(
                                    'absolute bottom-3 right-3 text-[10px] pointer-events-none select-none',
                                    isDark ? 'text-slate-500' : 'text-slate-400'
                                )}>
                                    {form.watch('text').length}/{MAX_MESSAGE_LENGTH}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 md:flex-col">
                                <Button
                                    type="submit"
                                    size="default"
                                    className={cn(
                                        'flex-1 md:flex-none gap-2 rounded-xl transition-all shadow-lg',
                                        isDark
                                            ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500/50'
                                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                                    )}
                                >
                                    <Send className="w-4 h-4" strokeWidth={2} />
                                    <span className="font-semibold">Send</span>
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="default"
                                    onClick={sendWakeUp}
                                    className={cn(
                                        'flex-1 md:flex-none gap-1.5 rounded-xl transition-all border-2',
                                        isDark
                                            ? 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20'
                                            : 'border-amber-300/60 bg-amber-50/80 hover:bg-amber-100'
                                    )}
                                    title="Wecke alle auf!"
                                >
                                    <Zap className={cn('w-3.5 h-3.5', isDark ? 'text-amber-300' : 'text-amber-700')} strokeWidth={2.5} />
                                    <span className={cn('font-bold text-xs', isDark ? 'text-amber-300' : 'text-amber-700')}>Wake up!</span>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Classic Mode (Original Code)
    const shellBorderClass = gifLimitHit
        ? isDark ? 'gif-limit-hit border-[#fb923c]' : 'gif-limit-hit border-red-300'
        : isDark ? 'border-[#1d3a7a]' : 'border-[#7a96df]'

    const shellClass = `overflow-hidden rounded-[14px] border ${shellBorderClass} ${isDark ? 'bg-[#0f172a]/95 shadow-[0_12px_24px_rgba(8,47,73,0.4)]' : 'bg-white/95 shadow-[0_6px_18px_rgba(58,92,173,0.12)]'}`

    const formClass = isDark
        ? 'flex flex-col gap-3 p-3 sm:p-4 md:flex-row md:items-start md:gap-3 bg-gradient-to-r from-[#111c3a] via-[#0f172a] to-[#111c3a]'
        : 'flex flex-col gap-3 p-3 sm:p-4 md:flex-row md:items-start md:gap-3 bg-gradient-to-r from-[#eef3ff] via-[#e6eeff] to-[#eef3ff]'

    const formatBtnClass = isDark
        ? 'px-2.5 py-1.5 bg-gradient-to-b from-[#241f4f] to-[#1c163f] border border-[#4c3ab8] rounded-md text-sm text-[#c4b5fd] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-transform hover:-translate-y-[1px]'
        : 'px-2.5 py-1.5 bg-gradient-to-b from-[#f3e6ff] to-[#e6d4ff] border border-[#c09eff] rounded-md text-sm text-[#7c3aed] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-transform hover:-translate-y-[1px]'

    const emojiBtnClass = isDark
        ? 'px-2.5 py-1.5 bg-gradient-to-b from-[#1a2a50] to-[#14203d] border border-[#1d4ed8] rounded-md text-sm text-[#bfdbfe] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-transform hover:-translate-y-[1px]'
        : 'px-2.5 py-1.5 bg-gradient-to-b from-[#e6f3ff] to-[#d4e9ff] border border-[#9eb8ff] rounded-md text-sm text-[#0a4bdd] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-transform hover:-translate-y-[1px]'

    const gifBtnClass = isDark
        ? 'px-2.5 py-1.5 bg-gradient-to-b from-[#1c3524] to-[#142418] border border-[#2dd4bf] rounded-md text-sm text-[#5eead4] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-transform hover:-translate-y-[1px]'
        : 'px-2.5 py-1.5 bg-gradient-to-b from-[#e6ffe6] to-[#d4ffd4] border border-[#9eff9e] rounded-md text-sm text-[#0a9e0a] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-transform hover:-translate-y-[1px]'

    const inputClass = isDark
        ? 'w-full min-h-[64px] max-h-[180px] overflow-y-auto rounded-md border border-[#1d3a7a] bg-[#0b1225] px-3 py-2 pr-12 text-sm text-[#bfdbfe] shadow-[inset_0_1px_0_rgba(148,163,184,0.15)] focus:outline-none focus:border-[#60a5fa] focus:ring-2 focus:ring-[#1d4ed8] md:min-h-[96px]'
        : 'w-full min-h-[64px] max-h-[180px] overflow-y-auto rounded-md border border-[#9eb8ff] bg-white/95 px-3 py-2 pr-12 text-sm text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] focus:outline-none focus:border-[#0a4bdd] focus:ring-2 focus:ring-[#c4d4ff] md:min-h-[96px]'

    const counterClass = isDark ? 'absolute bottom-2 right-2 text-[10px] text-[#647bb0] pointer-events-none select-none' : 'absolute bottom-2 right-2 text-[10px] text-[#a0b1d9] pointer-events-none select-none'

    const sendButtonClass = isDark
        ? 'flex w-full items-center justify-center gap-1.5 rounded-md border border-[#1e3a8a] bg-gradient-to-b from-[#1d4ed8] to-[#1e3a8a] px-4 py-2 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_4px_rgba(2,6,23,0.4)] transition-all hover:-translate-y-[1px] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_10px_rgba(2,6,23,0.45)] md:w-auto'
        : 'flex w-full items-center justify-center gap-1.5 rounded-md border border-[#0036b3] bg-gradient-to-b from-[#0a4bdd] to-[#0840c7] px-4 py-2 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_4px_rgba(0,0,0,0.15)] transition-all hover:-translate-y-[1px] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_8px_rgba(0,0,0,0.2)] md:w-auto'

    const wakeButtonClass = isDark
        ? 'flex w-full items-center justify-center gap-1 rounded-md border border-[#f97316] bg-gradient-to-b from-[#1f2937] to-[#111827] px-3 py-1.5 text-xs font-semibold text-[#fbbf24] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-transform hover:-translate-y-[1px] md:w-auto'
        : 'flex w-full items-center justify-center gap-1 rounded-md border border-[#ffb366] bg-gradient-to-b from-white to-[#fff3e0] px-3 py-1.5 text-xs font-semibold text-[#ff6b00] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-[1px] md:w-auto'

    const toolbarContainerClass = 'flex flex-wrap gap-2 md:flex-col md:gap-2'

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
            <div className={shellClass}>
                <form
                    onSubmit={form.handleSubmit(onSend)}
                    className={formClass}
                >

                    {/* Format/Emoji/GIF Buttons */}
                    <div className={toolbarContainerClass}>
                        <button
                            type="button"
                            data-popup-trigger
                            onClick={() => handlePopupToggle('format')}
                            onMouseDown={(e) => e.preventDefault()}
                            className={formatBtnClass}
                            title="Formatierung"
                        >
                            <Type className="w-4 h-4" strokeWidth={2} />
                        </button>

                        <button
                            type="button"
                            data-popup-trigger
                            onClick={() => handlePopupToggle('emoji')}
                            onMouseDown={(e) => e.preventDefault()}
                            className={emojiBtnClass}
                            title="Emojis"
                        >
                            <SmilePlus className="w-4 h-4" strokeWidth={2} />
                        </button>

                        <button
                            type="button"
                            data-popup-trigger
                            onClick={() => handlePopupToggle('gif')}
                            onMouseDown={(e) => e.preventDefault()}
                            className={gifBtnClass}
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
                            className={inputClass}
                            onInput={handleInput}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            onBlur={handleBlur}
                            onFocus={handleFocus}
                            data-placeholder="Type a message...  **bold**  _italic_  ~~strike~~  `code`"
                            style={{ lineHeight: '1.5', fontFamily: '"Tahoma", "Verdana", system-ui, sans-serif' }}
                        />

                        {/* Character Counter */}
                        <div className={counterClass}>
                            {form.watch('text').length}/{MAX_MESSAGE_LENGTH}
                        </div>
                    </div>

                    {/* Send & Wake Up Buttons */}
                    <div className="flex gap-2 md:flex-col md:gap-2 md:w-auto w-full">
                        <button
                            type="submit"
                            className={sendButtonClass}
                        >
                            <Send className="w-4 h-4" strokeWidth={2} />
                            <span>Send</span>
                        </button>

                        <button
                            type="button"
                            onClick={sendWakeUp}
                            className={wakeButtonClass}
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
