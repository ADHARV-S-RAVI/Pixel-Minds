import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { Megaphone, ExternalLink, X } from 'lucide-react';
import { getActiveAnnouncements } from '../services/announcements';
import type { Announcement } from '../types';
import { Btn } from '../ui';

export const AnnouncementModal: FC = () => {
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

  const isExternal = announcement.ctaLink?.startsWith('http://') || announcement.ctaLink?.startsWith('https://');

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
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200/90 transition-all transform animate-in zoom-in-95 duration-200">
        {/* Top-right close button */}
        <button
          onClick={handleDismiss}
          aria-label="Close announcement"
          className="absolute top-3.5 right-3.5 z-10 grid h-8 w-8 place-items-center rounded-full bg-slate-100/90 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition"
        >
          <X size={16} />
        </button>

        {/* Optional Announcement Banner Image */}
        {announcement.ctaText && (
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
          <div className="mt-6 flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <Btn v="outline" onClick={handleDismiss} className="!text-xs !min-h-9 !px-3.5">
              Dismiss
            </Btn>
            {announcement.ctaLink && (
              <a
                href={announcement.ctaLink}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noreferrer' : undefined}
                onClick={handleDismiss}
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-[0.98] px-4 py-2 text-xs font-bold text-white shadow-xs transition"
              >
                <span>{announcement.ctaText || 'Learn More'}</span>
                {isExternal && <ExternalLink size={13} />}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
