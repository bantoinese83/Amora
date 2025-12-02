import React from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { cn } from '../../utils/cn';

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  children,
  className = '',
  size = 'md',
  onClick,
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [2, -2]);
  const rotateY = useTransform(x, [-100, 100], [-2, 2]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement | HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct * 100);
    y.set(yPct * 100);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const sizeClasses = {
    sm: 'col-span-1 row-span-1',
    md: 'col-span-1 md:col-span-2 row-span-1',
    lg: 'col-span-2 md:col-span-3 row-span-2',
  };

  const Component = onClick ? motion.button : motion.div;

  return (
    <Component
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={cn('h-full', sizeClasses[size], className)}
      onHoverEnd={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onClick={onClick}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
    >
      <div
        className={cn(
          'group relative flex flex-col gap-4 h-full rounded-xl p-5',
          'bg-gradient-to-b from-white/60 via-white/40 to-white/30',
          'border border-slate-200/60',
          'before:absolute before:inset-0 before:rounded-xl',
          'before:bg-gradient-to-b before:from-white/10 before:via-white/20 before:to-transparent',
          'before:opacity-100 before:transition-opacity before:duration-500',
          'after:absolute after:inset-0 after:rounded-xl after:bg-white/70 after:z-[-1]',
          'backdrop-blur-[4px]',
          'shadow-[0_4px_20px_rgb(0,0,0,0.04)]',
          'hover:border-slate-300/50',
          'hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]',
          'hover:backdrop-blur-[6px]',
          'hover:bg-gradient-to-b hover:from-white/60 hover:via-white/30 hover:to-white/20',
          'transition-all duration-500 ease-out',
          onClick && 'cursor-pointer'
        )}
        tabIndex={onClick ? 0 : undefined}
      >
        <div
          className="relative z-10 flex flex-col gap-3 h-full"
          style={{ transform: 'translateZ(20px)' }}
        >
          {children}
        </div>
      </div>
    </Component>
  );
};
