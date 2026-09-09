import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  actionLink?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  actionLink,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 min-h-[380px] w-full mx-auto">
      {icon && <div className="mb-5 text-slate-400">{icon}</div>}
      <h2 className="font-serif text-3xl sm:text-4xl font-normal text-slate-800 mb-2 tracking-wide">
        {title}
      </h2>
      {description && (
        <p className="text-sm sm:text-base text-slate-500 max-w-[480px] mb-7 leading-relaxed">
          {description}
        </p>
      )}
      {actionText && (actionLink || onAction) && (
        <a
          href={actionLink || '#'}
          onClick={(e) => {
            if (onAction) {
              e.preventDefault();
              onAction();
            }
          }}
          className="bg-gradient-to-br from-[#c9a84c] to-[#a18231] text-white hover:brightness-110 shadow-btn-gold hover:shadow-lg py-2.5 px-7 rounded text-sm font-bold no-underline transition-all duration-200"
        >
          {actionText}
        </a>
      )}
    </div>
  );
};

export default EmptyState;
