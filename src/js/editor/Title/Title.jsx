import React from 'react';

export default function Title({ children, className, ...rest }) {
  return (
    <span
      className={`text-xs uppercase text-gray-600 font-medium mb-2 md:mb-0 ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}