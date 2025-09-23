import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { db, auth } from '@/lib/firebase'
import React, { useState, useRef, useEffect, useCallback, JSX } from 'react'
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
import emojiRegex from 'emoji-regex'
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
        syntax: '_text_',
        example: 'italic text',
        icon: <Italic className="w-3 h-3" strokeWidth={2.5} />,
        wrap: ['_', '_']
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
        wrap: ['> ', ''] // Prefix-only
    },
    {
        name: 'Liste',
        syntax: '- item',
        example: 'Listeneintrag',
        icon: <List className="w-3 h-3" strokeWidth={2.5} />,
        wrap: ['- ', ''] // Prefix-only
    }
]

// ==================== CONSTANTS/CLASSES ====================
const EMOJI_SPAN_CLASS = 'ce-emoji'
const GIF_CLASS = 'ce-gif'
const GIF_BLOCK_CLASS = 'ce-gif-block' // Wrapper block um GIF
const MAX_GIF_PER_MESSAGE = 1

// ==================== EDITOR NORMALIZATION (EMOJI & GIF) ====================
function isEmojiTextNode(node: Node) {
    if (node.nodeType !== Node.TEXT_NODE) return false
    const text = node.textContent || ''
    const regex = emojiRegex()
    return regex.test(text)
}

function wrapEmojisInNode(root: HTMLElement) {
    // 0) Vorhandene Emoji-Spans entfernen (idempotent halten)
    const old = root.querySelectorAll(`span.${EMOJI_SPAN_CLASS}`)
    old.forEach((span) => {
        const parent = span.parentNode
        if (!parent) return
        // ersetze <span>🙂</span> durch reinen Text
        parent.replaceChild(document.createTextNode(span.textContent || ''), span)
    })

    // 1) Alle Textknoten ablaufen und Emojis wrappen
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
    const targets: Text[] = []
    let n: Node | null
    while ((n = walker.nextNode())) {
        // ignoriere Text, der in nicht-editierbaren Blöcken liegt (z. B. GIF-Wrapper)
        const el = (n.parentElement as HTMLElement) || null
        if (el?.closest?.(`.${GIF_BLOCK_CLASS}`)) continue
        if (isEmojiTextNode(n)) targets.push(n as Text)
    }

    const regex = emojiRegex()
    for (const textNode of targets) {
        const parent = textNode.parentElement
        if (!parent) continue
        const text = textNode.textContent || ''
        if (!regex.test(text)) continue

        const frag = document.createDocumentFragment()
        let last = 0
        for (const match of text.matchAll(regex)) {
            const m = match[0]
            const i = match.index ?? 0
            if (i > last) frag.appendChild(document.createTextNode(text.slice(last, i)))
            const span = document.createElement('span')
            span.className = EMOJI_SPAN_CLASS
            span.textContent = m
            frag.appendChild(span)
            last = i + m.length
        }
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)))
        parent.replaceChild(frag, textNode)
    }
}

/**
 * Stellt sicher, dass jedes GIF:
 * - in einem Block-Wrapper liegt (display:block)
 * - block-level dargestellt wird (kein Text daneben)
 * - einen Absatz (leere DIV) darunter hat, damit man NUR darunter tippt
 */
function normalizeGifImages(root: HTMLElement) {
    // 1) Find/ensure block wrappers
    const imgs = Array.from(root.querySelectorAll(`img.${GIF_CLASS}, img[data-gif]`)) as HTMLImageElement[]

    imgs.forEach((img) => {
        img.dataset.gif = '1'
        img.classList.add(GIF_CLASS)
        img.setAttribute('contenteditable', 'false')
        img.style.display = 'block'
        img.style.verticalAlign = 'baseline'
        img.style.maxHeight = '180px'
        img.style.maxWidth = '100%'

        let wrapper = img.closest(`.${GIF_BLOCK_CLASS}`) as HTMLDivElement | null
        if (!wrapper) {
            wrapper = document.createElement('div')
            wrapper.className = GIF_BLOCK_CLASS
            wrapper.contentEditable = 'false' // Block selbst nicht editierbar, nur der Absatz danach
            wrapper.style.display = 'block'
            wrapper.style.margin = '6px 0'
            img.parentElement?.insertBefore(wrapper, img)
            wrapper.appendChild(img)
        }

        // 2) Ensure there is a following editable paragraph
        const after = wrapper.nextSibling
        const needParagraph =
            !after ||
            !(
                (after as HTMLElement).nodeType === Node.ELEMENT_NODE &&
                (after as HTMLElement).tagName === 'DIV' &&
                (after as HTMLElement).getAttribute('data-paragraph') === '1'
            )

        if (needParagraph) {
            const p = document.createElement('div')
            p.setAttribute('data-paragraph', '1')
            p.appendChild(document.createElement('br')) // sichtbarer Cursor-Platz
            wrapper.parentElement?.insertBefore(p, wrapper.nextSibling)
        }
    })
}

function normalizeInputDOM(root: HTMLElement) {
    wrapEmojisInNode(root)
    normalizeGifImages(root)
}

// ==================== SERIALIZATION: DOM -> MARKDOWN ====================
/**
 * Serialisiert den contentEditable-DOM zu Markdown:
 * - GIF-Block:  <div.ce-gif-block><img data-gif src="..."></div>  →  ![](url)
 * - Emoji-Spans: <span.ce-emoji>🙂</span>  →  🙂 (Text)
 * - Text inkl. Markdown-Tokens (** _ ~~ `) bleibt unverändert
 * - Absatztrenner (DIV) / <br> → \n
 */
function serializeToMarkdown(root: HTMLElement): string {
    let out = ''

    function walk(node: Node) {
        if (node.nodeType === Node.TEXT_NODE) {
            out += node.textContent || ''
            return
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement

            // GIF-Block
            if (el.classList.contains(GIF_BLOCK_CLASS)) {
                const img = el.querySelector('img') as HTMLImageElement | null
                if (img && img.dataset.gif && img.src) {
                    out += `![](${img.src})\n`
                }
                return
            }

            // Inline GIF (falls Wrapper fehlt – sollte per normalize behoben sein)
            if (el.tagName === 'IMG' && (el as HTMLImageElement).dataset.gif && (el as HTMLImageElement).src) {
                const src = (el as HTMLImageElement).src
                out += `![](${src})\n`
                return
            }

            // Emoji-Span -> plain
            if (el.classList.contains(EMOJI_SPAN_CLASS)) {
                out += el.textContent || ''
                return
            }

            if (el.tagName === 'BR') {
                out += '\n'
                return
            }

            // Standard Absatz (unser Tipp-Bereich)
            if (el.tagName === 'DIV' && el.getAttribute('data-paragraph') === '1') {
                // children traversen, danach Absatzumbruch
                el.childNodes.forEach(walk)
                out += '\n'
                return
            }

            // Default: traversiere
            el.childNodes.forEach(walk)

            if (/^(DIV|P)$/.test(el.tagName)) {
                out += '\n'
            }
        }
    }

    root.childNodes.forEach(walk)

    return out.replace(/\u00A0/g, ' ').replace(/\n{3,}/g, '\n\n').trimEnd()
}

// ==================== SELECTION HELPERS ====================
const lastSelection = { current: null as null | { start: number; end: number; text: string } }

function saveSelection(element: HTMLElement) {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)

    const pre = range.cloneRange()
    pre.selectNodeContents(element)
    pre.setEnd(range.startContainer, range.startOffset)

    const start = pre.toString().length
    const selectedText = range.toString()
    const end = start + selectedText.length

    lastSelection.current = { start, end, text: selectedText }
}

function restoreSelection(element: HTMLElement, selectText = false) {
    if (!element || !lastSelection.current) return

    const { start, end } = lastSelection.current
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null)

    let currentPos = 0
    let startNode: Node | null = null
    let startOffset = 0
    let endNode: Node | null = null
    let endOffset = 0

    let node: Node | null
    while ((node = walker.nextNode())) {
        const len = node.textContent?.length || 0

        if (!startNode && currentPos + len >= start) {
            startNode = node
            startOffset = start - currentPos
        }
        if (!endNode && currentPos + len >= end) {
            endNode = node
            endOffset = end - currentPos
            break
        }
        currentPos += len
    }

    if (startNode) {
        const range = document.createRange()
        const sel = window.getSelection()
        range.setStart(startNode, Math.min(startOffset, startNode.textContent?.length || 0))
        if (selectText && endNode && start !== end) {
            range.setEnd(endNode, Math.min(endOffset, endNode.textContent?.length || 0))
        } else {
            range.collapse(true)
        }
        sel?.removeAllRanges()
        sel?.addRange(range)
    }
}

// ==================== WRAP & INSERT HELPERS ====================
type WrapPair = [string, string]
const WRAPS: Record<'bold' | 'italic' | 'strike' | 'code', WrapPair> = {
    bold: ['**', '**'],
    italic: ['_', '_'],
    strike: ['~~', '~~'],
    code: ['`', '`']
}

function toggleWrap(text: string, [L, R]: WrapPair) {
    const starts = text.startsWith(L)
    const ends = R ? text.endsWith(R) : false
    if (starts && ends) return text.slice(L.length, text.length - R.length)
    return L + text + R
}

function insertAtCursor(editor: HTMLElement, text: string) {
    editor.focus()
    if (lastSelection.current) restoreSelection(editor, false)

    const sel = window.getSelection()
    if (!sel) return

    let range: Range
    if (sel.rangeCount === 0) {
        range = document.createRange()
        range.selectNodeContents(editor)
        range.collapse(false)
        sel.addRange(range)
    } else {
        range = sel.getRangeAt(0)
    }

    // Falls Range im GIF-Block steckt, Cursor NACH den Block verschieben
    const gifBlock = (range.startContainer as HTMLElement).closest?.(`.${GIF_BLOCK_CLASS}`)
    if (gifBlock && gifBlock.parentElement) {
        const after = gifBlock.nextSibling
        if (after && (after as HTMLElement).getAttribute?.('data-paragraph') === '1') {
            const p = after as HTMLElement
            const r = document.createRange()
            r.selectNodeContents(p)
            r.collapse(true)
            sel.removeAllRanges()
            sel.addRange(r)
            range = r
        }
    }

    range.deleteContents()
    const textNode = document.createTextNode(text)
    range.insertNode(textNode)

    range.setStartAfter(textNode)
    range.setEndAfter(textNode)
    sel.removeAllRanges()
    sel.addRange(range)
}

function applyMarkdownAroundSelection(editor: HTMLElement, wrap: WrapPair) {
    editor.focus()
    saveSelection(editor)

    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) {
        // Kein Text ausgewählt → Token an Cursor
        insertAtCursor(editor, wrap[0] + wrap[1])
        normalizeInputDOM(editor)
        return
    }

    let range = sel.getRangeAt(0)

    // Falls Range im GIF-Block liegt, Cursor in Absatz NACH dem Block verschieben
    const container = range.startContainer as HTMLElement
    const gifBlock = container.nodeType === 1 ? (container as HTMLElement).closest?.(`.${GIF_BLOCK_CLASS}`) : null
    if (gifBlock && gifBlock.parentElement) {
        const after = gifBlock.nextSibling
        if (after && (after as HTMLElement).getAttribute?.('data-paragraph') === '1') {
            const p = after as HTMLElement
            const r = document.createRange()
            r.selectNodeContents(p)
            r.collapse(true)
            sel.removeAllRanges()
            sel.addRange(r)
            range = r
        }
    }

    const selected = range.toString()

    // Prefix-only (Quote/Liste)
    if (wrap[1] === '') {
        const replacement = selected
            .split(/\n/)
            .map((line) => (line.startsWith(wrap[0]) ? line.replace(new RegExp('^' + escapeRegExp(wrap[0])), '') : wrap[0] + line))
            .join('\n')

        range.deleteContents()
        const textNode = document.createTextNode(replacement)
        range.insertNode(textNode)

        const newRange = document.createRange()
        const sel2 = window.getSelection()
        newRange.setStart(textNode, 0)
        newRange.setEnd(textNode, textNode.length)
        sel2?.removeAllRanges()
        sel2?.addRange(newRange)

        normalizeInputDOM(editor)
        saveSelection(editor)
        return
    }

    // Paare: toggle + kombinierbar
    const replacement = toggleWrap(selected, wrap)
    range.deleteContents()
    const textNode = document.createTextNode(replacement)
    range.insertNode(textNode)

    const newRange = document.createRange()
    const sel2 = window.getSelection()
    const startOffset = replacement.startsWith(wrap[0]) ? wrap[0].length : 0
    const endOffset = replacement.endsWith(wrap[1]) ? replacement.length - wrap[1].length : replacement.length
    newRange.setStart(textNode, startOffset)
    newRange.setEnd(textNode, endOffset)
    sel2?.removeAllRanges()
    sel2?.addRange(newRange)

    normalizeInputDOM(editor)
    saveSelection(editor)
}

function escapeRegExp(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ==================== MAIN COMPONENT ====================
export function ChatBar() {
    // Form handling (nur für Validation/Counter)
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

    // ==================== HELPERS ====================
    const playSound = useCallback((sound: 'sent' | 'wakeup') => {
        const isMuted = localStorage.getItem('soundsMuted') === 'true'
        if (!isMuted) sounds[sound].play()
    }, [])

    function getCurrentParagraph(el: HTMLElement): HTMLElement | null {
        const sel = window.getSelection()
        if (!sel || sel.rangeCount === 0) return null
        let node: Node = sel.getRangeAt(0).startContainer
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode as Node
        const block = (node as HTMLElement).closest?.('[data-paragraph="1"]') as HTMLElement | null
        return block
    }

    function caretAtParagraphStart(paragraph: HTMLElement): boolean {
        const sel = window.getSelection()
        if (!sel || sel.rangeCount === 0) return false
        const r = sel.getRangeAt(0).cloneRange()
        const pre = document.createRange()
        pre.selectNodeContents(paragraph)
        pre.setEnd(r.startContainer, r.startOffset)
        const textBefore = pre.toString().replace(/\u200B/g, '')
        // „leer“: br/whitespace → Start
        return textBefore.trim().length === 0
    }

    function caretAtParagraphEnd(paragraph: HTMLElement): boolean {
        const sel = window.getSelection()
        if (!sel || sel.rangeCount === 0) return false
        const r = sel.getRangeAt(0).cloneRange()
        const post = document.createRange()
        post.selectNodeContents(paragraph)
        post.setStart(r.endContainer, r.endOffset)
        const textAfter = post.toString().replace(/\u200B/g, '')
        return textAfter.trim().length === 0
    }

    function setCaretAtParagraphStart(p: HTMLElement) {
        const sel = window.getSelection()
        const r = document.createRange()
        // wenn leer -> BR sicherstellen
        if (!p.firstChild) p.appendChild(document.createElement('br'))
        r.setStart(p, 0)
        r.collapse(true)
        sel?.removeAllRanges()
        sel?.addRange(r)
    }


    // Initial DOM-Normalisierung
    useEffect(() => {
        const el = contentEditableRef.current
        if (!el) return
        normalizeInputDOM(el)
        // Stelle sicher, dass mindestens EIN Absatz existiert
        if (el.childNodes.length === 0) {
            const p = document.createElement('div')
            p.setAttribute('data-paragraph', '1')
            p.appendChild(document.createElement('br'))
            el.appendChild(p)
        }
    }, [])

    useEffect(() => {
        const el = contentEditableRef.current
        if (!el) return

        let pending = false
        const obs = new MutationObserver(() => {
            if (pending) return
            pending = true
            queueMicrotask(() => {
                const saved = window.getSelection()?.rangeCount ? window.getSelection()!.getRangeAt(0).cloneRange() : null
                normalizeInputDOM(el)
                // Selektion bestmöglich wiederherstellen (sanft; kein harter reposition)
                if (saved) {
                    const sel = window.getSelection()
                    sel?.removeAllRanges()
                    sel?.addRange(saved)
                }
                pending = false
            })
        })

        obs.observe(el, {
            childList: true,
            characterData: true,
            subtree: true
        })

        return () => obs.disconnect()
    }, [])


    const handleInput = useCallback(() => {
        const el = contentEditableRef.current
        if (!el) return
        saveSelection(el)
        normalizeInputDOM(el)
        const markdown = serializeToMarkdown(el)
        form.setValue('text', markdown, { shouldValidate: false, shouldDirty: true })
        restoreSelection(el, false)
    }, [form])

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        const el = contentEditableRef.current
        if (!el) return

        // --- GIF Löschen: Backspace am Absatzanfang -> löscht vorherigen GIF-Block ---
        if (e.key === 'Backspace') {
            const p = getCurrentParagraph(el)
            if (p && caretAtParagraphStart(p)) {
                const prev = p.previousSibling as HTMLElement | null
                if (prev && prev.classList?.contains(GIF_BLOCK_CLASS)) {
                    e.preventDefault()
                    // GIF-Block entfernen
                    prev.remove()
                    // Falls Absatz leer war und darüber noch ein Absatz existiert, bleiben wir in diesem Absatz
                    // Cursor am Anfang halten
                    setCaretAtParagraphStart(p)
                    // state/markdown aktualisieren
                    normalizeInputDOM(el)
                    const md = serializeToMarkdown(el)
                    form.setValue('text', md, { shouldValidate: false, shouldDirty: true })
                    return
                }
            }
        }

        // --- GIF Löschen: Delete am Absatzende -> löscht nächsten GIF-Block ---
        if (e.key === 'Delete') {
            const p = getCurrentParagraph(el)
            if (p && caretAtParagraphEnd(p)) {
                const next = p.nextSibling as HTMLElement | null
                if (next && next.classList?.contains(GIF_BLOCK_CLASS)) {
                    e.preventDefault()
                    next.remove()
                    setCaretAtParagraphStart(p) // am Absatz bleiben
                    normalizeInputDOM(el)
                    const md = serializeToMarkdown(el)
                    form.setValue('text', md, { shouldValidate: false, shouldDirty: true })
                    return
                }
            }
        }

        // --- (dein vorhandener Code geht hier weiter) ---
        // Enter ohne Shift -> senden
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSend()
            return
        }
        const meta = e.ctrlKey || e.metaKey
        if (meta) {
            const k = e.key.toLowerCase()
            if (k === 'b') { e.preventDefault(); applyMarkdownAroundSelection(el, WRAPS.bold) }
            else if (k === 'i') { e.preventDefault(); applyMarkdownAroundSelection(el, WRAPS.italic) }
            else if (k === 's') { e.preventDefault(); applyMarkdownAroundSelection(el, WRAPS.strike) }
            else if (k === 'e') { e.preventDefault(); applyMarkdownAroundSelection(el, WRAPS.code) }
        }
    }, [form /* + evtl. weitere deps */])



    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        // Nur Plain-Text einfügen
        e.preventDefault()
        const el = contentEditableRef.current
        if (!el) return
        const text = e.clipboardData.getData('text/plain')
        insertAtCursor(el, text)
        normalizeInputDOM(el)
        const md = serializeToMarkdown(el)
        form.setValue('text', md, { shouldValidate: false, shouldDirty: true })
    }, [form])

    const handlePopupToggle = useCallback((type: 'emoji' | 'gif' | 'format') => {
        const el = contentEditableRef.current
        if (el) saveSelection(el)

        if (type === 'emoji') {
            setShowEmojis((v) => !v)
            setShowGifs(false)
            setShowFormatting(false)
        } else if (type === 'gif') {
            setShowGifs((v) => !v)
            setShowEmojis(false)
            setShowFormatting(false)
        } else {
            setShowFormatting((v) => !v)
            setShowEmojis(false)
            setShowGifs(false)
        }

        setTimeout(() => {
            el?.focus()
            if (el) restoreSelection(el, true)
        }, 10)
    }, [])

    // GIF inline einfügen (max. 1)
    const insertGifAtCursor = useCallback((url: string, alt = 'gif') => {
        const el = contentEditableRef.current
        if (!el) return

        // Limit prüfen
        const currentGifs = el.querySelectorAll(`img.${GIF_CLASS}, img[data-gif]`).length
        if (currentGifs >= MAX_GIF_PER_MESSAGE) {
            setGifLimitHit(true)
            setTimeout(() => setGifLimitHit(false), 1200)
            return
        }

        el.focus()
        if (lastSelection.current) restoreSelection(el, false)

        const sel = window.getSelection()
        if (!sel) return

        // Cursor/Range ermitteln (am Ende, falls none)
        let range: Range
        if (sel.rangeCount === 0) {
            range = document.createRange()
            range.selectNodeContents(el)
            range.collapse(false)
            sel.addRange(range)
        } else {
            range = sel.getRangeAt(0)
        }

        // GIF-BLOCK + Absatz darunter erzeugen
        const wrapper = document.createElement('div')
        wrapper.className = GIF_BLOCK_CLASS
        wrapper.contentEditable = 'false'
        wrapper.style.display = 'block'
        wrapper.style.margin = '6px 0'

        const img = document.createElement('img')
        img.src = url
        img.alt = alt
        img.dataset.gif = '1'
        img.className = GIF_CLASS
        img.setAttribute('contenteditable', 'false')
        img.style.display = 'block'
        img.style.maxHeight = '180px'
        img.style.maxWidth = '100%'

        wrapper.appendChild(img)

        range.insertNode(wrapper)

        // Absatz danach
        const p = document.createElement('div')
        p.setAttribute('data-paragraph', '1')
        p.appendChild(document.createElement('br'))
        wrapper.after(p)

        // Cursor in den neuen Absatz setzen
        const newRange = document.createRange()
        newRange.selectNodeContents(p)
        newRange.collapse(true)
        sel.removeAllRanges()
        sel.addRange(newRange)

        normalizeInputDOM(el)
        const md = serializeToMarkdown(el)
        form.setValue('text', md, { shouldValidate: false, shouldDirty: true })
    }, [form])

    // ==================== MESSAGE HANDLING ====================
    const onSend = form.handleSubmit(async () => {
        const el = contentEditableRef.current
        if (!el || !auth.currentUser) return

        const markdown = serializeToMarkdown(el)
        if (!markdown.trim()) return

        const parse = messageSchema.safeParse({ text: markdown })
        if (!parse.success) return

        const nickname =
            auth.currentUser.displayName ||
            auth.currentUser.email?.split('@')[0] ||
            'Gast_' + auth.currentUser.uid.slice(0, 4)

        await addDoc(collection(db, 'rooms', 'global', 'messages'), {
            text: markdown.trim(), // rohes Markdown
            userId: auth.currentUser.uid,
            nickname,
            createdAt: serverTimestamp(),
            type: 'message'
        })

        // Reset
        form.reset()
        if (el) {
            el.innerHTML = ''
            // neuen Absatz einsetzen
            const p = document.createElement('div')
            p.setAttribute('data-paragraph', '1')
            p.appendChild(document.createElement('br'))
            el.appendChild(p)
        }
        lastSelection.current = null

        playSound('sent')
    })

    const sendWakeUp = async () => {
        if (!auth.currentUser) return

        const nickname =
            auth.currentUser.displayName ||
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

    // ==================== EFFECTS ====================
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (
                !target.closest('.emoji-container') &&
                !target.closest('.gif-container') &&
                !target.closest('.format-container') &&
                !target.closest('[data-popup-trigger]')
            ) {
                setShowEmojis(false)
                setShowGifs(false)
                setShowFormatting(false)
            }
        }
        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
    }, [])

    useEffect(() => {
        if (showEmojis || showGifs || showFormatting) {
            const interval = setInterval(() => {
                if (document.activeElement !== contentEditableRef.current) {
                    contentEditableRef.current?.focus()
                    const el = contentEditableRef.current
                    if (el) restoreSelection(el, true)
                }
            }, 100)
            return () => clearInterval(interval)
        }
    }, [showEmojis, showGifs, showFormatting])

    // ==================== RENDER HELPERS ====================
    const renderFormatExample = (example: string, format: FormatOption) => {
        const styleMap: Record<string, JSX.Element> = {
            Bold: <strong>{example}</strong>,
            Italic: <em>{example}</em>,
            Durchgestrichen: <span style={{ textDecoration: 'line-through' }}>{example}</span>,
            Code: <code className="bg-gray-100 px-1 rounded">{example}</code>,
            Quote: <span className="border-l-2 border-gray-400 pl-2">{example}</span>,
            Liste: <span>• {example}</span>
        }
        return styleMap[format.name] || <span>{example}</span>
    }

    // ==================== MAIN RENDER ====================
    return (
        <div className="relative z-10" data-chat-bar>
            <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #6c83ca;
          pointer-events: none;
          display: block;
          position: absolute;
        }
        /* Emojis im Input deutlich grösser (≈2x-2.2x) */
        .${EMOJI_SPAN_CLASS} {
          display: inline-block;
          line-height: 1;
          font-size: 2.2em;           /* <- vergrössert */
          vertical-align: -0.2em;
        }
        /* GIF als Blockelement, kein Text daneben */
        .${GIF_BLOCK_CLASS} {
          display: block;
          margin: 6px 0;
        }
        img.${GIF_CLASS} {
          display: block !important;
          max-height: 180px;
          max-width: 100%;
          border-radius: 0.5rem;
        }
        /* Absatz unter GIF für Cursor */
        [data-paragraph="1"] {
          min-height: 1.2em;
        }
        /* kleines Feedback, wenn GIF-Limit erreicht */
        .gif-limit-hit {
          animation: pulse-red 0.5s ease-in-out 2;
        }
        @keyframes pulse-red {
          0% { box-shadow: 0 0 0 0 rgba(255,0,64,0.0); }
          50% { box-shadow: 0 0 0 3px rgba(255, 64, 64, 0.35); }
          100% { box-shadow: 0 0 0 0 rgba(255,0,64,0.0); }
        }
      `}</style>

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

                    <div className="text-xs font-semibold text-[#0a4bdd] mb-3">Formatierungs-Legende</div>

                    <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                        {formatOptions.map((format, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[#0a4bdd]">{format.syntax}</code>
                                <ArrowBigRightDash className="w-3 h-3 text-gray-400" strokeWidth={2} />
                                <span className="flex-1">{renderFormatExample(format.example, format)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-[#c7d9ff] pt-2">
                        <div className="text-[10px] text-gray-500 mb-1">Markiere Text und klicke:</div>
                        <div className="flex gap-1">
                            {formatOptions.map((format, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                        const el = contentEditableRef.current
                                        if (!el) return
                                        applyMarkdownAroundSelection(el, format.wrap)
                                    }}
                                    onMouseDown={(e) => e.preventDefault()}
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
                                onGifClick={(gif: any) => {
                                    const gifUrl =
                                        gif.url ||
                                        gif.media_formats?.gif?.url ||
                                        gif.media?.[0]?.gif?.url ||
                                        gif.media_formats?.mediumgif?.url ||
                                        gif.media?.[0]?.mediumgif?.url ||
                                        gif.itemurl

                                    if (gifUrl) {
                                        insertGifAtCursor(gifUrl)
                                    }
                                }}
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
                onSelect={(emoji) => {
                    const el = contentEditableRef.current
                    if (!el) return
                    insertAtCursor(el, emoji)
                    normalizeInputDOM(el)
                    const md = serializeToMarkdown(el)
                    form.setValue('text', md, { shouldValidate: false, shouldDirty: true })
                }}
            />

            {/* Main Input Bar */}
            <div className={`rounded-[12px] overflow-hidden border ${gifLimitHit ? 'gif-limit-hit border-red-300' : 'border-transparent'} bg-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]`}>
                <form onSubmit={onSend} className="flex gap-2 p-3 bg-gradient-to-r from-[#eef3ff] via-[#e6eeff] to-[#eef3ff] items-center">
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
                            data-placeholder="Type a message...  **bold**  _italic_  ~~strike~~  `code`"
                            style={{ lineHeight: '1.5', fontFamily: '"Tahoma", "Verdana", system-ui, sans-serif' }}
                        />

                        {/* Character Counter */}
                        <div className="absolute bottom-2 right-2 text-[10px] text-[#a0b1d9] pointer-events-none select-none">
                            {form.watch('text').length}/1000
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
