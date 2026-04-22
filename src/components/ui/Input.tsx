import * as React from 'react'

import { cn } from './utils'

interface InputProps extends React.ComponentProps<'input'> {
  /** Optional visible label; renders a wrapping `<label>` with htmlFor wiring. */
  label?: React.ReactNode
  /** Optional helper or error text below the input. */
  helperText?: React.ReactNode
  /** Container className (applied to the label wrapper when `label` is set). */
  wrapperClassName?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, helperText, wrapperClassName, id, ...props }, ref) => {
    const reactId = React.useId()
    const inputId = id ?? (label ? reactId : undefined)

    const inputEl = (
      <input
        id={inputId}
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className
        )}
        ref={ref}
        {...props}
      />
    )

    if (!label && !helperText) return inputEl

    return (
      <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-content-secondary"
          >
            {label}
          </label>
        )}
        {inputEl}
        {helperText && (
          <span className="text-[11px] text-content-tertiary">{helperText}</span>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
