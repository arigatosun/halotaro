// src/components/ui/scroll-area.tsx

import React from 'react';

interface ScrollAreaProps {
  children: React.ReactNode;
  className?: string;
}

const ScrollArea: React.FC<ScrollAreaProps> = ({ children, className }) => {
  return (
    <div className={`max-h-60 overflow-y-auto ${className}`}>
      {children}
    </div>
  );
};

export default ScrollArea;
