import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-white',
    {
        variants: {
            variant: {
                default: 'bg-[#2563eb] text-white shadow-lg hover:bg-[#1d4ed8]',
                secondary: 'border border-[#c7d9ff] bg-white/90 text-[#1e3a8a] shadow hover:bg-[#e9f1ff]',
                outline: 'border border-[#a5bdf5] bg-transparent text-[#1d3a8a] hover:bg-[#e4ecff]',
                ghost: 'bg-transparent text-inherit hover:bg-black/5',
                destructive: 'bg-[#dc2626] text-white shadow hover:bg-[#b91c1c]',
                subtle: 'bg-[#0f1f3d]/80 text-[#dbeafe] hover:bg-[#142a52]'
            },
            size: {
                default: 'h-10 px-4 py-2',
                sm: 'h-9 rounded-md px-3',
                lg: 'h-11 rounded-md px-8',
                icon: 'h-9 w-9'
            }
        },
        defaultVariants: {
            variant: 'default',
            size: 'default'
        }
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button'
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)

Button.displayName = 'Button'
