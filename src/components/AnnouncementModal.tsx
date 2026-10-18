import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, ExternalLink, X } from 'lucide-react';
import { getActiveAnnouncements } from '../services/announcements';
import type { Announcement } from '../types';
import { Btn } from '../ui';

export const AnnouncementModal: FC = () => {
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkAnnouncement = async () => {
      try {
        const list = await getActiveAnnouncements();
        if (!isMounted) return;

        // Find the first active announcement that has not yet been dismissed
        const activeAnn = list.find((a) => {
          try {
            return localStorage.getItem(`pm_dismissed_ann_${a.id}`) !== 'true';
          } catch {
            return true;
          }
        });

        if (activeAnn) {
          setAnnouncement(activeAnn);
          setIsOpen(true);
        } else {
          setAnnouncement(null);
          setIsOpen(false);
        }
      } catch (err) {
        console.warn('[AnnouncementModal] Note loading announcement:', err);
      }
    };

    checkAnnouncement();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDismiss = () => {
    if (announcement) {
      try {
        localStorage.setItem(`pm_dismissed_ann_${announcement.id}`, 'true');
      } catch {
        // ignore
      }
    }
    setIsOpen(false);
  };

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, announcement]);

  if (!isOpen || !announcement) {
    return null;
  }

  const destinationUrl = announcement.ctaLink?.trim();
  const isExternal = !!(destinationUrl?.startsWith('http://') || destinationUrl?.startsWith('https://'));

  const handleNavigateDestination = () => {
    if (!destinationUrl) return;
    handleDismiss();
    if (isExternal) {
      window.open(destinationUrl, '_blank', 'noopener,noreferrer');
    } else {
      navigate(destinationUrl);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleDismiss();
        }
      }}
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200/90 transition-all transform animate-in zoom-in-95 duration-200">
        {/* Top-right close button (always on top, does not trigger navigation) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          aria-label="Close announcement"
          className="absolute top-3.5 right-3.5 z-20 grid h-8 w-8 place-items-center rounded-full bg-slate-900/60 text-white hover:bg-slate-900/80 backdrop-blur-xs shadow-md transition"
        >
          <X size={16} />
        </button>

        {/* Prominent Announcement Banner Image (Clickable when destination URL is set) */}
        {announcement.imageUrl ? (
          <div
            onClick={destinationUrl ? handleNavigateDestination : undefined}
            className={`relative w-full bg-slate-100 overflow-hidden border-b border-slate-100 aspect-[16/9] max-h-56 ${
              destinationUrl ? 'cursor-pointer group' : ''
            }`}
            title={destinationUrl ? 'Click to visit destination link' : undefined}
          >
            <img
              src={announcement.imageUrl}
              alt={announcement.title}
              className={`w-full h-full object-cover transition-transform duration-300 ${
                destinationUrl ? 'group-hover:scale-[1.02]' : ''
              }`}
            />
            {destinationUrl && (
              <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors flex items-end justify-end p-3 pointer-events-none">
                <span className="inline-flex items-center gap-1 rounded-lg bg-black/60 backdrop-blur-xs px-2.5 py-1 text-[11px] font-bold text-white shadow-xs">
                  <span>Open link</span>
                  <ExternalLink size={11} />
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Subtle Gradient Bar when no image */
          <div className="h-2 bg-gradient-to-r from-sky-500 via-indigo-500 to-sky-600" />
        )}

        <div className="p-6 sm:p-7">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200/80 px-2.5 py-0.5 text-[11px] font-bold text-sky-700 mb-3">
            <Megaphone size={13} className="text-sky-600" />
            <span>Community Announcement</span>
          </div>

          {/* Title */}
          <h3 id="announcement-modal-title" className="text-lg font-bold tracking-tight text-slate-900">
            {announcement.title}
          </h3>

          {/* Message Content */}
          <p className="mt-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
            {announcement.message}
          </p>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Btn v="outline" onClick={handleDismiss} className="!text-xs !min-h-9 !px-3.5">
              Dismiss
            </Btn>
            {destinationUrl && (
              <button
                type="button"
                onClick={handleNavigateDestination}
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-[0.98] px-4 py-2 text-xs font-bold text-white shadow-xs transition"
              >
                <span>{announcement.ctaText || 'Learn More'}</span>
                {isExternal ? <ExternalLink size={13} /> : null}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
