import React, { useState, useEffect, useRef } from 'react';
import { LEGAL_FORMS } from '../lib/zefixConstants';

export default function ZefixAutocomplete({ onSelect, className, darkTheme = false }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [errorMessage, setErrorMessage] = useState(null);
  
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);
  const abortControllerRef = useRef(null);

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
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const searchZefix = async (searchText) => {
    const trimmed = (searchText || '').trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setHasSearched(false);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Try internal /api/zefix endpoint (works locally in Vite and serverless in Vercel)
      const res = await fetch(`/api/zefix?search=${encodeURIComponent(trimmed)}&maxEntries=10`, {
        signal: abortControllerRef.current.signal,
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.list) ? data.list : [];
        setSuggestions(list);
        setHasSearched(true);
        setIsOpen(true);
        setHighlightedIndex(-1);
        setIsLoading(false);
        return;
      }
      throw new Error(`API returned ${res.status}`);
    } catch (err) {
      if (err.name === 'AbortError') return;

      // 2. Direct fallback to official ZefixREST web endpoint if local proxy fails
      try {
        const directRes = await fetch('https://www.zefix.ch/ZefixREST/api/v1/firm/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            name: trimmed,
            languageKey: 'de',
            maxEntries: 10
          }),
          signal: abortControllerRef.current.signal
        });

        if (directRes.ok) {
          const directData = await directRes.json();
          const list = (directData && Array.isArray(directData.list)) ? directData.list.map(item => {
            const legalFormName = (item.legalFormId && LEGAL_FORMS[item.legalFormId])
              ? LEGAL_FORMS[item.legalFormId]
              : '';
            return {
              ...item,
              seat: item.legalSeat || '',
              legalForm: {
                id: item.legalFormId,
                name: { de: legalFormName }
              }
            };
          }) : [];

          setSuggestions(list);
          setHasSearched(true);
          setIsOpen(true);
          setHighlightedIndex(-1);
          setIsLoading(false);
          return;
        } else if (directRes.status === 404) {
          setSuggestions([]);
          setHasSearched(true);
          setIsOpen(true);
          setHighlightedIndex(-1);
          setIsLoading(false);
          return;
        }
      } catch (directErr) {
        if (directErr.name === 'AbortError') return;
        console.warn('Direct Zefix fallback error:', directErr);
      }

      setSuggestions([]);
      setHasSearched(true);
      setErrorMessage('Verbindung zum Schweizer Handelsregister nicht verfügbar.');
      setIsOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val || val.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setHasSearched(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      searchZefix(val);
    }, 300);
  };

  const handleSelect = async (item) => {
    let firmenname = item.name || '';
    let ort = (item.address && (item.address.town || item.address.city)) || item.seat || item.legalSeat || '';
    let uid = item.uidFormatted || item.uid || '';
    let rechtsform = item.legalForm?.name?.de || (item.legalFormId && LEGAL_FORMS[item.legalFormId]) || '';
    let strasse = item.address?.strasse || [item.address?.street, item.address?.houseNumber].filter(Boolean).join(' ') || '';
    let plz = item.address?.plz || item.address?.swissZipCode || '';
    let cantonalExcerptWeb = item.cantonalExcerptWeb || null;

    setQuery(firmenname);
    setIsOpen(false);
    setHighlightedIndex(-1);

    // If company does not have full street address yet and ehraid is available, try a fast detail lookup
    if ((!strasse || !plz) && item.ehraid) {
      try {
        const detailRes = await fetch(`/api/zefix?ehraid=${encodeURIComponent(item.ehraid)}`);
        if (detailRes.ok) {
          const detail = await detailRes.json();
          if (detail.address) {
            strasse = detail.address.strasse || [detail.address.street, detail.address.houseNumber].filter(Boolean).join(' ') || strasse;
            plz = detail.address.plz || detail.address.swissZipCode || plz;
            ort = detail.address.town || ort;
          }
          if (detail.uidFormatted) uid = detail.uidFormatted;
          if (detail.legalForm?.name?.de) rechtsform = detail.legalForm.name.de;
          if (detail.cantonalExcerptWeb) cantonalExcerptWeb = detail.cantonalExcerptWeb;
        }
      } catch (err) {
        console.warn('Could not fetch Zefix firm detail:', err);
      }
    }

    if (onSelect) {
      onSelect({
        firmenname,
        ort,
        uid,
        rechtsform,
        strasse,
        plz,
        land: 'Schweiz',
        cantonalExcerptWeb,
        raw: item
      });
    }
  };

  const handleManualAdopt = () => {
    const trimmed = query.trim();
    if (onSelect) {
      onSelect({
        firmenname: trimmed,
        ort: '',
        uid: '',
        rechtsform: '',
        strasse: '',
        plz: '',
        land: 'Schweiz'
      });
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;

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
      } else if (suggestions.length === 0 && hasSearched && query.trim()) {
        e.preventDefault();
        handleManualAdopt();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0 || (hasSearched && query.trim().length >= 2)) {
              setIsOpen(true);
            }
          }}
          placeholder="Firma im Schweizer Handelsregister suchen (z.B. Swisscom oder CHE-102.753.938)..."
          className={className || "w-full px-3 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-surface border border-border rounded-lg text-base sm:text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 pr-10"}
        />
        
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {isOpen && (
        <div className={`absolute z-50 w-full mt-1.5 rounded-xl shadow-2xl max-h-72 overflow-y-auto ${
          darkTheme 
            ? 'bg-[#16161A] border border-white/15 divide-y divide-white/10 text-white' 
            : 'bg-white border border-gray-200/90 divide-y divide-gray-100 text-text-primary'
        }`}>
          {suggestions.length > 0 ? (
            <ul>
              {suggestions.map((item, idx) => {
                const isHighlighted = idx === highlightedIndex;
                const name = item.name || '';
                const seat = item.seat || item.legalSeat || (item.address && (item.address.town || item.address.city)) || '';
                const uidFormatted = item.uidFormatted || item.uid || '';
                const legalForm = item.legalForm?.name?.de || (item.legalFormId && LEGAL_FORMS[item.legalFormId]) || '';
                
                const subtitleParts = [seat, uidFormatted, legalForm].filter(Boolean);
                
                return (
                  <li 
                    key={item.ehraid || item.uid || idx}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-4 py-3 sm:py-2.5 min-h-[48px] sm:min-h-0 cursor-pointer border-b last:border-b-0 flex flex-col justify-center transition-colors ${
                      darkTheme
                        ? isHighlighted ? 'bg-[#D6BA94]/20 text-[#D6BA94] border-white/10' : 'hover:bg-white/10 text-white border-white/10'
                        : isHighlighted ? 'bg-primary-50 text-primary-900 border-border' : 'hover:bg-primary-50/50 text-text-primary border-border'
                    }`}
                  >
                    <div className="font-semibold text-base sm:text-sm">{name}</div>
                    {subtitleParts.length > 0 && (
                      <div className={`text-sm sm:text-xs mt-0.5 ${darkTheme ? 'text-[#A1A1A6]' : 'text-text-secondary'}`}>
                        {subtitleParts.join(' · ')}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : hasSearched && !isLoading ? (
            <div className="p-4 text-center">
              <p className={`text-xs font-semibold ${darkTheme ? 'text-neutral-200' : 'text-text-primary'}`}>
                {errorMessage || `Keine Einträge für «${query}» im Schweizer Handelsregister gefunden.`}
              </p>
              <p className={`text-[11px] mt-1 ${darkTheme ? 'text-neutral-400' : 'text-text-muted'}`}>
                Prüfen Sie die Schreibweise oder erfassen Sie die Firma manuell.
              </p>
              {query.trim() && (
                <button
                  type="button"
                  onClick={handleManualAdopt}
                  className={`mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    darkTheme
                      ? 'text-[#E8D3B5] bg-white/10 hover:bg-white/15 border border-white/15'
                      : 'text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200/60'
                  }`}
                >
                  <span>«{query.trim()}» als Firmenname übernehmen</span>
                </button>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
