import React from 'react'
import { X } from 'lucide-react'
import GifPickerReact, { Theme, ContentFilter } from 'gif-picker-react'

interface GifPickerProps {
    isOpen: boolean
    onClose: () => void
    onGifSelect: (url: string) => void
}

export function GifPicker({ isOpen, onClose, onGifSelect }: GifPickerProps) {
    if (!isOpen) return null

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

    return (
        <div className="gif-container absolute bottom-28 left-8 z-50">
            <div className="bg-white border-2 border-[#7a96df] rounded-xl shadow-[0_15px_35px_rgba(58,92,173,0.25)] overflow-hidden relative">
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 z-50 w-6 h-6 rounded-full bg-white/90 hover:bg-white border border-gray-300 flex items-center justify-center transition-colors"
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
                        theme={Theme.LIGHT}
                        locale="de_DE"
                        contentFilter={ContentFilter.MEDIUM}
                    />
                </div>
            </div>
        </div>
    )
}