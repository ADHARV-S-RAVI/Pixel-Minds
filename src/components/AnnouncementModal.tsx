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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleDismiss();
        }
      }}
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-[#11243D]/95 backdrop-blur-2xl shadow-2xl border border-sky-500/20 text-white transition-all transform animate-in zoom-in-95 duration-200">
        {/* Top-right close button (always on top, does not trigger navigation) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          aria-label="Close announcement"
          className="absolute top-3.5 right-3.5 z-20 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-md shadow-md transition cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Prominent Announcement Banner Image (Clickable when destination URL is set) */}
        {announcement.imageUrl ? (
          <div
            onClick={destinationUrl ? handleNavigateDestination : undefined}
            className={`relative w-full bg-zinc-900 overflow-hidden border-b border-white/10 aspect-[16/9] max-h-56 ${
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
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-end p-3 pointer-events-none">
                <span className="inline-flex items-center gap-1 rounded-full bg-black/70 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white shadow-xs border border-white/10">
                  <span>Open link</span>
                  <ExternalLink size={11} />
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Subtle Champagne Gold Bar when no image */
          <div className="h-2 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600" />
        )}

        <div className="p-6 sm:p-7">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 border border-sky-500/30 px-3 py-1 text-[11px] font-bold text-sky-300 mb-3">
            <Megaphone size={13} className="text-sky-300" />
            <span>Community Announcement</span>
          </div>

          {/* Title */}
          <h3 id="announcement-modal-title" className="text-xl font-bold tracking-tight text-white">
            {announcement.title}
          </h3>

          {/* Message Content */}
          <p className="mt-2.5 text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
            {announcement.message}
          </p>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
            <Btn v="outline" onClick={handleDismiss} className="!text-xs !min-h-9 !px-4">
              Dismiss
            </Btn>
            {destinationUrl && (
              <button
                type="button"
                onClick={handleNavigateDestination}
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-md shadow-sky-500/20 px-5 py-2 text-xs font-bold shadow-sm transition cursor-pointer"
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
