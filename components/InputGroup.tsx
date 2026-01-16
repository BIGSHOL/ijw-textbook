import React from 'react';

interface InputGroupProps {
  label: string;
  name: string;
  value: string | number;
  type?: 'text' | 'number' | 'date';
  placeholder?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

export const InputGroup: React.FC<InputGroupProps> = ({
  label,
  name,
  value,
  type = 'text',
  placeholder,
  onChange,
  className = '',
}) => {
  return (
    <div className={`flex flex-col space-y-1 ${className}`}>
      <label className="text-sm font-medium text-gray-700 ml-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green transition-colors bg-white shadow-sm"
      />
    </div>
  );
};