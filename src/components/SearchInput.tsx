import React, { useState, useRef } from "react";

interface SearchInputProps {
  onSearch: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  placeholder = "Buscar...",
  debounceMs = 300,
}) => {
  const [value, setValue] = useState("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(val);
    }, debounceMs);
  };

  const handleClear = () => {
    setValue("");
    onSearch("");
  };

  return (
    <div className="relative flex items-center w-full max-w-xs">
      <span className="absolute left-3 text-[#b0b0b0] pointer-events-none">
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99a1 1 0 001.41-1.41l-4.99-5zm-6 0C8.01 14 6 11.99 6 9.5S8.01 5 10.5 5 15 7.01 15 9.5 12.99 14 10.5 14z" fill="currentColor" />
        </svg>
      </span>
      <input
        type="text"
        className="pl-10 pr-8 py-2 border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9800] w-full text-sm text-[#222] bg-white placeholder-[#b0b0b0]"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        aria-label="Buscar"
      />
      {value && (
        <button
          type="button"
          className="absolute right-2 text-[#b0b0b0] hover:text-[#FF9800] focus:outline-none"
          onClick={handleClear}
          aria-label="Limpar busca"
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}; 