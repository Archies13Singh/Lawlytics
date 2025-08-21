import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export default function Input(props: InputProps) {
  return (
    <input
      {...props}
      className="border border-gray-300 rounded px-3 py-2 w-full"
    />
  );
}
