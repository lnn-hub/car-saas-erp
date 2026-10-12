'use client';
import { useState, useRef, useEffect } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Combobox({ value, onChange, options, placeholder, className = '', disabled }: Props) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const ref                   = useRef<HTMLDivElement>(null);
  const inputRef              = useRef<HTMLInputElement>(null);

  const filtered = query
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function select(opt: string) {
    onChange(opt);
    setQuery('');
    setOpen(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  }

  return (
    <div ref={ref} className="relative">
      <input
        ref={inputRef}
        value={open ? query : value}
        onChange={handleInputChange}
        onFocus={() => { setOpen(true); setQuery(''); }}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        autoComplete="off"
      />
      <button type="button" tabIndex={-1}
        onClick={() => { setOpen(!open); inputRef.current?.focus(); }}
        className="absolute right-0 top-0 h-full w-10 flex items-center justify-center text-[#6f6a64] hover:text-[#1c1917] transition-colors">
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 9l6 6 6-6"/></svg>
      </button>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#e6e0d8] rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.map(opt => (
            <button key={opt} type="button"
              onMouseDown={e => { e.preventDefault(); select(opt); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-[#f3efe9] transition-colors ${opt === value ? 'font-medium text-[#1c1917] bg-[#faf8f5]' : 'text-[#46413c]'}`}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
