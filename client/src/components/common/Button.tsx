import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'white' | 'ghost';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  fullWidth = false,
  className = '',
  children,
  ...props
}) => {
  const baseStyles =
    'transition-all duration-200 font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none';

  const variants = {
    primary:
      'bg-amora-600 text-white hover:bg-amora-500 hover:shadow-lg hover:shadow-amora-500/25 hover:-translate-y-0.5 active:translate-y-0 py-3 px-4 rounded-xl focus:ring-amora-500',
    white:
      'bg-white text-slate-900 hover:bg-slate-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 py-3 px-4 rounded-xl focus:ring-white',
    ghost:
      'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 text-sm py-2 px-3 rounded-lg focus:ring-slate-500',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button className={`${baseStyles} ${variants[variant]} ${widthClass} ${className}`} {...props}>
      {children}
    </button>
  );
};
