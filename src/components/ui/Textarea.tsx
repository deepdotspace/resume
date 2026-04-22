import * as React from 'react'

import { cn } from './utils'

interface TextareaProps extends React.ComponentProps<'textarea'> {
  /** Optional visible label; renders a wrapping `<label>` with htmlFor wiring. */
  label?: React.ReactNode
  /** Optional helper or error text below the textarea. */
  helperText?: React.ReactNode
  /** Container className (applied to the label wrapper when `label` is set). */
  wrapperClassName?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, helperText, wrapperClassName, id, ...props }, ref) => {
    const reactId = React.useId()
    const textareaId = id ?? (label ? reactId : undefined)

    const textareaEl = (
      <textarea
        id={textareaId}
        className={cn(
          'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className
        )}
        ref={ref}
        {...props}
      />
    )

    if (!label && !helperText) return textareaEl

    return (
      <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
        {label && (
          <label
            htmlFor={textareaId}
            className="text-xs font-medium text-content-secondary"
          >
            {label}
          </label>
        )}
        {textareaEl}
        {helperText && (
          <span className="text-[11px] text-content-tertiary">{helperText}</span>
        )}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
