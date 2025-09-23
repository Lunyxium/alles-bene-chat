import React, { JSX } from 'react'
import { X, ArrowBigRightDash } from 'lucide-react'
import { FORMAT_OPTIONS, FormatOption } from '@/constants/editorConstants'

interface FormatHelperProps {
    isOpen: boolean
    onClose: () => void
    onFormatSelect: (wrap: [string, string]) => void
}

export function FormatHelper({ isOpen, onClose, onFormatSelect }: FormatHelperProps) {
    if (!isOpen) return null

    const renderFormatExample = (example: string, format: FormatOption): JSX.Element => {
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

    return (
        <div className="format-container absolute bottom-28 left-8 bg-white/95 backdrop-blur-sm border border-[#9eb8ff] rounded-lg shadow-[0_10px_25px_rgba(58,92,173,0.15)] p-4 z-50 w-80">
            <button
                onClick={onClose}
                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                title="Schliessen"
            >
                <X className="w-3 h-3" strokeWidth={2} />
            </button>

            <div className="text-xs font-semibold text-[#0a4bdd] mb-3">Formatierungs-Legende</div>

            <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                {FORMAT_OPTIONS.map((format, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[#0a4bdd]">
                            {format.syntax}
                        </code>
                        <ArrowBigRightDash className="w-3 h-3 text-gray-400" strokeWidth={2} />
                        <span className="flex-1">{renderFormatExample(format.example, format)}</span>
                    </div>
                ))}
            </div>

            <div className="border-t border-[#c7d9ff] pt-2">
                <div className="text-[10px] text-gray-500 mb-1">Markiere Text und klicke:</div>
                <div className="flex gap-1">
                    {FORMAT_OPTIONS.map((format, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => onFormatSelect(format.wrap)}
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
    )
}