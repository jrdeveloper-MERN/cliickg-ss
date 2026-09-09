import React, { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-slate-700"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full py-2.5 px-3.5 rounded-md outline-none text-sm font-sans bg-white text-slate-800 transition-colors ${
          error ? 'border border-rose-500 focus:border-rose-600' : 'border border-slate-300 focus:border-primary'
        } ${className}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-rose-500 font-medium">
          {error}
        </span>
      )}
      {!error && helperText && (
        <span className="text-xs text-slate-500">
          {helperText}
        </span>
      )}
    </div>
  );
};

export default Input;
