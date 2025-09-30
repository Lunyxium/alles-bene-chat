import { useState, useMemo } from 'react'
import { EMOJI_SEARCH_MAP } from './emojiSearchData'
import { X } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

// TypeScript Interfaces
interface EmojiCategory {
    id: string
    name: string
    icon: string
    emojis: string[]
}

interface EmojiPickerProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (emoji: string) => void
}

// Emoji Categories
const EMOJI_CATEGORIES: EmojiCategory[] = [
    {
        id: 'smileys',
        name: 'Smileys',
        icon: '😀',
        emojis: [
            '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘',
            '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐',
            '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
            '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️',
            '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞',
            '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺',
            '👻', '👽', '👾', '🤖'
        ]
    },
    {
        id: 'gestures',
        name: 'Gesten',
        icon: '👋',
        emojis: [
            '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆',
            '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️',
            '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄'
        ]
    },
    {
        id: 'hearts',
        name: 'Herzen',
        icon: '❤️',
        emojis: [
            '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
            '💘', '💝', '💟', '💌', '💋', '💐', '🌹', '🥀', '🌺', '🌸', '🌼', '🌻', '🌷'
        ]
    },
    {
        id: 'animals',
        name: 'Tiere',
        icon: '🐶',
        emojis: [
            '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸',
            '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺',
            '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍',
            '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊',
            '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄',
            '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌'
        ]
    },
    {
        id: 'food',
        name: 'Essen',
        icon: '🍔',
        emojis: [
            '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥',
            '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠',
            '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🌭',
            '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜',
            '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧',
            '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪'
        ]
    },
    {
        id: 'activities',
        name: 'Aktivitäten',
        icon: '⚽',
        emojis: [
            '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍',
            '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌',
            '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽',
            '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹',
            '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🪗', '🎸', '🪕', '🎻',
            '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩'
        ]
    },
    {
        id: 'objects',
        name: 'Objekte',
        icon: '💻',
        emojis: [
            '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼',
            '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭',
            '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸',
            '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒️', '🛠️',
            '⛏️', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️'
        ]
    },
    {
        id: 'symbols',
        name: 'Symbole',
        icon: '⚡',
        emojis: [
            '⭐', '🌟', '✨', '⚡', '💫', '🌙', '☀️', '⛅', '⛈️', '🌤️', '🌥️', '🌦️', '🌧️', '🌩️', '🌨️', '❄️',
            '🌬️', '💨', '🌪️', '🌈', '☂️', '☔', '💧', '💦', '🌊', '🔥', '🎆', '🎇', '🌠', '💯', '💢', '💬',
            '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤', '💮', '♠️', '♥️', '♦️', '♣️', '🃏', '🎴', '🔇', '🔈', '🔉', '🔊',
            '📢', '📣', '📯', '🔔', '🔕', '🎵', '🎶', '🔀', '🔁', '🔂', '⏯️', '⏮️', '⏭️', '⏹️', '⏺️', '⏸️',
            '⏏️', '📱', '📲', '☎️', '📞', '📟', '📠'
        ]
    }
]

export function EmojiPicker({ isOpen, onClose, onSelect }: EmojiPickerProps) {
    const [search, setSearch] = useState('')
    const [activeCategory, setActiveCategory] = useState<string>('smileys')
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    // Memoize filtered results
    const filteredEmojis = useMemo(() => {
        if (!search.trim()) {
            const category = EMOJI_CATEGORIES.find(cat => cat.id === activeCategory)
            return category ? category.emojis : []
        }

        // Search all emojis
        return EMOJI_CATEGORIES
            .flatMap(category => category.emojis)
            .filter(emoji => {
                const searchTerm = search.toLowerCase()
                const searchTerms = EMOJI_SEARCH_MAP[emoji] || []
                return searchTerms.some(term =>
                    term.toLowerCase().includes(searchTerm)
                ) || emoji.includes(searchTerm)
            })
    }, [search, activeCategory])

    if (!isOpen) return null

    const wrapperClass = isDark
        ? 'bg-[#0f172a]/95 border-2 border-[#1d3a7a] text-[#dbeafe]'
        : 'bg-white border-2 border-[#7a96df]'

    const closeButtonClass = isDark
        ? 'absolute top-3 right-3 z-50 w-6 h-6 rounded-full bg-[#1a2544] hover:bg-[#24315b] border border-[#1d3a7a] flex items-center justify-center transition-colors text-[#bfdbfe]'
        : 'absolute top-3 right-3 z-50 w-6 h-6 rounded-full bg-white/90 hover:bg-white border border-gray-300 flex items-center justify-center transition-colors'

    const searchBarClass = isDark
        ? 'p-3 pr-10 border-b-2 border-[#1d3a7a] bg-gradient-to-r from-[#0f172a] to-[#111c34]'
        : 'p-3 pr-10 border-b-2 border-[#c7d9ff] bg-gradient-to-r from-[#f7faff] to-[#eef3ff]'

    const searchInputClass = isDark
        ? 'w-full pl-8 pr-3 py-2 text-sm border border-[#1d3a7a] rounded-lg focus:outline-none focus:border-[#60a5fa] focus:ring-2 focus:ring-[#1d4ed8] bg-[#0b1225] text-[#bfdbfe] shadow-inner transition-all'
        : 'w-full pl-8 pr-3 py-2 text-sm border border-[#9eb8ff] rounded-lg focus:outline-none focus:border-[#0a4bdd] focus:ring-2 focus:ring-[#c4d4ff] bg-white/95 shadow-inner transition-all'

    const searchClearButtonClass = isDark
        ? 'absolute right-2 top-1/2 -translate-y-1/2 text-[#60a5fa] hover:text-[#bfdbfe] transition-colors'
        : 'absolute right-2 top-1/2 -translate-y-1/2 text-[#9eb8ff] hover:text-[#0a4bdd] transition-colors'

    const categoriesBarClass = isDark
        ? 'flex gap-2 p-3 border-b-2 border-[#1d3a7a] flex-wrap bg-gradient-to-b from-[#111c34] to-[#0f172a]'
        : 'flex gap-2 p-3 border-b-2 border-[#c7d9ff] flex-wrap bg-gradient-to-b from-[#eef3ff] to-[#e6eeff]'

    const categoryButtonActiveClass = isDark
        ? 'bg-gradient-to-b from-[#1d4ed8] to-[#1e3a8a] text-white border border-[#1d4ed8] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_8px_rgba(2,6,23,0.45)] scale-105'
        : 'bg-gradient-to-b from-[#0a4bdd] to-[#0840c7] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_8px_rgba(0,0,0,0.15)] scale-105'

    const categoryButtonInactiveClass = isDark
        ? 'bg-gradient-to-b from-[#0f172a] to-[#111c34] border border-[#1d3a7a] text-[#bfdbfe] hover:from-[#1a2544] hover:to-[#111c34] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_8px_rgba(2,6,23,0.45)]'
        : 'bg-gradient-to-b from-white to-[#e6eeff] hover:from-[#e0f0ff] hover:to-[#c4dfff] border border-[#9eb8ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_8px_rgba(10,75,221,0.15)]'

    const emojiContainerClass = isDark
        ? 'flex-1 overflow-y-auto p-3 bg-[#0f172a]' : 'flex-1 overflow-y-auto p-3 bg-gradient-to-b from-white to-[#f7faff]'

    const noResultsTextClass = isDark ? 'text-center text-sm text-[#93c5fd] py-8' : 'text-center text-sm text-[#6c83ca] py-8'

    const footerClass = isDark
        ? 'px-3 py-2 border-t border-[#1d3a7a] bg-gradient-to-r from-[#111c34] to-[#0f172a] text-[10px] text-[#9fb7dd] flex justify-between items-center'
        : 'px-3 py-2 border-t border-[#c7d9ff] bg-gradient-to-r from-[#eaf1ff] to-[#dfe9ff] text-[10px] text-[#5b6ea5] flex justify-between items-center'

    const footerLinkClass = isDark ? 'text-[#60a5fa] hover:underline' : 'text-[#0a4bdd] hover:underline'

    const emojiButtonClass = isDark
        ? 'group relative p-2.5 text-2xl rounded-xl transition-all duration-200 hover:bg-[#1a2544] hover:shadow-[0_8px_16px_rgba(2,6,23,0.45)] active:scale-95 transform-gpu flex items-center justify-center'
        : 'group relative p-2.5 text-2xl rounded-xl transition-all duration-200 hover:bg-gradient-to-br hover:from-[#e5f3ff] hover:to-[#d4e9ff] hover:shadow-[0_8px_16px_rgba(10,75,221,0.25)] active:scale-95 transform-gpu flex items-center justify-center'

    const emojiIconClass = isDark
        ? 'group-hover:scale-125 transition-transform duration-200 block text-center'
        : 'group-hover:scale-125 transition-transform duration-200 block text-center'

    return (
        <div className="emoji-container absolute bottom-28 left-8 z-50">
            <div
                className={`${wrapperClass} rounded-xl shadow-[0_15px_35px_rgba(8,47,73,0.45)] overflow-hidden relative`}
                style={{ width: '420px', maxHeight: '450px' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className={closeButtonClass}
                    title="Schließen"
                >
                    <X className="w-4 h-4" strokeWidth={2} />
                </button>

                <div className="flex flex-col h-full">
                    {/* Search Bar */}
                    <div className={searchBarClass}>
                        <div className="relative">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="🔍 Emoji suchen..."
                                className={searchInputClass}
                                autoComplete="off"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className={searchClearButtonClass}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Categories */}
                    {!search && (
                        <div className={categoriesBarClass}>
                            {EMOJI_CATEGORIES.map(category => (
                                <button
                                    key={category.id}
                                    onClick={() => setActiveCategory(category.id)}
                                    type="button"
                                    className={`px-3 py-2 text-lg rounded-lg transition-all duration-200 transform hover:scale-105 ${
                                        activeCategory === category.id
                                            ? categoryButtonActiveClass
                                            : categoryButtonInactiveClass
                                    }`}
                                    title={category.name}
                                >
                                    {category.icon}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Emojis Grid */}
                    <div className={emojiContainerClass} style={{ maxHeight: '320px' }}>
                        {filteredEmojis.length > 0 ? (
                            <div className="grid grid-cols-7 gap-1.5">
                                {filteredEmojis.map((emoji, idx) => (
                                    <button
                                        key={`${emoji}-${idx}`}
                                        onClick={() => onSelect(emoji)}
                                        type="button"
                                        className={emojiButtonClass}
                                        style={{
                                            fontSize: '28px',
                                            lineHeight: '1',
                                            transformOrigin: '50% 50%'
                                        }}
                                    >
                                        <span
                                            className={emojiIconClass}
                                            style={{
                                                textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                transformOrigin: '50% 50%'
                                            }}
                                        >
                                            {emoji}
                                        </span>
                                        {/* Gloss Effect on Hover */}
                                        <div className={`absolute inset-0 rounded-xl ${isDark ? 'bg-gradient-to-t from-transparent via-white/0 to-white/10' : 'bg-gradient-to-t from-transparent via-white/0 to-white/20'} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className={noResultsTextClass}>
                                <div className="text-4xl mb-2">🔍</div>
                                <div className="font-medium">Keine Emojis gefunden</div>
                                <div className="text-xs mt-1 opacity-75">Versuche andere Suchbegriffe</div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className={footerClass}>
                        <span>Emoji Picker ✨</span>
                        <div className="flex items-center gap-2">
                            <span>{filteredEmojis.length} verfügbar</span>
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    type="button"
                                    className={footerLinkClass}
                                >
                                    Alle anzeigen
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
