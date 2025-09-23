import emojiRegex from 'emoji-regex'
import { EMOJI_SPAN_CLASS, GIF_CLASS, GIF_BLOCK_CLASS, WrapPair } from '@/constants/editorConstants'

// ==================== EMOJI HELPERS ====================
export function isEmojiTextNode(node: Node): boolean {
    if (node.nodeType !== Node.TEXT_NODE) return false
    const text = node.textContent || ''
    const regex = emojiRegex()
    return regex.test(text)
}

export function wrapEmojisInNode(root: HTMLElement): void {
    // Remove existing emoji spans first (keep idempotent)
    const oldSpans = root.querySelectorAll(`span.${EMOJI_SPAN_CLASS}`)
    oldSpans.forEach((span) => {
        const parent = span.parentNode
        if (parent) {
            parent.replaceChild(document.createTextNode(span.textContent || ''), span)
        }
    })

    // Find all text nodes that need emoji wrapping
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
    const targets: Text[] = []
    let node: Node | null

    while ((node = walker.nextNode())) {
        // Skip text in non-editable blocks
        const el = (node.parentElement as HTMLElement) || null
        if (el?.closest?.(`.${GIF_BLOCK_CLASS}`)) continue
        if (isEmojiTextNode(node)) targets.push(node as Text)
    }

    const regex = emojiRegex()
    for (const textNode of targets) {
        const parent = textNode.parentElement
        if (!parent) continue
        const text = textNode.textContent || ''
        if (!regex.test(text)) continue

        const frag = document.createDocumentFragment()
        let lastIndex = 0

        for (const match of text.matchAll(regex)) {
            const emoji = match[0]
            const index = match.index ?? 0

            if (index > lastIndex) {
                frag.appendChild(document.createTextNode(text.slice(lastIndex, index)))
            }

            const span = document.createElement('span')
            span.className = EMOJI_SPAN_CLASS
            span.textContent = emoji
            frag.appendChild(span)
            lastIndex = index + emoji.length
        }

        if (lastIndex < text.length) {
            frag.appendChild(document.createTextNode(text.slice(lastIndex)))
        }

        parent.replaceChild(frag, textNode)
    }
}

// ==================== GIF HELPERS ====================
export function normalizeGifImages(root: HTMLElement): void {
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
            wrapper.contentEditable = 'false'
            wrapper.style.display = 'block'
            wrapper.style.margin = '6px 0'
            img.parentElement?.insertBefore(wrapper, img)
            wrapper.appendChild(img)
        }

        // Ensure there's an editable paragraph after the GIF
        const after = wrapper.nextSibling
        const needParagraph = !after || !(
            (after as HTMLElement).nodeType === Node.ELEMENT_NODE &&
            (after as HTMLElement).tagName === 'DIV' &&
            (after as HTMLElement).getAttribute('data-paragraph') === '1'
        )

        if (needParagraph) {
            const p = document.createElement('div')
            p.setAttribute('data-paragraph', '1')
            p.appendChild(document.createElement('br'))
            wrapper.parentElement?.insertBefore(p, wrapper.nextSibling)
        }
    })
}

// ==================== DOM NORMALIZATION ====================
export function normalizeInputDOM(root: HTMLElement): void {
    wrapEmojisInNode(root)
    normalizeGifImages(root)
}

// ==================== SERIALIZATION ====================
export function serializeToMarkdown(root: HTMLElement): string {
    let output = ''

    function walk(node: Node) {
        if (node.nodeType === Node.TEXT_NODE) {
            output += node.textContent || ''
            return
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement

            // Handle GIF blocks
            if (el.classList.contains(GIF_BLOCK_CLASS)) {
                const img = el.querySelector('img') as HTMLImageElement | null
                if (img?.dataset.gif && img.src) {
                    output += `![](${img.src})\n`
                }
                return
            }

            // Handle inline GIFs (fallback)
            if (el.tagName === 'IMG' && (el as HTMLImageElement).dataset.gif) {
                const src = (el as HTMLImageElement).src
                if (src) output += `![](${src})\n`
                return
            }

            // Handle emoji spans
            if (el.classList.contains(EMOJI_SPAN_CLASS)) {
                output += el.textContent || ''
                return
            }

            // Handle line breaks
            if (el.tagName === 'BR') {
                output += '\n'
                return
            }

            // Handle paragraphs
            if (el.tagName === 'DIV' && el.getAttribute('data-paragraph') === '1') {
                el.childNodes.forEach(walk)
                output += '\n'
                return
            }

            // Default: traverse children
            el.childNodes.forEach(walk)

            // Add newline for block elements
            if (/^(DIV|P)$/.test(el.tagName)) {
                output += '\n'
            }
        }
    }

    root.childNodes.forEach(walk)

    return output
        .replace(/\u00A0/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trimEnd()
}

// ==================== SELECTION MANAGEMENT ====================
export interface Selection {
    start: number
    end: number
    text: string
}

export function saveSelection(element: HTMLElement): Selection | null {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return null

    const range = selection.getRangeAt(0)
    const preRange = range.cloneRange()
    preRange.selectNodeContents(element)
    preRange.setEnd(range.startContainer, range.startOffset)

    const start = preRange.toString().length
    const selectedText = range.toString()
    const end = start + selectedText.length

    return { start, end, text: selectedText }
}

export function restoreSelection(element: HTMLElement, savedSelection: Selection | null, selectText = false): void {
    if (!element || !savedSelection) return

    const { start, end } = savedSelection
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

// ==================== TEXT MANIPULATION ====================
export function toggleWrap(text: string, [left, right]: WrapPair): string {
    const startsWithLeft = text.startsWith(left)
    const endsWithRight = right ? text.endsWith(right) : false

    if (startsWithLeft && endsWithRight) {
        return text.slice(left.length, text.length - right.length)
    }
    return left + text + right
}

export function insertAtCursor(editor: HTMLElement, text: string, savedSelection?: Selection | null): void {
    editor.focus()
    if (savedSelection) {
        restoreSelection(editor, savedSelection, false)
    }

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

    // If range is in GIF block, move cursor after it
    const gifBlock = (range.startContainer as HTMLElement).closest?.(`.${GIF_BLOCK_CLASS}`)
    if (gifBlock?.parentElement) {
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

// ==================== PARAGRAPH HELPERS ====================
export function getCurrentParagraph(el: HTMLElement): HTMLElement | null {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return null

    let node: Node = sel.getRangeAt(0).startContainer
    if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode as Node
    }

    return (node as HTMLElement).closest?.('[data-paragraph="1"]') as HTMLElement | null
}

export function caretAtParagraphStart(paragraph: HTMLElement): boolean {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return false

    const range = sel.getRangeAt(0).cloneRange()
    const preRange = document.createRange()
    preRange.selectNodeContents(paragraph)
    preRange.setEnd(range.startContainer, range.startOffset)

    const textBefore = preRange.toString().replace(/\u200B/g, '')
    return textBefore.trim().length === 0
}

export function caretAtParagraphEnd(paragraph: HTMLElement): boolean {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return false

    const range = sel.getRangeAt(0).cloneRange()
    const postRange = document.createRange()
    postRange.selectNodeContents(paragraph)
    postRange.setStart(range.endContainer, range.endOffset)

    const textAfter = postRange.toString().replace(/\u200B/g, '')
    return textAfter.trim().length === 0
}

export function setCaretAtParagraphStart(p: HTMLElement): void {
    const sel = window.getSelection()
    const range = document.createRange()

    if (!p.firstChild) {
        p.appendChild(document.createElement('br'))
    }

    range.setStart(p, 0)
    range.collapse(true)
    sel?.removeAllRanges()
    sel?.addRange(range)
}

// ==================== UTILITY ====================
export function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}