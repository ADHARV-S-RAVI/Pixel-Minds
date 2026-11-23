import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  Calendar,
  Briefcase,
  AlertCircle,
  Check,
  RotateCw
} from '@/components/Icons';
import { supabase } from '../lib/supabase';
import { VERIFIED_OPPORTUNITIES } from '../data/verifiedOpportunities';
import { getOpportunityDeadlineInfo } from '../utils/dateUtils';
import { grad } from '../utils/meta';

export interface OpportunityAttachmentItem {
  id: string;
  title: string;
  org?: string;
  cat?: string;
  deadline?: string;
  mode?: string;
  status?: string;
}

interface SearchableOpportunitySelectorProps {
  mode: 'opp' | 'event';
  selectedId?: string | number;
  onSelect: (item: OpportunityAttachmentItem | null) => void;
  onClose?: () => void;
  className?: string;
}

const EVENT_CATEGORIES = ['Events', 'Workshops', 'Conferences'];

export const SearchableOpportunitySelector: React.FC<SearchableOpportunitySelectorProps> = ({
  mode,
  selectedId,
  onSelect,
  onClose,
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteRecords, setRemoteRecords] = useState<OpportunityAttachmentItem[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<OpportunityAttachmentItem | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if clicking modal scrollbar or inside modal dialog
      const target = e.target as HTMLElement;
      if (target && target.closest && target.closest('[role="dialog"]')) {
        // If click is within the modal but outside the selector container, don't close if user is dragging/clicking the scrollbar
        const modalContainer = target.closest('[role="dialog"]');
        if (modalContainer && e.clientX >= modalContainer.getBoundingClientRect().right - 20) {
          return;
        }
      }
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch opportunities from Supabase (strictly status = 'published')
  const fetchRecords = useCallback(async (searchQuery: string) => {
    setLoading(true);
    setError(null);
    try {
      let sbQuery = supabase
        .from('opportunities')
        .select('id, title, organizer, category, deadline, mode, status')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(25);

      if (mode === 'event') {
        sbQuery = sbQuery.in('category', EVENT_CATEGORIES);
      }

      const clean = searchQuery.trim().replace(/[,()%.*]/g, ' ').replace(/\s+/g, ' ').trim();
      if (clean) {
        sbQuery = sbQuery.or(`title.ilike.%${clean}%,organizer.ilike.%${clean}%,category.ilike.%${clean}%`);
      }

      const { data, error: sbError } = await sbQuery;

      if (sbError) {
        throw new Error(sbError.message);
      }

      const mapped: OpportunityAttachmentItem[] = (data || []).map((row: any) => {
        const dInfo = row.deadline ? getOpportunityDeadlineInfo(row.deadline) : null;
        return {
          id: row.id,
          title: row.title,
          org: row.organizer,
          cat: row.category,
          deadline: dInfo?.formattedDeadline || row.deadline || undefined,
          mode: row.mode ? row.mode.charAt(0).toUpperCase() + row.mode.slice(1) : undefined,
          status: row.status
        };
      });

      setRemoteRecords(mapped);
    } catch (err: any) {
      console.warn('[SearchableOpportunitySelector] Failed to fetch remote opportunities:', err);
      setError(err?.message || 'Failed to search published records. Check your connection.');
      setRemoteRecords([]);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  // Initial load and query change debounced
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecords(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, fetchRecords]);

  // Combined published records (Supabase + Verified), strictly published & filtered by mode
  const filteredRecords = useMemo(() => {
    const seen = new Set<string>();
    const combined: OpportunityAttachmentItem[] = [];

    // 1. Add Supabase published records
    for (const r of remoteRecords) {
      if (r.status === 'published' && !seen.has(r.id)) {
        seen.add(r.id);
        combined.push(r);
      }
    }

    // 2. Add in-memory verified opportunities that match
    const qLower = query.trim().toLowerCase();
    for (const v of VERIFIED_OPPORTUNITIES) {
      if (seen.has(v.id)) continue;

      const isEventCat = EVENT_CATEGORIES.includes(v.category);
      if (mode === 'event' && !isEventCat) continue;

      if (qLower) {
        const matchTitle = v.title.toLowerCase().includes(qLower);
        const matchOrg = v.organizer.toLowerCase().includes(qLower);
        const matchCat = v.category.toLowerCase().includes(qLower);
        if (!matchTitle && !matchOrg && !matchCat) continue;
      }

      seen.add(v.id);
      const dInfo = getOpportunityDeadlineInfo(v.deadline);
      combined.push({
        id: v.id,
        title: v.title,
        org: v.organizer,
        cat: v.category,
        deadline: dInfo.formattedDeadline,
        mode: v.mode ? v.mode.charAt(0).toUpperCase() + v.mode.slice(1) : undefined,
        status: 'published'
      });
    }

    return combined;
  }, [remoteRecords, query, mode]);

  // Resolve selected item if selectedId changes
  useEffect(() => {
    if (!selectedId || selectedId === 0 || selectedId === '0') {
      setSelectedRecord(null);
      return;
    }

    const idStr = String(selectedId);
    // Look in verified opportunities first
    const foundVerified = VERIFIED_OPPORTUNITIES.find((v) => String(v.id) === idStr);
    if (foundVerified) {
      const dInfo = getOpportunityDeadlineInfo(foundVerified.deadline);
      setSelectedRecord({
        id: foundVerified.id,
        title: foundVerified.title,
        org: foundVerified.organizer,
        cat: foundVerified.category,
        deadline: dInfo.formattedDeadline,
        mode: foundVerified.mode ? foundVerified.mode.charAt(0).toUpperCase() + foundVerified.mode.slice(1) : undefined,
        status: 'published'
      });
      return;
    }

    // Look in filtered records
    const foundInList = filteredRecords.find((r) => String(r.id) === idStr);
    if (foundInList) {
      setSelectedRecord(foundInList);
      return;
    }

    // Look in Supabase single record
    let isSubscribed = true;
    supabase
      .from('opportunities')
      .select('id, title, organizer, category, deadline, mode, status')
      .eq('id', idStr)
      .maybeSingle()
      .then(({ data }) => {
        if (!isSubscribed) return;
        if (data && data.status === 'published') {
          const dInfo = data.deadline ? getOpportunityDeadlineInfo(data.deadline) : null;
          setSelectedRecord({
            id: data.id,
            title: data.title,
            org: data.organizer,
            cat: data.category,
            deadline: dInfo?.formattedDeadline || data.deadline,
            mode: data.mode ? data.mode.charAt(0).toUpperCase() + data.mode.slice(1) : undefined,
            status: data.status
          });
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [selectedId]);

  // Keyboard navigation inside the dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredRecords.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredRecords.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredRecords.length) {
        handleSelectItem(filteredRecords[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleSelectItem = (item: OpportunityAttachmentItem) => {
    setSelectedRecord(item);
    onSelect(item);
    setIsOpen(false);
    setQuery('');
    setHighlightedIndex(-1);
  };

  const handleRemove = () => {
    setSelectedRecord(null);
    onSelect(null);
    setQuery('');
    if (onClose) onClose();
  };

  const modeLabel = mode === 'event' ? 'Event' : 'Opportunity';

  return (
    <div ref={containerRef} className={`relative w-full max-w-full ${className}`}>
      {/* If already selected: render selected attachment preview card */}
      {selectedRecord ? (
        <div className="flex items-center gap-3 rounded-2xl border border-blue-200/80 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/30 p-2.5 sm:p-3 shadow-xs">
          <div
            style={{ background: selectedRecord.cat ? grad(selectedRecord.cat) : '#2563eb' }}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-xs"
          >
            {mode === 'event' ? <Calendar size={18} /> : <Briefcase size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-100/80 dark:bg-blue-900/40 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-sky-300">
                Attached {modeLabel}
              </span>
              {selectedRecord.cat && (
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  {selectedRecord.cat}
                </span>
              )}
            </div>
            <p className="truncate text-xs font-bold text-[#0e1b33] dark:text-white mt-0.5">
              {selectedRecord.title}
            </p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
              {[selectedRecord.org, selectedRecord.deadline, selectedRecord.mode].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSelectedRecord(null);
                setIsOpen(true);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className="rounded-lg bg-white/80 dark:bg-slate-800 hover:bg-white text-slate-600 dark:text-slate-300 hover:text-blue-600 px-2.5 py-1 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              title={`Change attached ${modeLabel}`}
            >
              Change
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
              title={`Remove attached ${modeLabel}`}
              aria-label={`Remove attached ${modeLabel}`}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        /* Search Combobox Input */
        <div className="relative">
          <div className="relative flex items-center">
            {mode === 'event' ? (
              <Calendar size={15} className="absolute left-3.5 text-slate-400 pointer-events-none" />
            ) : (
              <Briefcase size={15} className="absolute left-3.5 text-slate-400 pointer-events-none" />
            )}
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              aria-controls="opp-selector-listbox"
              aria-activedescendant={
                highlightedIndex >= 0 && filteredRecords[highlightedIndex]
                  ? `opp-option-${filteredRecords[highlightedIndex].id}`
                  : undefined
              }
              aria-label={`Search published ${modeLabel.toLowerCase()}s`}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
                setHighlightedIndex(-1);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={`Search published ${modeLabel.toLowerCase()}s to attach...`}
              className="w-full rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 px-10 py-2.5 text-xs text-[#0e1b33] dark:text-white outline-none focus:border-blue-500 placeholder-slate-400 transition shadow-2xs"
            />
            <div className="absolute right-2.5 flex items-center gap-1">
              {loading && (
                <RotateCw size={13} className="animate-spin text-blue-500 mr-1" />
              )}
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setIsOpen(false);
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-md text-slate-400 hover:text-rose-500 transition cursor-pointer"
                  title="Cancel attachment"
                  aria-label="Cancel attachment"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Autocomplete Results Dropdown */}
          {isOpen && (
            <div 
              onWheel={(e) => e.stopPropagation()}
              className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-64 overflow-y-auto overscroll-contain rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-1.5 pm-scrollbar"
            >
              {/* Error State */}
              {error && (
                <div className="p-3 text-xs text-rose-600 dark:text-rose-400 flex items-center justify-between gap-2 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchRecords(query)}
                    className="text-[11px] font-bold text-rose-700 dark:text-rose-300 hover:underline shrink-0"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Loading State */}
              {loading && filteredRecords.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                  <RotateCw size={16} className="animate-spin text-blue-500" />
                  <span>Searching published {modeLabel.toLowerCase()}s...</span>
                </div>
              )}

              {/* No Results State */}
              {!loading && !error && filteredRecords.length === 0 && (
                <div className="py-6 px-4 text-center text-xs text-slate-500">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    No published {modeLabel.toLowerCase()}s found
                  </p>
                  {query ? (
                    <p className="text-[11px] text-slate-400 mt-1">
                      No matching records found for &ldquo;{query}&rdquo;.
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Type a keyword, hackathon, or organization name to search.
                    </p>
                  )}
                </div>
              )}

              {/* List of Results */}
              {filteredRecords.length > 0 && (
                <ul
                  ref={listboxRef}
                  role="listbox"
                  id="opp-selector-listbox"
                  aria-label={`Matching published ${modeLabel.toLowerCase()}s`}
                  className="space-y-1"
                >
                  {filteredRecords.map((item, idx) => {
                    const isHighlighted = idx === highlightedIndex;
                    const isSelected = selectedId !== undefined && String(selectedId) === String(item.id);
                    return (
                      <li
                        key={item.id}
                        id={`opp-option-${item.id}`}
                        role="option"
                        aria-selected={isSelected || isHighlighted}
                        onClick={() => handleSelectItem(item)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`px-3 py-2 rounded-xl flex items-center gap-2.5 transition cursor-pointer select-none ${
                          isHighlighted
                            ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-[#0e1b33] dark:text-white'
                        } ${isSelected ? 'border border-blue-400/40' : ''}`}
                      >
                        <div
                          style={{ background: item.cat ? grad(item.cat) : '#2563eb' }}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white shadow-2xs text-[10px] font-bold"
                        >
                          {mode === 'event' ? <Calendar size={14} /> : <Briefcase size={14} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold leading-snug">
                            {item.title}
                          </p>
                          <p className="truncate text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {[item.org, item.cat, item.deadline, item.mode].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        {isSelected && (
                          <span className="text-blue-600 dark:text-sky-400 shrink-0">
                            <Check size={14} />
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
