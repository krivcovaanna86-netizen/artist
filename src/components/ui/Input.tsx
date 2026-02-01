import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-tg-text mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-2 rounded-lg border
            bg-tg-secondary-bg text-tg-text
            placeholder-tg-hint
            focus:outline-none focus:ring-2 focus:ring-tg-button focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-tg-destructive' : 'border-transparent'}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-tg-destructive">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-tg-hint">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
