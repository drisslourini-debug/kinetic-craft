import React, { useState, useEffect, useRef } from 'react';

export default function AddressAutocomplete({ value, onChange, placeholder, className, onBlur }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef(null);
  
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (searchText) => {
    if (!searchText || searchText.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch(`https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=${encodeURIComponent(searchText)}&type=locations&origins=address`);
      const data = await res.json();
      if (data && data.results) {
        setSuggestions(data.results);
        setIsOpen(true);
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
    
    if (window.geoTimeout) clearTimeout(window.geoTimeout);
    window.geoTimeout = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);
  };

  const handleSelect = (item) => {
    const cleanAddress = item.attrs.label.replace(/<[^>]+>/g, '');
    setQuery(cleanAddress);
    onChange(cleanAddress);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onBlur={onBlur}
        onFocus={() => { if (suggestions.length > 0) setIsOpen(true) }}
        placeholder={placeholder || 'Adresse suchen...'}
        className={className || "w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"}
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
            return (
              <li 
                key={idx}
                onClick={() => handleSelect(item)}
                className="px-4 py-2 hover:bg-primary-50 text-sm cursor-pointer border-b border-border last:border-b-0 text-text-primary"
              >
                {cleanLabel}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  );
}
