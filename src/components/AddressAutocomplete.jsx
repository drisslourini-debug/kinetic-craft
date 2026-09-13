import React, { useState, useEffect, useRef } from 'react';

export default function AddressAutocomplete({ value, onChange, placeholder, className, onBlur }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);
  
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

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

  const fetchSuggestions = async (searchText) => {
    if (!searchText || searchText.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      setHighlightedIndex(-1);
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch(`https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=${encodeURIComponent(searchText)}&type=locations&origins=address`);
      const data = await res.json();
      if (data && data.results) {
        setSuggestions(data.results);
        setIsOpen(true);
        setHighlightedIndex(-1);
      }
    } catch (err) {
      console.error('Geo API error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val); // Bubble up
    
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);
  };

  const handleSelect = (item) => {
    const rawLabel = item.attrs.label || '';
    const cleanAddress = rawLabel.replace(/<[^>]+>/g, '');
    
    const attrs = item.attrs || {};
    let strasse = `${attrs.strName || ''} ${attrs.strNumber || ''}`.trim();
    let plz = attrs.zip || '';
    let ort = attrs.city || '';
    
    // Fallback parsing if geo.admin.ch omits structural fields
    if (!strasse && !plz && !ort && rawLabel.includes('<b>')) {
      const parts = rawLabel.split('<b>');
      strasse = parts[0].trim();
      const zipCityRaw = parts[1].replace('</b>', '').trim();
      const match = zipCityRaw.match(/^(\d{4}[A-Za-z0-9]*)\s+(.*)$/);
      if (match) {
        plz = match[1];
        ort = match[2];
      } else {
        ort = zipCityRaw;
      }
    }

    // Final fallback
    if (!strasse) {
      strasse = cleanAddress;
    }

    setQuery(strasse);
    
    // Pass both the full string and the structured object
    onChange(cleanAddress, { strasse, plz, ort });
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
        onBlur={onBlur}
        onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
        placeholder={placeholder || 'Adresse suchen...'}
        className={className || "w-full px-3 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-surface border border-border rounded-lg text-base sm:text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"}
      />
      
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-surface-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((item, idx) => {
            const cleanLabel = item.attrs.label.replace(/<[^>]+>/g, '');
            const isHighlighted = idx === highlightedIndex;
            return (
              <li 
                key={idx}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 text-base sm:text-sm cursor-pointer border-b border-border last:border-b-0 text-text-primary flex items-center transition-colors ${
                  isHighlighted ? 'bg-primary-50 text-primary-900 font-medium' : 'hover:bg-primary-50/50'
                }`}
              >
                {cleanLabel}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
