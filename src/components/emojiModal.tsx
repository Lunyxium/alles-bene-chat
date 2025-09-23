import { useState, useMemo } from 'react'

// TypeScript Interfaces
interface EmojiCategory {
    id: string
    name: string
    icon: string
    emojis: string[]
}

interface EmojiModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (emoji: string) => void
}

// Emoji Categories - Ausgelagert für bessere Performance
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

export function EmojiModal({ isOpen, onClose, onSelect }: EmojiModalProps) {
    const [search, setSearch] = useState('')
    const [activeCategory, setActiveCategory] = useState<string>('smileys')

    // Performance: Memoize filtered results
    const filteredEmojis = useMemo(() => {
        if (!search.trim()) {
            const category = EMOJI_CATEGORIES.find(cat => cat.id === activeCategory)
            return category ? category.emojis : []
        }

        // Smart search: durchsuche alle Emojis
        return EMOJI_CATEGORIES
            .flatMap(category => category.emojis)
            .filter(emoji => {
                // Einfache Emoji-Suche basierend auf Unicode-Namen oder Position
                const searchTerm = search.toLowerCase()

                // Basic emoji matching - könnte erweitert werden
                const emojiDescriptions: Record<string, string[]> = {
                    '😀': ['happy', 'smile', 'grin', 'glücklich', 'lachen'],
                    '😂': ['laugh', 'cry', 'tears', 'joy', 'lol', 'haha', 'lustig'],
                    '❤️': ['heart', 'love', 'red', 'herz', 'liebe'],
                    '👍': ['thumbs', 'up', 'like', 'good', 'daumen', 'gut'],
                    '👎': ['thumbs', 'down', 'dislike', 'bad', 'daumen', 'schlecht'],
                    '🔥': ['fire', 'hot', 'flame', 'feuer', 'heiß'],
                    '💯': ['hundred', 'perfect', 'score', 'hundert', 'perfekt'],
                    '🎉': ['party', 'celebration', 'confetti', 'feier', 'party'],
                    // Könnte erweitert werden...
                }

                const descriptions = emojiDescriptions[emoji] || []
                return descriptions.some(desc => desc.includes(searchTerm)) ||
                    emoji.includes(searchTerm)
            })
    }, [search, activeCategory])

    if (!isOpen) return null

    return (
        <div className="emoji-container absolute bottom-28 left-8 z-50">
            <div
                className="bg-white border-2 border-[#7a96df] rounded-xl shadow-[0_15px_35px_rgba(58,92,173,0.25)] overflow-hidden"
                style={{ width: '420px', maxHeight: '450px' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col h-full">
                    {/* Search Bar - Verbessert */}
                    <div className="p-3 border-b-2 border-[#c7d9ff] bg-gradient-to-r from-[#f7faff] to-[#eef3ff]">
                        <div className="relative">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="🔍 Emoji suchen..."
                                className="w-full pl-8 pr-3 py-2 text-sm border border-[#9eb8ff] rounded-lg focus:outline-none focus:border-[#0a4bdd] focus:ring-2 focus:ring-[#c4d4ff] bg-white/95 shadow-inner transition-all"
                                autoComplete="off"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9eb8ff] hover:text-[#0a4bdd] transition-colors"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Categories - Verbesserte Hover-States */}
                    {!search && (
                        <div className="flex gap-2 p-3 border-b-2 border-[#c7d9ff] flex-wrap bg-gradient-to-b from-[#eef3ff] to-[#e6eeff]">
                            {EMOJI_CATEGORIES.map(category => (
                                <button
                                    key={category.id}
                                    onClick={() => setActiveCategory(category.id)}
                                    className={`px-3 py-2 text-lg rounded-lg transition-all duration-200 transform hover:scale-105 ${
                                        activeCategory === category.id
                                            ? 'bg-gradient-to-b from-[#0a4bdd] to-[#0840c7] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_8px_rgba(0,0,0,0.15)] scale-105'
                                            : 'bg-gradient-to-b from-white to-[#e6eeff] hover:from-[#e0f0ff] hover:to-[#c4dfff] border border-[#9eb8ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_8px_rgba(10,75,221,0.15)]'
                                    }`}
                                    title={category.name}
                                >
                                    {category.icon}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Emojis Grid - Perfektionierte Hover-Effects */}
                    <div className="flex-1 overflow-y-auto p-3 bg-gradient-to-b from-white to-[#f7faff]" style={{ maxHeight: '320px' }}>
                        {filteredEmojis.length > 0 ? (
                            <div className="grid grid-cols-7 gap-1.5">
                                {filteredEmojis.map((emoji, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            onSelect(emoji)
                                            onClose()
                                        }}
                                        className="group relative p-2.5 text-2xl rounded-xl transition-all duration-200 hover:bg-gradient-to-br hover:from-[#e5f3ff] hover:to-[#d4e9ff] hover:shadow-[0_8px_16px_rgba(10,75,221,0.25)] active:scale-95 transform-gpu flex items-center justify-center"
                                        style={{
                                            fontSize: '28px',
                                            lineHeight: '1',
                                            transformOrigin: '50% 50%'
                                        }}
                                    >
                                        <span
                                            className="group-hover:scale-125 transition-transform duration-200 block text-center"
                                            style={{
                                                textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                transformOrigin: '50% 50%'
                                            }}
                                        >
                                            {emoji}
                                        </span>
                                        {/* Gloss Effect on Hover - Zentriert */}
                                        <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-transparent via-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-sm text-[#6c83ca] py-8">
                                <div className="text-4xl mb-2">🔍</div>
                                <div className="font-medium">Keine Emojis gefunden</div>
                                <div className="text-xs mt-1 opacity-75">Versuche andere Suchbegriffe</div>
                            </div>
                        )}
                    </div>

                    {/* Footer - Verbesserte Info */}
                    <div className="px-3 py-2 border-t border-[#c7d9ff] bg-gradient-to-r from-[#eaf1ff] to-[#dfe9ff] text-[10px] text-[#5b6ea5] flex justify-between items-center">
                        <span>Emoji Picker ✨</span>
                        <div className="flex items-center gap-2">
                            <span>{filteredEmojis.length} verfügbar</span>
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className="text-[#0a4bdd] hover:underline"
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