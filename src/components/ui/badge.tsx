import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2',
    {
        variants: {
            variant: {
                default: 'border-transparent bg-[#2563eb] text-white hover:bg-[#1d4ed8]',
                secondary: 'border border-[#a5bdf5]/60 bg-[#eef3ff] text-[#1e3a8a]',
                outline: 'border border-[#cbd5f5] text-[#1e3a8a]'
            }
        },
        defaultVariants: {
            variant: 'default'
        }
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}
