import { memo, useMemo, type ReactNode } from 'react'
import { CircleDot, ChevronsUp, ChevronsDown, CirclePlus, CircleEllipsis, CircleSlash } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { OnlineUser, UserStatus, CollapsedSections, StatusStyleTokens } from './chatPage.types'

interface UserStatusListProps {
    awakeUsers: OnlineUser[]
    idleUsers: OnlineUser[]
    goneUsers: OnlineUser[]
    collapsedSections: CollapsedSections
    onToggleSection: (section: UserStatus) => void
    statusStyles: StatusStyleTokens
    isDark: boolean
    isModern: boolean
    currentUserId?: string
    formatLastSeen: (lastActivity: any, lastSeen: any) => string
    isMobile?: boolean
}

const STATUS_COLOR_MAP = {
    modern: {
        awake: '#60a5fa',
        idle: '#fbbf24',
        gone: '#94a3b8'
    },
    classic: {
        awake: '#4CAF50',
        idle: '#FF9800',
        gone: '#9E9E9E'
    }
} as const

const MODERN_EMPTY_STATE = (isDark: boolean) => ({
    awake: isDark ? 'text-slate-500' : 'text-emerald-500',
    idle: isDark ? 'text-amber-400/80' : 'text-amber-600',
    gone: isDark ? 'text-slate-500' : 'text-slate-400'
})

const CLASSIC_EMPTY_STATE = (isDark: boolean) => ({
    awake: isDark ? 'text-[#647bb0]' : 'text-[#6c83ca]',
    idle: isDark ? 'text-[#f3c78a]' : 'text-[#cc9966]',
    gone: isDark ? 'text-[#64748b]' : 'text-gray-400'
})

export const UserStatusList = memo(function UserStatusList({
    awakeUsers,
    idleUsers,
    goneUsers,
    collapsedSections,
    onToggleSection,
    statusStyles,
    isDark,
    isModern,
    currentUserId,
    formatLastSeen,
    isMobile = false
}: UserStatusListProps) {
    const statusColorPalette = useMemo(
        () => STATUS_COLOR_MAP[isModern ? 'modern' : 'classic'],
        [isModern]
    )

    const emptyStateClasses = useMemo(
        () => (isModern ? MODERN_EMPTY_STATE(isDark) : CLASSIC_EMPTY_STATE(isDark)),
        [isModern, isDark]
    )

    const renderUserCard = (user: OnlineUser, status: UserStatus, faded?: boolean) => {
        const variant = statusStyles[status][isDark ? 'dark' : 'light']
        const isSelfUser = user.uid === currentUserId
        const cardClass = cn(
            'flex items-center gap-3 px-2 py-2 transition-all',
            isModern ? 'px-3 py-2.5' : 'px-2 py-2',
            isSelfUser ? variant.self : variant.other,
            variant.hover,
            faded && 'opacity-60'
        )
        const iconColor = faded ? '#9E9E9E' : statusColorPalette[status]
        const initials = user.displayName?.[0]?.toUpperCase() || 'A'

        return (
            <div key={user.id} className={cardClass}>
                {isModern ? (
                    <div className="relative">
                        <Avatar
                            className={cn(
                                'h-9 w-9 border-2 shadow-sm',
                                isDark ? 'border-slate-800/60' : 'border-slate-200/80'
                            )}
                        >
                            {user.photoURL ? (
                                <AvatarImage src={user.photoURL} alt={user.displayName} />
                            ) : (
                                <AvatarFallback
                                    className={cn(
                                        'font-semibold text-xs',
                                        isDark
                                            ? 'bg-slate-800/80 text-slate-300'
                                            : 'bg-white/90 text-slate-700'
                                    )}
                                >
                                    {initials}
                                </AvatarFallback>
                            )}
                        </Avatar>
                        <span
                            className={cn(
                                'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 shadow-sm',
                                isDark ? 'border-slate-900' : 'border-white'
                            )}
                            style={{ backgroundColor: iconColor }}
                        />
                    </div>
                ) : (
                    <CircleDot className="w-3 h-3" strokeWidth={4} style={{ color: iconColor }} />
                )}
                <div className="flex-1 min-w-0">
                    <div
                        className={cn(
                            'font-medium truncate',
                            variant.text,
                            (isModern && 'text-sm') || 'text-xs'
                        )}
                    >
                        {user.displayName}
                        {isSelfUser && (
                            isModern ? (
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        'ml-2 px-1.5 py-0 text-[9px] font-semibold',
                                        isDark
                                            ? 'border-blue-400/30 bg-blue-500/10 text-blue-400'
                                            : 'border-blue-400/50 bg-blue-50/80 text-blue-600'
                                    )}
                                >
                                    Du
                                </Badge>
                            ) : (
                                ' (Du)'
                            )
                        )}
                    </div>
                    <div className={cn(variant.subText, isModern ? 'text-xs' : 'text-[10px]')}>
                        {formatLastSeen(user.lastActivity, user.lastSeen)}
                    </div>
                </div>
            </div>
        )
    }

    const renderSection = (
        status: UserStatus,
        icon: ReactNode,
        label: string,
        users: OnlineUser[],
        collapsed: boolean
    ) => (
        <section key={status}>
            <div
                className={cn(
                    'flex items-center gap-2 mb-2 cursor-pointer transition-opacity',
                    isModern ? 'hover:opacity-70' : 'hover:opacity-80',
                    (isModern && 'font-semibold') || 'font-semibold'
                )}
                onClick={() => onToggleSection(status)}
                style={{ color: statusColorPalette[status] }}
            >
                {icon}
                <span>{label}</span>
                {isModern ? (
                    <Badge
                        variant="secondary"
                        className={cn(
                            'ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            isDark
                                ? 'bg-slate-900/40 border-white/10 text-slate-300'
                                : 'bg-white/80 border-slate-200/60 text-slate-700'
                        )}
                    >
                        {users.length}
                    </Badge>
                ) : (
                    <span>({users.length})</span>
                )}
                {collapsed ? (
                    <ChevronsUp className="w-3 h-3 ml-auto" strokeWidth={2} />
                ) : (
                    <ChevronsDown className="w-3 h-3 ml-auto" strokeWidth={2} />
                )}
            </div>
            {!collapsed && (
                <div className={cn('space-y-1', isModern ? 'pl-0' : 'pl-6')}>
                    {users.length > 0 ? (
                        users.map((user) => renderUserCard(user, status, status === 'gone'))
                    ) : (
                        <div className={cn('italic pl-2', emptyStateClasses[status])}>
                            {status === 'awake' && 'Niemand ist online...'}
                            {status === 'idle' && 'Niemand ist abwesend...'}
                            {status === 'gone' && 'Niemand ist offline...'}
                        </div>
                    )}
                </div>
            )}
            {isModern && !collapsed && (
                <Separator className={cn('my-4', isDark ? 'bg-white/[0.05]' : 'bg-slate-200/50')} />
            )}
        </section>
    )

    const sections = [
        renderSection('awake', <CirclePlus className="w-5 h-5" strokeWidth={3} />, 'Online', awakeUsers, collapsedSections.awake),
        renderSection('idle', <CircleEllipsis className="w-5 h-5" strokeWidth={3} />, 'Abwesend', idleUsers, collapsedSections.idle),
        renderSection('gone', <CircleSlash className="w-5 h-5" strokeWidth={3} />, 'Offline', goneUsers, collapsedSections.gone)
    ]

    if (isModern) {
        const modernClass = cn(
            'space-y-6 text-xs',
            isDark ? 'text-slate-300' : 'text-emerald-900/80',
            isMobile ? 'px-3 py-3' : 'px-3 py-4 pr-4'
        )

        if (isMobile) {
            return <div className={modernClass}>{sections}</div>
        }

        return (
            <ScrollArea className="flex-1 h-full">
                <div className={modernClass}>{sections}</div>
            </ScrollArea>
        )
    }

    const legacyWrapper = isDark
        ? `${isMobile ? '' : 'flex-1 overflow-y-auto'} p-3 space-y-4 text-xs text-[#cbd5f5]`
        : `${isMobile ? '' : 'flex-1 overflow-y-auto'} p-3 space-y-4 text-xs`

    return <div className={legacyWrapper}>{sections}</div>
})
