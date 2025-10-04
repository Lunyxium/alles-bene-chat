export type ChatLayoutMode = 'classic' | 'modern'

export type UserStatus = 'awake' | 'idle' | 'gone'

export interface OnlineUser {
    id: string
    uid?: string
    displayName: string
    email: string
    status: UserStatus
    isOnline: boolean
    lastSeen: any
    lastActivity: any
    photoURL?: string
    provider?: string
}

export type CollapsedSections = Record<UserStatus, boolean>

export interface LayoutClassTokens {
    pageBackgroundClass: string
    cardShellClass: string
    innerPanelBackground: string
    headerGradientClass: string
    headerMutedTextClass: string
    chatBoardContainerClass: string
    chatBarContainerClass: string
    mobileListContainerClass: string
    sidebarContainerClass: string
    sidebarHeaderClass: string
    sidebarFooterClass: string
    debugPanelClass: string
    debugLabelClass: string
    debugValueClass: string
    debugValueAccentClass: string
    mobileToggleButtonClass: string
    backgroundGlowTopLeft: string
    backgroundGlowTopRight: string
    backgroundGlowBottom: string
    actionButtonClassMobile: string
    actionButtonClassDesktop: string
    modalOverlayClass: string
    shareCardClass: string
    shareGlowClass: string
    shareHeadingClass: string
    shareTextClass: string
    shareInputClass: string
    shareButtonClass: string
    logoutCardClass: string
    logoutGlowClass: string
    logoutIconWrapClass: string
    logoutTitleClass: string
    logoutSubtitleClass: string
    logoutInfoBoxClass: string
    logoutInfoTextClass: string
    logoutInfoSubTextClass: string
    logoutCancelButtonClass: string
    logoutConfirmButtonClass: string
}

interface StatusCardVariant {
    self: string
    other: string
    hover: string
    text: string
    subText: string
}

type StatusAppearance = Record<'dark' | 'light', StatusCardVariant>

export interface StatusStyleTokens {
    awake: StatusAppearance
    idle: StatusAppearance
    gone: StatusAppearance
}
