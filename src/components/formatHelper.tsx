import React, { JSX } from 'react'
import { X, ArrowBigRightDash } from 'lucide-react'
import { FORMAT_OPTIONS, FormatOption } from '@/constants/editorConstants'
import { useTheme } from '@/hooks/useTheme'

interface FormatHelperProps {
    isOpen: boolean
    onClose: () => void
    onFormatSelect: (wrap: [string, string]) => void
}

export function FormatHelper({ isOpen, onClose, onFormatSelect }: FormatHelperProps) {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    if (!isOpen) return null

    const renderFormatExample = (example: string, format: FormatOption): JSX.Element => {
        const styleMap: Record<string, JSX.Element> = {
            Bold: <strong>{example}</strong>,
            Italic: <em>{example}</em>,
            Durchgestrichen: <span style={{ textDecoration: 'line-through' }}>{example}</span>,
            Code: <code className={isDark ? 'bg-[#111c34] px-1 rounded text-[#93c5fd]' : 'bg-gray-100 px-1 rounded'}>{example}</code>,
            Quote: <span className={isDark ? 'border-l-2 border-[#1d3a7a] pl-2 text-[#93c5fd]' : 'border-l-2 border-gray-400 pl-2'}>{example}</span>,
            Liste: <span>• {example}</span>
        }
        return styleMap[format.name] || <span>{example}</span>
    }

    const wrapperClass = isDark
        ? 'format-container absolute bottom-28 left-8 bg-[#0f172a]/95 backdrop-blur border border-[#1d3a7a] rounded-lg shadow-[0_15px_30px_rgba(8,47,73,0.45)] p-4 z-50 w-80 text-[#dbeafe]'
        : 'format-container absolute bottom-28 left-8 bg-white/95 backdrop-blur-sm border border-[#9eb8ff] rounded-lg shadow-[0_10px_25px_rgba(58,92,173,0.15)] p-4 z-50 w-80'

    const closeButtonClass = isDark
        ? 'absolute top-2 right-2 w-5 h-5 rounded-full bg-[#1a2544] hover:bg-[#24315b] border border-[#1d3a7a] flex items-center justify-center transition-colors text-[#bfdbfe]'
        : 'absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors'

    const headingClass = isDark ? 'text-xs font-semibold text-[#93c5fd] mb-3' : 'text-xs font-semibold text-[#0a4bdd] mb-3'
    const listItemClass = isDark ? 'flex items-center gap-2 text-xs text-[#dbeafe]' : 'flex items-center gap-2 text-xs'
    const syntaxBadgeClass = isDark ? 'bg-[#111c34] px-1.5 py-0.5 rounded text-[#93c5fd]' : 'bg-gray-100 px-1.5 py-0.5 rounded text-[#0a4bdd]'
    const arrowClass = isDark ? 'w-3 h-3 text-[#647bb0]' : 'w-3 h-3 text-gray-400'
    const footerTextClass = isDark ? 'text-[10px] text-[#647bb0] mb-1' : 'text-[10px] text-gray-500 mb-1'
    const footerButtonClass = isDark
        ? 'p-1.5 hover:bg-[#1a2544] rounded transition-colors text-[#bfdbfe]'
        : 'p-1.5 hover:bg-[#e5f3ff] rounded transition-colors'

    return (
        <div className={wrapperClass}>
            <button
                onClick={onClose}
                className={closeButtonClass}
                title="Schliessen"
            >
                <X className="w-3 h-3" strokeWidth={2} />
            </button>

            <div className={headingClass}>Formatierungs-Legende</div>

            <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                {FORMAT_OPTIONS.map((format, idx) => (
                    <div key={idx} className={listItemClass}>
                        <code className={syntaxBadgeClass}>
                            {format.syntax}
                        </code>
                        <ArrowBigRightDash className={arrowClass} strokeWidth={2} />
                        <span className="flex-1">{renderFormatExample(format.example, format)}</span>
                    </div>
                ))}
            </div>

            <div className={isDark ? 'border-t border-[#1d3a7a] pt-2' : 'border-t border-[#c7d9ff] pt-2'}>
                <div className={footerTextClass}>Markiere Text und klicke:</div>
                <div className="flex gap-1">
                    {FORMAT_OPTIONS.map((format, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => onFormatSelect(format.wrap)}
                            onMouseDown={(e) => e.preventDefault()}
                            className={footerButtonClass}
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
