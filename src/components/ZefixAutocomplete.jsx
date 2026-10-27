import React, { useState, useEffect, useRef } from 'react';

export default function ZefixAutocomplete({ onSelect, className }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  const proxyUrl = import.meta.env.VITE_ZEFIX_PROXY_URL || '';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const SAMPLE_ZEFIX = [
    { name: 'Muster Bau AG', seat: 'Bern', uidFormatted: 'CHE-109.876.543 MWST', legalForm: { name: { de: 'Aktiengesellschaft (AG)' } } },
    { name: 'Muster Liegenschaften AG', seat: 'Bern', uidFormatted: 'CHE-221.334.556 MWST', legalForm: { name: { de: 'Aktiengesellschaft (AG)' } } },
    { name: 'Muster & Partner Architekten AG', seat: 'Zürich', uidFormatted: 'CHE-332.445.667 MWST', legalForm: { name: { de: 'Aktiengesellschaft (AG)' } } },
    { name: 'Muster Hotel Alpenblick AG', seat: 'Bern', uidFormatted: 'CHE-443.556.778 MWST', legalForm: { name: { de: 'Aktiengesellschaft (AG)' } } },
    { name: 'Muster Haustechnik Bern AG', seat: 'Bern', uidFormatted: 'CHE-554.667.889 MWST', legalForm: { name: { de: 'Aktiengesellschaft (AG)' } } },
    { name: 'Muster Fassadentechnik AG', seat: 'Basel', uidFormatted: 'CHE-665.778.990 MWST', legalForm: { name: { de: 'Aktiengesellschaft (AG)' } } }
  ];

  const fetchSuggestions = (searchText) => {
    if (!searchText || searchText.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setHighlightedIndex(-1);
      return;
    }
    
    const matches = SAMPLE_ZEFIX.filter(c => c.name.toLowerCase().includes(searchText.toLowerCase()));
    setSuggestions(matches.length > 0 ? matches : SAMPLE_ZEFIX.slice(0, 4));
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    fetchSuggestions(val);
  };

  const handleSelect = (item) => {
    // structured data: { firmenname, ort, uid, rechtsform }
    const firmenname = item.name || '';
    const ort = item.seat || (item.address && item.address.city) || '';
    const uid = item.uid || item.uidFormatted || '';
    const rechtsform = item.legalForm ? item.legalForm.name?.de || item.legalForm.id : '';
    
    setQuery(firmenname);
    
    onSelect({ firmenname, ort, uid, rechtsform });
    
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };


  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
        placeholder="Firma im Handelsregister suchen (min. 3 Zeichen)..."
        className={className || "w-full px-3 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-surface border border-border rounded-lg text-base sm:text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"}
      />
      
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200/80 rounded-xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-gray-100">
          {suggestions.map((item, idx) => {
            const isHighlighted = idx === highlightedIndex;
            // Dropdown item format: 
            // Firmenname AG
            // Zürich · CHE-123.456.789 · AG
            const name = item.name || '';
            const seat = item.seat || (item.address && item.address.city) || '';
            const uidFormatted = item.uidFormatted || item.uid || '';
            const legalForm = item.legalForm ? item.legalForm.name?.de || item.legalForm.name?.fr || item.legalForm.id : '';
            
            const subtitleParts = [seat, uidFormatted, legalForm].filter(Boolean);
            
            return (
              <li 
                key={item.ehraId || item.uid || idx}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 cursor-pointer border-b border-border last:border-b-0 flex flex-col justify-center transition-colors ${
                  isHighlighted ? 'bg-primary-50 text-primary-900' : 'hover:bg-primary-50/50 text-text-primary'
                }`}
              >
                <div className="font-medium text-base sm:text-sm">{name}</div>
                {subtitleParts.length > 0 && (
                  <div className="text-sm sm:text-xs text-text-secondary mt-0.5">
                    {subtitleParts.join(' · ')}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
