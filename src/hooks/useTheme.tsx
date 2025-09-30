import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
    theme: Theme
    setTheme: (theme: Theme) => void
    toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const THEME_STORAGE_KEY = 'alles-bene-theme'

const getPreferredTheme = (): Theme => {
    if (typeof window === 'undefined') {
        return 'light'
    }

    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') {
        return stored
    }

    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(getPreferredTheme)

    useEffect(() => {
        if (typeof document === 'undefined') {
            return
        }

        const root = document.documentElement
        const body = document.body

        root.setAttribute('data-theme', theme)
        body.classList.toggle('theme-dark', theme === 'dark')
        body.classList.toggle('theme-light', theme === 'light')

        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, theme)
        } catch {
            // localStorage kann im privaten Modus fehlen – ignoriere Fehler bewusst
        }
    }, [theme])

    const value = useMemo<ThemeContextValue>(() => ({
        theme,
        setTheme: (next: Theme) => setThemeState(next),
        toggleTheme: () => setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'))
    }), [theme])

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}

