export type Theme = 'light' | 'dark';

export function getTheme(): Theme {
    if (typeof window === 'undefined') return 'light'; // SSR safe
    
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored && (stored === 'light' || stored === 'dark')) {
        return stored;
    }
    
    // Fallback to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function setTheme(theme: Theme): void {
    if (typeof window === 'undefined') return; // SSR safe
    
    localStorage.setItem('theme', theme);
    
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

export function toggleTheme(): Theme {
    const current = getTheme();
    const newTheme: Theme = current === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    return newTheme;
}