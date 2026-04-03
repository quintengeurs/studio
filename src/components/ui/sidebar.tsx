'use client';
import type { VariantProps } from 'class-variance-authority'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'
import { useIsMobile } from '@/hooks/use-mobile'
import { Skeleton } from './skeleton'

const sidebarButtonVariants = cva(
  'group flex w-full items-center justify-center rounded-md',
  {
    variants: {
      variant: {
        default:
          'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-muted',
        active:
          'text-sidebar-foreground bg-sidebar-muted',
      },
      size: {
        default: 'size-9',
        sm: 'size-8',
        lg: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

const sidebarMenuButtonVariants = cva(
  'group flex w-full items-center gap-2 rounded-md px-2 text-sm font-medium',
  {
    variants: {
      variant: {
        default:
          'text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-muted',
        active:
          'text-sidebar-foreground bg-sidebar-muted',
      },
      size: {
        default: 'h-8',
        sm: 'h-7',
        lg: 'h-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

interface SidebarContextProps {
  state: 'open' | 'closed' | 'icon'
  isMobile: boolean
  isExpanded: boolean
  isCollapsed: boolean
  isIcon: boolean
  setExpanded: (value: boolean) => void
  toggleExpanded: () => void
  close: () => void
}

const SidebarContext = React.createContext<SidebarContextProps>(
  {} as SidebarContextProps
)

const useSidebar = () => {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

interface SidebarProviderProps {
  children: React.ReactNode
  defaultOpen?: boolean
  breakpoint?: number
}

const SidebarProvider = ({ children, defaultOpen, breakpoint = 768 }: SidebarProviderProps) => {
  const isMobile = useIsMobile()
  const [isExpanded, setExpanded] = React.useState(defaultOpen)

  const state = React.useMemo(() => {
    if (isMobile) {
      return isExpanded ? 'open' : 'closed'
    }
    return isExpanded ? 'open' : 'icon'
  }, [isMobile, isExpanded])

  const value = React.useMemo(() => ({
    state,
    isMobile,
    isExpanded,
    isCollapsed: !isExpanded && !isMobile,
    isIcon: !isExpanded && !isMobile,
    setExpanded,
    toggleExpanded: () => setExpanded((v) => !v),
    close: () => setExpanded(false),
  }), [state, isMobile, isExpanded, setExpanded]);


  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  )
}

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  const { state } = useSidebar()

  return (
    <div
      ref={ref}
      data-sidebar={state}
      className={cn(
        'group fixed z-40 flex h-full flex-col justify-between border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out',
        'data-[sidebar=open]:w-56 data-[sidebar=closed]:w-0 data-[sidebar=icon]:w-14',
        className
      )}
      {...props}
    />
  )
})
Sidebar.displayName = 'Sidebar'

const SidebarOverlay = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  const { state, close } = useSidebar()

  return (
    <div
      ref={ref}
      data-sidebar-overlay={state}
      className={cn(
        'fixed inset-0 z-30 bg-black/50 transition-all duration-300 ease-in-out',
        'data-[sidebar-overlay=closed]:hidden data-[sidebar-overlay=icon]:hidden',
        className
      )}
      onClick={close}
      {...props}
    />
  )
})
SidebarOverlay.displayName = 'SidebarOverlay'

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="header"
    className={cn(
      'flex h-16 items-center border-b border-sidebar-border p-2',
      'group-data-[sidebar=icon]:justify-center',
      className
    )}
    {...props}
  />
))
SidebarHeader.displayName = 'SidebarHeader'

const SidebarHeaderTitle = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="header-title"
    className={cn(
      'px-2 text-lg font-bold',
      'group-data-[sidebar=icon]:hidden',
      className
    )}
    {...props}
  />
))
SidebarHeaderTitle.displayName = 'SidebarHeaderTitle'

const SidebarHeaderAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & VariantProps<typeof sidebarButtonVariants>
>(({ className, variant, size, ...props }, ref) => {
  const { isMobile, toggleExpanded } = useSidebar()

  return (
    <button
      ref={ref}
      data-sidebar="header-action"
      disabled={!isMobile}
      className={cn(
        sidebarButtonVariants({ variant, size }),
        'group-data-[sidebar=icon]:hidden',
        !isMobile && 'pointer-events-none opacity-0',
        className
      )}
      onClick={() => toggleExpanded()}
      {...props}
    />
  )
})
SidebarHeaderAction.displayName = 'SidebarHeaderAction'

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="content"
    className={cn('flex-1 overflow-y-auto', className)}
    {...props}
  />
))
SidebarContent.displayName = 'SidebarContent'

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="footer"
    className={cn(
      'flex flex-col gap-1 border-t border-sidebar-border p-2',
      className
    )}
    {...props}
  />
))
SidebarFooter.displayName = 'SidebarFooter'

const SidebarButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    isActive?: boolean
    tooltip?: string | React.ComponentProps<typeof TooltipContent>
  } & VariantProps<typeof sidebarButtonVariants>
>(
  (
    {
      asChild = false,
      isActive = false,
      variant = 'default',
      size = 'default',
      tooltip,
      className,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button'
    const { state } = useSidebar()

    const button = (
      <Comp
        ref={ref}
        data-sidebar="button"
        data-active={isActive}
        className={cn(sidebarButtonVariants({ variant, size, className }))}
        {...props}
      />
    )

    if (!tooltip) {
      return button
    }

    if (typeof tooltip === 'string') {
      tooltip = {
        children: tooltip,
      }
    }

    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent
            side="right"
            align="center"
            sideOffset={10}
            data-sidebar="button-tooltip"
            {...tooltip}
          />
        </Tooltip>
      </TooltipProvider>
    )
  }
)
SidebarButton.displayName = 'SidebarButton'

const SidebarToggleButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    isActive?: boolean
  } & VariantProps<typeof sidebarButtonVariants>
>(({ asChild, className, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  const { isMobile, toggleExpanded } = useSidebar()

  return (
    <Comp
      ref={ref}
      data-sidebar="toggle-button"
      disabled={isMobile}
      className={cn(
        sidebarButtonVariants({ variant: 'default' }),
        isMobile && 'pointer-events-none opacity-0',
        className
      )}
      onClick={() => toggleExpanded()}
      {...props}
    />
  )
})
SidebarToggleButton.displayName = 'SidebarToggleButton'

const SidebarMenu = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="menu"
    className={cn('flex flex-col gap-1', className)}
    {...props}
  />
))
SidebarMenu.displayName = 'SidebarMenu'

const SidebarMenuGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    label?: string
    collapsible?: 'icon' | 'default'
  }
>(({ label, collapsible = 'default', className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="menu-group"
    data-collapsible={collapsible}
    className={cn('flex flex-col gap-1', className)}
    {...props}
  />
))
SidebarMenuGroup.displayName = 'SidebarMenuGroup'

const SidebarMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="menu-label"
    className={cn(
      'px-2 py-1 text-xs font-semibold text-sidebar-foreground/50',
      'group-data-[sidebar=icon]:hidden',
      className
    )}
    {...props}
  />
))
SidebarMenuLabel.displayName = 'SidebarMenuLabel'

const SidebarMenuSeparator = React.forwardRef<
  HTMLHRElement,
  React.ComponentProps<"hr">
>(({ className, ...props }, ref) => (
  <hr
    ref={ref}
    data-sidebar="menu-separator"
    className={cn(
      'my-1 border-sidebar-border',
      'group-data-[sidebar=icon]:mx-2',
      className
    )}
    {...props}
  />
))
SidebarMenuSeparator.displayName = 'SidebarMenuSeparator'

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    isActive?: boolean
    tooltip?: string | React.ComponentProps<typeof TooltipContent>
  } & VariantProps<typeof sidebarMenuButtonVariants>
>(
  (
    {
      asChild = false,
      isActive = false,
      variant = 'default',
      size = 'default',
      tooltip,
      className,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button'
    const { isMobile, state } = useSidebar()

    const button = (
      <Comp
        ref={ref}
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
        className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
        {...props}
      />
    )

    if (!tooltip) {
      return button
    }

    if (typeof tooltip === 'string') {
      tooltip = {
        children: tooltip,
      }
    }

    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent
            side="right"
            align="center"
            sideOffset={10}
            data-sidebar="button-tooltip"
            {...tooltip}
          />
        </Tooltip>
      </TooltipProvider>
    )
  }
)
SidebarMenuButton.displayName = 'SidebarMenuButton'

const SidebarMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    showIcon?: boolean
  }
>(({ className, showIcon = false, ...props }, ref) => {
  // Random width between 50 to 90%.
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`
  }, [])

  return (
    <div
      ref={ref}
      data-sidebar="menu-skeleton"
      className={cn('h-8 flex-1 animate-pulse', className)}
      style={{
        maxWidth: width,
      }}
      {...props}
    />
  )
})
SidebarMenuSkeleton.displayName = 'SidebarMenuSkeleton'

const SidebarMenuSub = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu-sub"
    className={cn(
      'mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5',
      'group-data-[collapsible=icon]:hidden',
      className
    )}
    {...props}
  />
))
SidebarMenuSub.displayName = 'SidebarMenuSub'

const SidebarMenuSubItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ ...props }, ref) => <li ref={ref} {...props} />)
SidebarMenuSubItem.displayName = 'SidebarMenuSubItem'

const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<"a"> & {
    asChild?: boolean
    size?: 'sm' | 'md'
    isActive?: boolean
  }
>(({ asChild = false, size = 'md', isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : 'a'

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 text-sm font-medium',
        'text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-muted',
        'data-[size=sm]:h-7 data-[size=md]:h-8',
        'data-[active=true]:text-sidebar-foreground data-[active=true]:bg-sidebar-muted',
        className
      )}
      {...props}
    />
  )
})
SidebarMenuSubButton.displayName = 'SidebarMenuSubButton'

export {
  SidebarProvider,
  useSidebar,
  Sidebar,
  SidebarOverlay,
  SidebarHeader,
  SidebarHeaderTitle,
  SidebarHeaderAction,
  SidebarContent,
  SidebarFooter,
  SidebarButton,
  SidebarToggleButton,
  SidebarMenu,
  SidebarMenuGroup,
  SidebarMenuLabel,
  SidebarMenuSeparator,
  SidebarMenuButton,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
}
export type { VariantProps as SidebarButtonVariantProps } from 'class-variance-authority'
