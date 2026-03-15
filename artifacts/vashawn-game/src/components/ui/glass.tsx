import * as React from "react"
import { cn } from "@/lib/utils"

export const GlassCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("glass-card p-6 md:p-8", className)} {...props} />
  )
)
GlassCard.displayName = "GlassCard"

export const GlassPanel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("glass-panel", className)} {...props} />
  )
)
GlassPanel.displayName = "GlassPanel"
