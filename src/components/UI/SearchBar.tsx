import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Buscar en la biblioteca...',
  className = '',
}) => {
  return (
    <div
      className={`relative mx-4 mt-3 rounded-full bg-white/[0.05] border border-white/[0.12] backdrop-blur-xl shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.15)] flex items-center gap-2 px-3.5 py-2 transition-all duration-200 focus-within:border-cyan-400/40 focus-within:bg-white/[0.08] focus-within:shadow-[0_0_16px_rgba(0,240,255,0.18)] ${className}`}
    >
      <Search className="w-4 h-4 text-white/40 flex-shrink-0" aria-hidden="true" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="flex-1 bg-transparent outline-none text-xs sm:text-sm text-white placeholder:text-white/30 font-medium tracking-tight"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 cursor-pointer"
          aria-label="Limpiar búsqueda"
          title="Limpiar búsqueda"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
