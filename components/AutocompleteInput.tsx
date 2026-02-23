import React, { useState, useRef, useEffect, useMemo } from 'react';

interface AutocompleteOption {
  label: string;
  sub?: string;
}

interface AutocompleteInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (option: AutocompleteOption) => void;
  options: AutocompleteOption[];
  placeholder?: string;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  label,
  value,
  onChange,
  onSelect,
  options,
  placeholder,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!value.trim()) return [];
    const q = value.toLowerCase();
    return options
      .filter(o => o.label.toLowerCase().includes(q) || (o.sub && o.sub.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [value, options]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="flex flex-col space-y-1 relative">
      <label className="text-sm font-medium text-gray-700 ml-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green transition-colors bg-white shadow-sm"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
          {filtered.map((o, i) => (
            <li
              key={i}
              className="px-4 py-2 text-sm hover:bg-green-50 cursor-pointer flex items-center justify-between"
              onMouseDown={() => { onSelect(o); setOpen(false); }}
            >
              <span className="font-medium text-gray-800">{o.label}</span>
              {o.sub && <span className="text-gray-400 text-xs">{o.sub}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
