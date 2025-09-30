import React from 'react'
import { X } from 'lucide-react'
import GifPickerReact, { ContentFilter, Theme } from 'gif-picker-react'
import { useTheme } from '@/hooks/useTheme'

interface GifPickerProps {
    isOpen: boolean
    onClose: () => void
    onGifSelect: (url: string) => void
}

export function GifPicker({ isOpen, onClose, onGifSelect }: GifPickerProps) {
    if (!isOpen) return null

    const { theme } = useTheme()
    const isDark = theme === 'dark'

    const handleGifClick = (gif: any) => {
        const gifUrl =
            gif.url ||
            gif.media_formats?.gif?.url ||
            gif.media?.[0]?.gif?.url ||
            gif.media_formats?.mediumgif?.url ||
            gif.media?.[0]?.mediumgif?.url ||
            gif.itemurl

        if (gifUrl) {
            onGifSelect(gifUrl)
        }
    }

    const wrapperClass = isDark
        ? 'bg-[#0f172a]/95 border-2 border-[#1d3a7a] text-[#dbeafe]'
        : 'bg-white border-2 border-[#7a96df]'

    const closeButtonClass = isDark
        ? 'absolute top-2 right-2 z-50 w-6 h-6 rounded-full bg-[#1a2544] hover:bg-[#24315b] border border-[#1d3a7a] flex items-center justify-center transition-colors text-[#bfdbfe]'
        : 'absolute top-2 right-2 z-50 w-6 h-6 rounded-full bg-white/90 hover:bg-white border border-gray-300 flex items-center justify-center transition-colors'

    return (
        <div className="gif-container absolute bottom-28 left-8 z-50">
            <div className={`${wrapperClass} rounded-xl shadow-[0_15px_35px_rgba(8,47,73,0.45)] overflow-hidden relative`}>
                <button
                    onClick={onClose}
                    className={closeButtonClass}
                    title="Schliessen"
                >
                    <X className="w-4 h-4" strokeWidth={2} />
                </button>

                <div onClick={(e) => e.stopPropagation()}>
                    <GifPickerReact
                        tenorApiKey={import.meta.env.VITE_TENOR_API_KEY}
                        onGifClick={handleGifClick}
                        width={450}
                        height={400}
                        theme={isDark ? Theme.DARK : Theme.LIGHT}
                        locale="de_DE"
                        contentFilter={ContentFilter.MEDIUM}
                    />
                </div>
            </div>
        </div>
    )
}
