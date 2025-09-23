import React from 'react'
import { Bold, Italic, Strikethrough, Code, Quote, List } from 'lucide-react'

// ==================== CSS CLASSES ====================
export const EMOJI_SPAN_CLASS = 'ce-emoji'
export const GIF_CLASS = 'ce-gif'
export const GIF_BLOCK_CLASS = 'ce-gif-block'

// ==================== LIMITS ====================
export const MAX_GIF_PER_MESSAGE = 1
export const MAX_MESSAGE_LENGTH = 1000
export const ACTIVITY_DEBOUNCE_MS = 5000

// ==================== WRAP PAIRS ====================
export type WrapPair = [string, string]

export const WRAPS: Record<'bold' | 'italic' | 'strike' | 'code', WrapPair> = {
    bold: ['**', '**'],
    italic: ['_', '_'],
    strike: ['~~', '~~'],
    code: ['`', '`']
}

// ==================== FORMAT OPTIONS ====================
export interface FormatOption {
    name: string
    syntax: string
    example: string
    icon: React.ReactNode
    wrap: WrapPair
}

export const FORMAT_OPTIONS: FormatOption[] = [
    {
        name: 'Bold',
        syntax: '**text**',
        example: 'bold text',
        icon: React.createElement(Bold, { className: "w-3 h-3", strokeWidth: 2.5 }),
        wrap: ['**', '**']
    },
    {
        name: 'Italic',
        syntax: '_text_',
        example: 'italic text',
        icon: React.createElement(Italic, { className: "w-3 h-3", strokeWidth: 2.5 }),
        wrap: ['_', '_']
    },
    {
        name: 'Durchgestrichen',
        syntax: '~~text~~',
        example: 'durchgestrichen',
        icon: React.createElement(Strikethrough, { className: "w-3 h-3", strokeWidth: 2.5 }),
        wrap: ['~~', '~~']
    },
    {
        name: 'Code',
        syntax: '`code`',
        example: 'code',
        icon: React.createElement(Code, { className: "w-3 h-3", strokeWidth: 2.5 }),
        wrap: ['`', '`']
    },
    {
        name: 'Quote',
        syntax: '> text',
        example: 'Zitat',
        icon: React.createElement(Quote, { className: "w-3 h-3", strokeWidth: 2.5 }),
        wrap: ['> ', '']
    },
    {
        name: 'Liste',
        syntax: '- item',
        example: 'Listeneintrag',
        icon: React.createElement(List, { className: "w-3 h-3", strokeWidth: 2.5 }),
        wrap: ['- ', '']
    }
]

// ==================== STYLES ====================
export const EMOJI_INPUT_STYLES = `
    .${EMOJI_SPAN_CLASS} {
        display: inline-block;
        line-height: 1;
        font-size: 2.2em;
        vertical-align: -0.2em;
    }
    
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
    
    [data-paragraph="1"] {
        min-height: 1.2em;
    }
    
    .gif-limit-hit {
        animation: pulse-red 0.5s ease-in-out 2;
    }
    
    @keyframes pulse-red {
        0% { box-shadow: 0 0 0 0 rgba(255,0,64,0.0); }
        50% { box-shadow: 0 0 0 3px rgba(255, 64, 64, 0.35); }
        100% { box-shadow: 0 0 0 0 rgba(255,0,64,0.0); }
    }
    
    [contenteditable][data-placeholder]:empty:before {
        content: attr(data-placeholder);
        color: #6c83ca;
        pointer-events: none;
        display: block;
        position: absolute;
    }
`