import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'

interface ThemeSwitcherProps {
    className?: string
    size?: 'sm' | 'md'
}

export function ThemeSwitcher({ className = '', size = 'md' }: ThemeSwitcherProps) {
    const { theme, toggleTheme } = useTheme()
    const isDark = theme === 'dark'

    const baseClasses = size === 'sm'
        ? 'px-2 py-1 text-[11px]'
        : 'px-3 py-1.5 text-xs'

    const sharedClasses = 'inline-flex items-center gap-2 rounded-full border backdrop-blur transition hover:-translate-y-[1px]'
    const lightClasses = `${sharedClasses} border-[#9eb8ff] bg-white/80 text-[#0a4bdd] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] hover:bg-white`
    const darkClasses = `${sharedClasses} border-[#1d3a7a] bg-[#0f172a]/90 text-[#bfdbfe] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-[#14203d]`

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={cn(isDark ? darkClasses : lightClasses, baseClasses, className)}
            aria-label={isDark ? 'Hellmodus aktivieren' : 'Dunkelmodus aktivieren'}
            aria-pressed={isDark}
        >
            {isDark ? (
                <Sun className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} strokeWidth={2.5} />
            ) : (
                <Moon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} strokeWidth={2.5} />
            )}
            <span className="font-semibold">
                {isDark ? 'Hell' : 'Dunkel'}
            </span>
        </button>
    )
}
