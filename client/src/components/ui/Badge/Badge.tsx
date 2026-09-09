import React from 'react';

export interface BadgeProps {
  variant?: 'special' | 'gold' | 'success' | 'error' | 'warning';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'special', children, className = '' }) => {
  const variantClasses = {
    special: 'bg-primary text-white',
    gold: 'bg-[#c9a84c] text-white',
    success: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    error: 'bg-rose-100 text-rose-700 border border-rose-200',
    warning: 'bg-amber-100 text-amber-800 border border-amber-200',
  };

  return (
    <span
      className={`py-1 px-2.5 rounded-sm text-[0.68rem] font-extrabold uppercase tracking-wider inline-flex items-center ${
        variantClasses[variant] || variantClasses.special
      } ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
