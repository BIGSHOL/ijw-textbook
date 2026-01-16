import React from 'react';

export const Logo: React.FC = () => {
  return (
    <div className="select-none shrink-0">
      <img
        src="/logo.png"
        alt="강의하는 아이들"
        className="h-14 w-auto object-contain"
      />
    </div>
  );
};