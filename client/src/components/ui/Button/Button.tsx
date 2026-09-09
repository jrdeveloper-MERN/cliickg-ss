import React, { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const variantClasses = {
    primary: 'bg-primary hover:bg-primary-hover text-white shadow-brand-sm hover:shadow-brand-md border-none',
    secondary: 'bg-secondary hover:bg-secondary-hover text-slate-900 border-none shadow-sm',
    outline: 'bg-transparent text-primary hover:bg-primary hover:text-white border border-primary',
    gold: 'bg-gradient-to-br from-[#c9a84c] to-[#a18231] text-white hover:brightness-110 shadow-btn-gold hover:shadow-lg border-none',
  };

  const sizeClasses = {
    sm: 'py-1.5 px-3 text-xs',
    md: 'py-2 px-5 text-[0.82rem]',
    lg: 'py-3 px-7 text-sm',
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 font-sans font-bold uppercase tracking-wider rounded transition-all duration-200 ${
        variantClasses[variant] || variantClasses.primary
      } ${sizeClasses[size] || sizeClasses.md} ${
        disabled || isLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-1.5">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
