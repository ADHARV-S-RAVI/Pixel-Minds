import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, ArrowRight, Tag, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { opps } from '../data';

// Standard indexed search keywords & suggestions
const POPULAR_KEYWORDS = [
  'Hackathon',
  'Internship',
  'Fellowship',
  'AI & Machine Learning',
  'Full Stack Development',
  'React',
  'Python',
  'Cloud & DevOps',
  'Web3 & Blockchain',
  'Open Source',
  'Scholarship',
  'Cybersecurity',
  'Design & UI/UX'
];

interface SearchPrediction {
  type: 'keyword' | 'opportunity' | 'category';
  title: string;
  subtitle?: string;
  link: string;
}

interface SearchAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit?: (val: string) => void;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  className?: string;
  inputClassName?: string;
  showShortcut?: boolean;
}

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search opportunities, events, tags...',
  inputRef,
  className = '',
  inputClassName = '',
  showShortcut = true
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute predictions and autocomplete results
  const predictions = useMemo<SearchPrediction[]>(() => {
    const query = value.trim().toLowerCase();
    const results: SearchPrediction[] = [];

    if (!query) {
      // Suggest top trending keywords when search is focused but empty
      POPULAR_KEYWORDS.slice(0, 5).forEach((kw) => {
        results.push({
          type: 'keyword',
          title: kw,
          subtitle: 'Popular Topic',
          link: `/opportunities?q=${encodeURIComponent(kw)}`
        });
      });
      return results;
    }

    // 1. Keyword / Tag matches
    const matchedKeywords = POPULAR_KEYWORDS.filter((kw) =>
      kw.toLowerCase().includes(query)
    ).slice(0, 4);

    matchedKeywords.forEach((kw) => {
      results.push({
        type: 'keyword',
        title: kw,
        subtitle: 'Filter by skill/topic',
        link: `/opportunities?q=${encodeURIComponent(kw)}`
      });
    });

    // 2. Direct opportunity matching & autocomplete
    const matchedOpps = (opps || [])
      .filter((opp: any) => {
        const titleMatch = opp.title?.toLowerCase().includes(query);
        const orgMatch = opp.org?.toLowerCase().includes(query);
        const skillMatch = opp.skills?.some((s: string) => s.toLowerCase().includes(query));
        return titleMatch || orgMatch || skillMatch;
      })
      .slice(0, 5);

    matchedOpps.forEach((opp: any) => {
      results.push({
        type: 'opportunity',
        title: opp.title,
        subtitle: `${opp.org || 'Organizer'} · ${opp.deadline || 'Upcoming'}`,
        link: `/opportunities/${opp.id}`
      });
    });

    return results;
  }, [value]);

  const handleSelectPrediction = (item: SearchPrediction) => {
    setIsOpen(false);
    if (item.type === 'opportunity') {
      navigate(item.link);
    } else {
      onChange(item.title);
      if (onSubmit) {
        onSubmit(item.title);
      } else {
        navigate(item.link);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || predictions.length === 0) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < predictions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : predictions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < predictions.length) {
        e.preventDefault();
        handleSelectPrediction(predictions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Search size={16} className="absolute left-4 top-3 text-slate-400 pointer-events-none z-10" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={
          inputClassName ||
          "w-full rounded-full bg-white/70 hover:bg-white/90 focus:bg-white border border-white/90 py-2.5 pl-11 pr-16 text-xs text-[#0e1b33] placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition shadow-xs"
        }
      />

      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange('');
            setIsOpen(false);
          }}
          className="absolute right-4 top-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600 transition cursor-pointer z-10"
          title="Clear search"
        >
          <X size={14} />
        </button>
      ) : showShortcut ? (
        <span className="absolute right-4 top-2.5 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 border border-slate-200 select-none shadow-2xs pointer-events-none">
          Ctrl K
        </span>
      ) : null}

      {/* Autocomplete Predictions Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-150">
          {predictions.length > 0 ? (
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {predictions.map((item, idx) => {
                const isSelected = idx === highlightedIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPrediction(item)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-black dark:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-lg shrink-0 ${
                          item.type === 'opportunity'
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-sky-300'
                            : 'bg-slate-100 text-black dark:bg-slate-800 dark:text-white'
                        }`}
                      >
                        {item.type === 'opportunity' ? <Building2 size={13} /> : <Tag size={13} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate text-black dark:text-white">{item.title}</p>
                        {item.subtitle && (
                          <p className="text-[10px] text-black/80 dark:text-slate-300 truncate">{item.subtitle}</p>
                        )}
                      </div>
                    </div>
                    <ArrowRight size={13} className="text-black/60 dark:text-slate-400 shrink-0 opacity-60" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-xs font-bold text-black dark:text-white">No search results found</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Try searching for hackathons, internships, or tech skills:
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5 justify-center">
                {POPULAR_KEYWORDS.slice(0, 4).map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => handleSelectPrediction({ type: 'keyword', title: kw, link: `/opportunities?q=${encodeURIComponent(kw)}` })}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-black dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600 transition cursor-pointer"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

