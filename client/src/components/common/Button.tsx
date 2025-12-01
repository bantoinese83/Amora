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
  const baseStyles = 'transition-colors font-semibold focus:outline-none';

  const variants = {
    primary: 'bg-amora-600 text-white hover:bg-amora-500 py-3 px-4 rounded-xl',
    white: 'bg-white text-slate-900 hover:bg-slate-200 py-3 px-4 rounded-xl',
    ghost: 'text-slate-500 hover:text-slate-300 text-sm',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button className={`${baseStyles} ${variants[variant]} ${widthClass} ${className}`} {...props}>
      {children}
    </button>
  );
};
