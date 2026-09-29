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
      className={`glass-input mx-4 mt-3 flex items-center gap-2.5 px-4 min-h-[44px] ${className}`}
    >
      <Search className="w-[18px] h-[18px] text-white/50 flex-shrink-0" aria-hidden="true" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="flex-1 bg-transparent outline-none text-[14px] text-white placeholder:text-white/40 font-medium tracking-tight"
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
