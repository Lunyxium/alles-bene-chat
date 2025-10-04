import * as React from 'react'

import { cn } from '@/lib/utils'

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
    decorative?: boolean
    orientation?: 'horizontal' | 'vertical'
}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
    ({ className, orientation = 'horizontal', decorative = true, role, ...props }, ref) => {
        const ariaHidden = decorative ? true : undefined
        const separatorRole = decorative ? undefined : role ?? 'separator'

        return (
            <div
                ref={ref}
                aria-hidden={ariaHidden}
                role={separatorRole}
                className={cn(
                    'bg-slate-200/80',
                    orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
                    className
                )}
                {...props}
            />
        )
    }
)

Separator.displayName = 'Separator'
