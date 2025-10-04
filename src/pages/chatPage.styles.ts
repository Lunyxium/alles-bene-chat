import type { LayoutClassTokens, StatusStyleTokens, ChatLayoutMode } from './chatPage.types'

type ThemeScale = 'dark' | 'light'

type LayoutScaleMap = Record<ChatLayoutMode, Record<ThemeScale, LayoutClassTokens>>

type StatusScaleMap = Record<ChatLayoutMode, StatusStyleTokens>

const classicTokens: Record<ThemeScale, LayoutClassTokens> = {
    dark: {
        pageBackgroundClass: 'bg-gradient-to-br from-[#0b1120] via-[#10172a] to-[#0f172a]',
        cardShellClass: 'border border-[#1d3a7a] bg-[#0f172a]/95 backdrop-blur-sm shadow-[0_20px_45px_rgba(8,47,73,0.45)] text-[#e2e8f0]',
        innerPanelBackground: 'bg-[#0f172a]/95',
        headerGradientClass: 'bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#1e3a8a]',
        headerMutedTextClass: 'text-[#93c5fd]',
        chatBoardContainerClass: 'border border-[#1d3a7a] bg-[#0f172a] shadow-[0_12px_30px_rgba(8,47,73,0.25)]',
        chatBarContainerClass: 'border border-[#1d3a7a] bg-[#101a32]/95 shadow-[0_10px_20px_rgba(8,47,73,0.25)] backdrop-blur',
        mobileListContainerClass: 'border border-[#1d3a7a] bg-[#101a32]/95 shadow-[0_12px_28px_rgba(8,47,73,0.3)]',
        sidebarContainerClass: 'border border-[#1d3a7a] bg-[#101a32]/95 shadow-[0_12px_28px_rgba(8,47,73,0.28)]',
        sidebarHeaderClass: 'bg-gradient-to-r from-[#1e3a8a]/80 via-[#1d4ed8]/70 to-[#1e3a8a]/80 border-b border-[#243b73] text-[#bfdbfe]',
        sidebarFooterClass: 'border-t border-[#243b73] bg-[#0f1a33]',
        debugPanelClass: 'border-t border-[#243b73] bg-[#0f172a]/90 text-[#9fb7dd]',
        debugLabelClass: 'text-[#7d90c5]',
        debugValueClass: 'text-[#dbeafe]',
        debugValueAccentClass: 'text-[#93c5fd]',
        mobileToggleButtonClass: 'inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition',
        backgroundGlowTopLeft: 'bg-[radial-gradient(circle,#1e3a8a33,transparent_70%)]',
        backgroundGlowTopRight: 'bg-[radial-gradient(circle,#1d4ed820,transparent_70%)]',
        backgroundGlowBottom: 'bg-[radial-gradient(circle,#312e8130,transparent_70%)]',
        actionButtonClassMobile: 'flex w-full items-center justify-center gap-1.5 rounded-md border border-[#1d3a7a] bg-[#14203d] px-3 py-2 text-[11px] font-medium text-[#bfdbfe] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-transform hover:-translate-y-[0.5px] disabled:cursor-not-allowed disabled:opacity-60',
        actionButtonClassDesktop: 'w-full rounded-md border border-[#1d3a7a] bg-[#14203d] px-3 py-1.5 text-[11px] font-medium text-[#bfdbfe] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-transform hover:-translate-y-[0.5px] disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-1.5',
        modalOverlayClass: 'fixed inset-0 bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4',
        shareCardClass: 'relative w-full max-w-md rounded-2xl border border-[#1d3a7a] bg-[#0f172a]/95 text-[#dbeafe] shadow-[0_18px_40px_rgba(8,47,73,0.55)] p-6',
        shareGlowClass: 'absolute -top-8 right-8 w-24 h-24 bg-[radial-gradient(circle,#1d4ed820,transparent_70%)] blur-xl',
        shareHeadingClass: 'text-lg font-semibold text-[#dbeafe]',
        shareTextClass: 'mt-2 text-sm text-[#9fb7dd]',
        shareInputClass: 'mt-4 w-full rounded-md border border-[#1d3a7a] bg-[#0b1225] px-3 py-2 text-sm text-[#bfdbfe] focus:outline-none focus:border-[#60a5fa] focus:ring-2 focus:ring-[#1d4ed8]',
        shareButtonClass: 'rounded-md border border-[#1d3a7a] bg-[#14203d] px-3 py-2 text-[#bfdbfe] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-transform hover:-translate-y-[2px]',
        logoutCardClass: 'relative w-full max-w-md rounded-2xl border border-[#1d3a7a] bg-[#0f172a]/95 text-[#dbeafe] shadow-[0_18px_40px_rgba(8,47,73,0.55)] p-6',
        logoutGlowClass: 'absolute -top-8 right-8 w-24 h-24 bg-[radial-gradient(circle,#1d4ed820,transparent_70%)] blur-xl',
        logoutIconWrapClass: 'w-10 h-10 rounded-full border border-[#b91c1c] bg-gradient-to-b from-[#3f1d1d] to-[#2c1515] flex items-center justify-center',
        logoutTitleClass: 'text-lg font-semibold text-[#dbeafe]',
        logoutSubtitleClass: 'text-xs text-[#93c5fd]',
        logoutInfoBoxClass: 'bg-[#101a32] border border-[#1d3a7a] rounded-lg p-4 mb-4',
        logoutInfoTextClass: 'text-sm text-[#bfdbfe]',
        logoutInfoSubTextClass: 'text-xs text-[#93c5fd] mt-2',
        logoutCancelButtonClass: 'flex-1 rounded-md border border-[#1d3a7a] bg-[#14203d] px-3 py-2 text-sm font-medium text-[#bfdbfe] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-transform hover:-translate-y-[1px]',
        logoutConfirmButtonClass: 'flex-1 rounded-md border border-[#b91c1c] bg-gradient-to-b from-[#451a1a] to-[#2d0f0f] px-3 py-2 text-sm font-semibold text-[#fca5a5] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-transform hover:-translate-y-[1px]'
    },
    light: {
        pageBackgroundClass: 'bg-gradient-to-br from-[#9ecdfb] via-[#c2dcff] to-[#f1f6ff]',
        cardShellClass: 'border border-[#7fa6f7] bg-white/95 backdrop-blur-[6px] shadow-[0_20px_45px_rgba(30,64,175,0.2)] text-[#1f3b92]',
        innerPanelBackground: 'bg-white/95',
        headerGradientClass: 'bg-gradient-to-r from-[#2c5ad6] via-[#4675f5] to-[#2c5ad6]',
        headerMutedTextClass: 'text-[#cfe0ff]',
        chatBoardContainerClass: 'border border-[#7fa6f7] bg-gradient-to-br from-white/90 via-white/96 to-[#dbeafe]/95 shadow-[0_12px_30px_rgba(30,64,175,0.22)]',
        chatBarContainerClass: 'border border-[#7fa6f7] bg-gradient-to-br from-white/95 to-white/85 shadow-[0_10px_24px_rgba(30,64,175,0.2)] backdrop-blur',
        mobileListContainerClass: 'border border-[#7fa6f7] bg-gradient-to-b from-white/95 to-[#e8f1ff]/90 shadow-[0_12px_28px_rgba(30,64,175,0.2)]',
        sidebarContainerClass: 'border border-[#7fa6f7] bg-gradient-to-b from-white/95 to-[#e8f1ff]/90 shadow-[0_12px_28px_rgba(30,64,175,0.2)]',
        sidebarHeaderClass: 'bg-gradient-to-r from-[#2c5ad6]/80 via-[#4675f5]/70 to-[#2c5ad6]/80 border-b border-[#7fa6f7] text-white',
        sidebarFooterClass: 'border-t border-[#7fa6f7] bg-[#e1edff]/70',
        debugPanelClass: 'border-t border-[#7fa6f7] bg-[#e1edff]/80 text-[#1e3a8a]',
        debugLabelClass: 'text-[#3153c3]',
        debugValueClass: 'text-[#1d4ed8]',
        debugValueAccentClass: 'text-[#0f172a]',
        mobileToggleButtonClass: 'inline-flex items-center gap-1 rounded-full bg-white/30 px-3 py-1.5 text-[11px] font-semibold text-[#1f3b92] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition',
        backgroundGlowTopLeft: 'bg-[radial-gradient(circle,#3b82f633,transparent_70%)]',
        backgroundGlowTopRight: 'bg-[radial-gradient(circle,#60a5fa20,transparent_70%)]',
        backgroundGlowBottom: 'bg-[radial-gradient(circle,#60a5fa20,transparent_70%)]',
        actionButtonClassMobile: 'flex w-full items-center justify-center gap-1.5 rounded-md border border-[#7fa6f7] bg-white/90 px-3 py-2 text-[11px] font-medium text-[#1f3b92] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-transform hover:-translate-y-[0.5px] disabled:cursor-not-allowed disabled:opacity-60',
        actionButtonClassDesktop: 'w-full rounded-md border border-[#7fa6f7] bg-white/90 px-3 py-1.5 text-[11px] font-medium text-[#1f3b92] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-transform hover:-translate-y-[0.5px] disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-1.5',
        modalOverlayClass: 'fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50 p-4',
        shareCardClass: 'relative w-full max-w-md rounded-2xl border border-[#7fa6f7] bg-white/95 text-[#1f3b92] shadow-[0_18px_40px_rgba(30,64,175,0.25)] p-6',
        shareGlowClass: 'absolute -top-8 right-8 w-24 h-24 bg-[radial-gradient(circle,#60a5fa30,transparent_70%)] blur-xl',
        shareHeadingClass: 'text-lg font-semibold text-[#1f3b92]',
        shareTextClass: 'mt-2 text-sm text-[#1f3b92]/80',
        shareInputClass: 'mt-4 w-full rounded-md border border-[#7fa6f7] bg-white px-3 py-2 text-sm text-[#1f3b92] focus:outline-none focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#60a5fa]',
        shareButtonClass: 'rounded-md border border-[#7fa6f7] bg-white px-3 py-2 text-[#1f3b92] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-transform hover:-translate-y-[2px]',
        logoutCardClass: 'relative w-full max-w-md rounded-2xl border border-[#7fa6f7] bg-white/95 text-[#1f3b92] shadow-[0_18px_40px_rgba(30,64,175,0.25)] p-6',
        logoutGlowClass: 'absolute -top-8 right-8 w-24 h-24 bg-[radial-gradient(circle,#60a5fa30,transparent_70%)] blur-xl',
        logoutIconWrapClass: 'w-10 h-10 rounded-full border border-[#f97316] bg-gradient-to-b from-[#fed7aa] to-[#fdba74] flex items-center justify-center',
        logoutTitleClass: 'text-lg font-semibold text-[#1f3b92]',
        logoutSubtitleClass: 'text-xs text-[#1f3b92]/80',
        logoutInfoBoxClass: 'bg-[#e1edff]/80 border border-[#7fa6f7] rounded-lg p-4 mb-4',
        logoutInfoTextClass: 'text-sm text-[#1f3b92]',
        logoutInfoSubTextClass: 'text-xs text-[#1f3b92]/80 mt-2',
        logoutCancelButtonClass: 'flex-1 rounded-md border border-[#7fa6f7] bg-white px-3 py-2 text-sm font-medium text-[#1f3b92] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-transform hover:-translate-y-[1px]',
        logoutConfirmButtonClass: 'flex-1 rounded-md border border-[#f97316] bg-gradient-to-b from-[#fed7aa] to-[#fdba74] px-3 py-2 text-sm font-semibold text-[#b45309] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-transform hover:-translate-y-[1px]'
    }
}

const modernTokens: Record<ThemeScale, LayoutClassTokens> = {
    dark: {
        pageBackgroundClass: 'bg-slate-950',
        cardShellClass: 'border border-white/[0.05] bg-slate-950/90 backdrop-blur-2xl shadow-[0px_40px_120px_rgba(15,23,42,0.55)] text-slate-50 rounded-[32px] overflow-hidden',
        innerPanelBackground: 'bg-slate-950/90',
        headerGradientClass: 'bg-gradient-to-r from-blue-500/20 via-cyan-400/20 to-blue-500/20',
        headerMutedTextClass: 'text-slate-300/90',
        chatBoardContainerClass: 'border border-white/[0.06] bg-slate-950/60 backdrop-blur-2xl shadow-[0px_30px_80px_rgba(15,23,42,0.6)]',
        chatBarContainerClass: 'border border-white/[0.08] bg-slate-950/70 backdrop-blur-2xl shadow-[0_20px_60px_rgba(15,23,42,0.55)]',
        mobileListContainerClass: 'border border-white/[0.06] bg-slate-950/70 backdrop-blur-2xl shadow-[0_24px_70px_rgba(15,23,42,0.65)]',
        sidebarContainerClass: 'border border-white/[0.06] bg-slate-950/70 backdrop-blur-2xl shadow-[0_24px_70px_rgba(15,23,42,0.65)]',
        sidebarHeaderClass: 'bg-gradient-to-r from-white/[0.04] to-white/[0.02] border-b border-white/[0.06] text-slate-100',
        sidebarFooterClass: 'border-t border-white/[0.04] bg-white/[0.01]',
        debugPanelClass: 'border-t border-white/[0.04] bg-white/[0.02] text-slate-300',
        debugLabelClass: 'text-slate-500',
        debugValueClass: 'text-slate-200',
        debugValueAccentClass: 'text-blue-300',
        mobileToggleButtonClass: 'inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.55)] transition-all',
        backgroundGlowTopLeft: 'bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.15),transparent_55%)]',
        backgroundGlowTopRight: 'bg-[radial-gradient(circle_at_80%_20%,rgba(56,189,248,0.12),transparent_55%)]',
        backgroundGlowBottom: 'bg-[radial-gradient(circle_at_50%_90%,rgba(139,92,246,0.12),transparent_55%)]',
        actionButtonClassMobile: 'flex w-full items-center justify-center gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-xs font-medium text-white/90 shadow-[0px_18px_60px_rgba(15,23,42,0.55)] transition-all duration-300 hover:bg-white/[0.05] hover:-translate-y-0.5 hover:shadow-[0px_25px_80px_rgba(15,23,42,0.65)] disabled:cursor-not-allowed disabled:opacity-60',
        actionButtonClassDesktop: 'w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-xs font-medium text-white/90 shadow-[0px_18px_60px_rgba(15,23,42,0.55)] transition-all duration-300 hover:bg-white/[0.05] hover:-translate-y-0.5 hover:shadow-[0px_25px_80px_rgba(15,23,42,0.65)] disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2.5',
        modalOverlayClass: 'fixed inset-0 bg-slate-950/80 backdrop-blur-[40px] flex items-center justify-center z-50 p-4',
        shareCardClass: 'relative w-full max-w-md rounded-3xl border border-white/40 bg-white/12 backdrop-blur-[60px] text-white shadow-[0px_45px_140px_rgba(15,23,42,0.55)] p-10 ring-2 ring-white/30',
        shareGlowClass: 'absolute -top-16 right-16 w-40 h-40 bg-[radial-gradient(circle,rgba(59,130,246,0.22),transparent_65%)] blur-[60px]',
        shareHeadingClass: 'text-2xl font-semibold text-white/95 tracking-tight',
        shareTextClass: 'mt-4 text-sm text-slate-300/90 leading-relaxed',
        shareInputClass: 'mt-6 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-3.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-400/60 focus:ring-4 focus:ring-blue-400/10 transition-all duration-200',
        shareButtonClass: 'rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-white/90 font-medium shadow-[0px_18px_60px_rgba(15,23,42,0.55)] transition-all duration-300 hover:bg-white/[0.05] hover:-translate-y-0.5 hover:shadow-[0px_25px_80px_rgba(15,23,42,0.65)]',
        logoutCardClass: 'w-full max-w-md rounded-3xl border border-white/45 bg-white/12 backdrop-blur-[60px] text-white shadow-[0px_45px_140px_rgba(15,23,42,0.6)] p-10 ring-2 ring-white/25',
        logoutGlowClass: 'absolute -top-16 right-16 w-40 h-40 bg-[radial-gradient(circle,rgba(248,113,113,0.25),transparent_65%)] blur-[60px]',
        logoutIconWrapClass: 'w-14 h-14 rounded-2xl border border-white/[0.08] bg-red-500/20 flex items-center justify-center shadow-[0px_18px_60px_rgba(239,68,68,0.4)]',
        logoutTitleClass: 'text-2xl font-semibold text-white/95 tracking-tight',
        logoutSubtitleClass: 'text-sm text-slate-300/90',
        logoutInfoBoxClass: 'bg-white/[0.04] border border-white/[0.06] rounded-2xl p-6 mb-6',
        logoutInfoTextClass: 'text-sm text-slate-200 leading-relaxed',
        logoutInfoSubTextClass: 'text-xs text-slate-400 mt-3',
        logoutCancelButtonClass: 'flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-medium text-white/90 shadow-[0px_18px_60px_rgba(15,23,42,0.55)] transition-all duration-300 hover:bg-white/[0.05] hover:-translate-y-0.5 hover:shadow-[0px_25px_80px_rgba(15,23,42,0.65)]',
        logoutConfirmButtonClass: 'flex-1 rounded-2xl border border-red-300/40 bg-red-500/20 px-5 py-3 text-sm font-semibold text-red-200 shadow-[0px_18px_60px_rgba(239,68,68,0.35)] transition-all duration-300 hover:bg-red-500/25 hover:-translate-y-0.5 hover:shadow-[0px_30px_90px_rgba(239,68,68,0.45)]'
    },
    light: {
        pageBackgroundClass: 'bg-[#f8fafc]',
        cardShellClass: 'border border-slate-200/80 bg-white/90 backdrop-blur-2xl shadow-[0px_40px_120px_rgba(15,23,42,0.08)] text-slate-900 rounded-[32px] overflow-hidden',
        innerPanelBackground: 'bg-white/95',
        headerGradientClass: 'bg-gradient-to-r from-blue-500/10 via-cyan-400/10 to-blue-500/10',
        headerMutedTextClass: 'text-slate-500',
        chatBoardContainerClass: 'border border-slate-200/80 bg-white/90 backdrop-blur-2xl shadow-[0px_30px_80px_rgba(15,23,42,0.12)]',
        chatBarContainerClass: 'border border-slate-200/80 bg-white/95 backdrop-blur-2xl shadow-[0px_20px_60px_rgba(15,23,42,0.12)]',
        mobileListContainerClass: 'border border-slate-200/80 bg-white/90 backdrop-blur-2xl shadow-[0px_24px_70px_rgba(15,23,42,0.14)]',
        sidebarContainerClass: 'border border-slate-200/80 bg-white/90 backdrop-blur-2xl shadow-[0px_24px_70px_rgba(15,23,42,0.14)]',
        sidebarHeaderClass: 'bg-gradient-to-r from-white/[0.8] to-white/[0.6] border-b border-slate-200/80 text-slate-900',
        sidebarFooterClass: 'border-t border-slate-200/80 bg-white/80',
        debugPanelClass: 'border-t border-slate-200/80 bg-slate-50/90 text-slate-600',
        debugLabelClass: 'text-slate-500',
        debugValueClass: 'text-slate-900',
        debugValueAccentClass: 'text-blue-500',
        mobileToggleButtonClass: 'inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-[0_8px_26px_rgba(15,23,42,0.08)] transition-all',
        backgroundGlowTopLeft: 'bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.08),transparent_60%)]',
        backgroundGlowTopRight: 'bg-[radial-gradient(circle_at_70%_20%,rgba(139,92,246,0.06),transparent_60%)]',
        backgroundGlowBottom: 'bg-[radial-gradient(circle_at_50%_90%,rgba(59,130,246,0.05),transparent_60%)]',
        actionButtonClassMobile: 'flex w-full items-center justify-center gap-2.5 rounded-2xl border border-slate-300/80 bg-white/90 backdrop-blur-xl px-5 py-3 text-xs font-medium text-slate-800 shadow-[0_4px_20px_rgba(15,23,42,0.1),inset_0_1px_0_rgba(255,255,255,1)] transition-all duration-300 hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(15,23,42,0.15)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0',
        actionButtonClassDesktop: 'w-full rounded-2xl border border-slate-300/80 bg-white/90 backdrop-blur-xl px-5 py-2.5 text-xs font-medium text-slate-800 shadow-[0_4px_20px_rgba(15,23,42,0.1),inset_0_1px_0_rgba(255,255,255,1)] transition-all duration-300 hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(15,23,42,0.15)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2.5',
        modalOverlayClass: 'fixed inset-0 bg-slate-900/30 backdrop-blur-2xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-300',
        shareCardClass: 'w-full max-w-md rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-[40px] text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.15),inset_0_1px_0_rgba(255,255,255,1)] p-10 animate-in zoom-in-95 duration-300',
        shareGlowClass: 'absolute -top-16 right-16 w-40 h-40 bg-[radial-gradient(circle,rgba(99,102,241,0.12),transparent_65%)] blur-[60px]',
        shareHeadingClass: 'text-2xl font-semibold text-slate-900 tracking-tight',
        shareTextClass: 'mt-4 text-sm text-slate-700 leading-relaxed',
        shareInputClass: 'mt-6 w-full rounded-2xl border border-slate-300/80 bg-white/95 backdrop-blur-xl px-5 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-400/60 focus:ring-4 focus:ring-blue-400/10 transition-all duration-200',
        shareButtonClass: 'rounded-2xl border border-slate-300/80 bg-white/95 backdrop-blur-xl px-5 py-3 text-slate-800 font-medium shadow-[0_4px_20px_rgba(15,23,42,0.1),inset_0_1px_0_rgba(255,255,255,1)] transition-all duration-300 hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(15,23,42,0.15)]',
        logoutCardClass: 'w-full max-w-md rounded-3xl border border-red-200/80 bg-white/95 backdrop-blur-[40px] text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.15),inset_0_1px_0_rgba(255,255,255,1)] p-10 animate-in zoom-in-95 duration-300',
        logoutGlowClass: 'absolute -top-16 right-16 w-40 h-40 bg-[radial-gradient(circle,rgba(239,68,68,0.1),transparent_65%)] blur-[60px]',
        logoutIconWrapClass: 'w-14 h-14 rounded-2xl border border-red-300/80 bg-red-50/90 backdrop-blur-xl flex items-center justify-center shadow-[0_4px_20px_rgba(239,68,68,0.1)]',
        logoutTitleClass: 'text-2xl font-semibold text-slate-900 tracking-tight',
        logoutSubtitleClass: 'text-sm text-slate-700',
        logoutInfoBoxClass: 'bg-slate-50/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-6 mb-6',
        logoutInfoTextClass: 'text-sm text-slate-900 leading-relaxed',
        logoutInfoSubTextClass: 'text-xs text-slate-700 mt-3',
        logoutCancelButtonClass: 'flex-1 rounded-2xl border border-slate-300/80 bg-white/90 backdrop-blur-xl px-5 py-3 text-sm font-medium text-slate-800 shadow-[0_4px_20px_rgba(15,23,42,0.1),inset_0_1px_0_rgba(255,255,255,1)] transition-all duration-300 hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(15,23,42,0.15)]',
        logoutConfirmButtonClass: 'flex-1 rounded-2xl border border-red-300/80 bg-red-50/90 backdrop-blur-xl px-5 py-3 text-sm font-semibold text-red-600 shadow-[0_4px_20px_rgba(239,68,68,0.12),inset_0_1px_0_rgba(239,68,68,0.05)] transition-all duration-300 hover:bg-red-50 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(239,68,68,0.18)]'
    }
}

const layoutTokenMap: LayoutScaleMap = {
    classic: classicTokens,
    modern: modernTokens
}

const classicStatusStyles: StatusStyleTokens = {
    awake: {
        dark: {
            self: 'border border-[#1e3a7a] bg-[#12213d]',
            other: 'border border-transparent',
            hover: 'hover:bg-[#1b2d4b]',
            text: 'text-[#dbeafe]',
            subText: 'text-[#93c5fd]'
        },
        light: {
            self: 'border border-[#c7d9ff] bg-[#f0f7ff]',
            other: 'border border-transparent',
            hover: 'hover:bg-[#e5f3ff]',
            text: 'text-[#0f3fae]',
            subText: 'text-[#6c83ca]'
        }
    },
    idle: {
        dark: {
            self: 'border border-[#f97316] bg-[#3a2614]',
            other: 'border border-transparent',
            hover: 'hover:bg-[#4a2f17]',
            text: 'text-[#facc15]',
            subText: 'text-[#fbd38d]'
        },
        light: {
            self: 'border border-[#ffd9b3] bg-[#fff8f0]',
            other: 'border border-transparent',
            hover: 'hover:bg-[#fff3e0]',
            text: 'text-[#b87100]',
            subText: 'text-[#cc9966]'
        }
    },
    gone: {
        dark: {
            self: 'border border-[#334155] bg-[#111827]',
            other: 'border border-transparent',
            hover: 'hover:bg-[#1f2937]',
            text: 'text-[#cbd5f5]',
            subText: 'text-[#94a3b8]'
        },
        light: {
            self: 'border border-gray-200 bg-gray-50',
            other: 'border border-transparent',
            hover: 'hover:bg-gray-50',
            text: 'text-gray-600',
            subText: 'text-gray-400'
        }
    }
}

const modernStatusStyles: StatusStyleTokens = {
    awake: {
        dark: {
            self: 'border border-blue-400/15 bg-blue-500/8 backdrop-blur-xl shadow-[0_4px_20px_rgba(59,130,246,0.12),inset_0_1px_0_rgba(59,130,246,0.1)] rounded-2xl',
            other: 'border border-white/[0.03] bg-slate-900/15 backdrop-blur-xl rounded-2xl',
            hover: 'hover:bg-slate-900/25 hover:-translate-y-0.5 transition-all duration-200',
            text: 'text-slate-100',
            subText: 'text-slate-400'
        },
        light: {
            self: 'border border-blue-300/50 bg-blue-50/90 backdrop-blur-xl shadow-[0_2px_16px_rgba(59,130,246,0.08),inset_0_1px_0_rgba(255,255,255,1)] rounded-2xl',
            other: 'border border-slate-200/60 bg-white/80 backdrop-blur-xl rounded-2xl',
            hover: 'hover:bg-white/95 hover:-translate-y-0.5 transition-all duration-200',
            text: 'text-slate-900',
            subText: 'text-slate-700'
        }
    },
    idle: {
        dark: {
            self: 'border border-amber-400/15 bg-amber-500/8 backdrop-blur-xl shadow-[0_4px_20px_rgba(245,158,11,0.12),inset_0_1px_0_rgba(245,158,11,0.1)] rounded-2xl',
            other: 'border border-white/[0.03] bg-slate-900/15 backdrop-blur-xl rounded-2xl',
            hover: 'hover:bg-slate-900/25 hover:-translate-y-0.5 transition-all duration-200',
            text: 'text-amber-200',
            subText: 'text-amber-400/80'
        },
        light: {
            self: 'border border-amber-300/50 bg-amber-50/90 backdrop-blur-xl shadow-[0_2px_16px_rgba(245,158,11,0.08),inset_0_1px_0_rgba(255,255,255,1)] rounded-2xl',
            other: 'border border-slate-200/60 bg-white/80 backdrop-blur-xl rounded-2xl',
            hover: 'hover:bg-white/95 hover:-translate-y-0.5 transition-all duration-200',
            text: 'text-amber-900',
            subText: 'text-amber-800'
        }
    },
    gone: {
        dark: {
            self: 'border border-white/[0.03] bg-slate-900/15 backdrop-blur-xl rounded-2xl',
            other: 'border border-white/[0.02] bg-slate-900/10 backdrop-blur-xl rounded-2xl',
            hover: 'hover:bg-slate-900/20 hover:-translate-y-0.5 transition-all duration-200',
            text: 'text-slate-400',
            subText: 'text-slate-500'
        },
        light: {
            self: 'border border-slate-200/60 bg-slate-50/80 backdrop-blur-xl rounded-2xl',
            other: 'border border-slate-200/50 bg-white/70 backdrop-blur-xl rounded-2xl',
            hover: 'hover:bg-slate-50/90 hover:-translate-y-0.5 transition-all duration-200',
            text: 'text-slate-700',
            subText: 'text-slate-600'
        }
    }
}

const statusTokenMap: StatusScaleMap = {
    classic: classicStatusStyles,
    modern: modernStatusStyles
}

const headerColorMap: Record<ChatLayoutMode, { awake: string; idle: string }> = {
    classic: { awake: '#4CAF50', idle: '#FF9800' },
    modern: { awake: '#38bdf8', idle: '#f59e0b' }
}

export function getLayoutClassTokens(layout: ChatLayoutMode, theme: ThemeScale): LayoutClassTokens {
    return layoutTokenMap[layout][theme]
}

export function getStatusStyleTokens(layout: ChatLayoutMode): StatusStyleTokens {
    return statusTokenMap[layout]
}

export function getHeaderStatusColors(layout: ChatLayoutMode) {
    return headerColorMap[layout]
}
