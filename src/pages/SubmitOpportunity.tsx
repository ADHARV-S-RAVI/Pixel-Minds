import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../store';
import { cats } from '../data';
import { submitOpportunity } from '../services/opportunities';
import { uploadOpportunityImage, deleteStorageFile, validateOpportunityImageFile } from '../services/storage';
import {
  parseDateInputToTimestamp,
  validateOpportunityDates,
  formatDateToDDMMYYYY
} from '../utils/dateUtils';
import { sendSubmissionConfirmationEmail } from '../services/emailService';

// ==========================================
// CUSTOM MINIMAL INLINE SVG ICONS (NO LUCIDE)
// ==========================================
function IconSvg({ children, size = 16, className = '', ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

function IconArrowLeft(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <IconSvg {...props}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </IconSvg>
  );
}

function IconArrowRight(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <IconSvg {...props}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </IconSvg>
  );
}

function IconCheckCircle(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <IconSvg {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </IconSvg>
  );
}

function IconX(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <IconSvg {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </IconSvg>
  );
}

function IconRotateCcw(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <IconSvg {...props}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </IconSvg>
  );
}

function IconAlertCircle(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <IconSvg {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </IconSvg>
  );
}

function IconPlus(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <IconSvg {...props}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </IconSvg>
  );
}

function IconImagePlus(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <IconSvg {...props}>
      <path d="M16 5h6" />
      <path d="M19 2v6" />
      <path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </IconSvg>
  );
}

// ==========================================
// CONSTANTS & UTILITIES
// ==========================================
const DRAFT_STORAGE_KEY = 'pm_submit_opp_draft_v1';
const PRESET_TAGS = ['React', 'Python', 'AI/ML', 'Cloud', 'Web3', 'UI/UX'];

// Strict metadata sanitization: strips control chars, zero-width/bidi overrides, and angle brackets
function sanitizeMetadata(value: string, maxLen: number): string {
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[\u200B-\u200D\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLen);
}

// Full description sanitization: strips control chars and zero-width/bidi overrides
function sanitizeDescription(value: string, maxLen: number): string {
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[\u200B-\u200D\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
    .trim()
    .slice(0, maxLen);
}

// Strict URL validation: allows ONLY https: or http:, blocks private IPs, credentials & special chars
function validateSafeHttpUrl(rawUrl: string): { valid: boolean; normalized?: string; error?: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) return { valid: false, error: 'Official application URL is required.' };
  if (/[<>"']/.test(trimmed)) {
    return { valid: false, error: 'URL contains invalid characters.' };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { valid: false, error: 'URL must begin with https:// or http://' };
    }
    if (parsed.username || parsed.password) {
      return { valid: false, error: 'Embedded credentials in URL are not permitted.' };
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      /^(127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)$/.test(host)
    ) {
      return { valid: false, error: 'Private or local addresses are not permitted.' };
    }
    if (!host.includes('.')) {
      return { valid: false, error: 'Please enter a valid public domain name.' };
    }
    return { valid: true, normalized: parsed.toString() };
  } catch {
    return { valid: false, error: 'Enter a valid URL (e.g. https://example.com/apply).' };
  }
}

// Strip EXIF metadata by re-encoding through offscreen canvas before upload
async function stripExifAndProcessImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0);
    const mimeType = file.type === 'image/png' ? 'image/png' : (file.type === 'image/webp' ? 'image/webp' : 'image/jpeg');
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, mimeType, 0.92));
    if (!blob) return file;
    return new File([blob], file.name.replace(/[^\w.-]/g, '_'), { type: mimeType });
  } catch {
    return file;
  }
}

interface FormState {
  title: string;
  organizer: string;
  category: string;
  customCategory: string;
  officialUrl: string;
  mode: 'online' | 'offline' | 'hybrid';
  location: string;
  description: string;
  deadline: string;
  startDate: string;
  endDate: string;
  prize: string;
  teamSize: string;
  eligibility: string;
}

const INITIAL_FORM: FormState = {
  title: '',
  organizer: '',
  category: cats[0] || 'Hackathons',
  customCategory: '',
  officialUrl: '',
  mode: 'online',
  location: '',
  description: '',
  deadline: '',
  startDate: '',
  endDate: '',
  prize: '',
  teamSize: '',
  eligibility: ''
};

export function SubmitOpportunity() {
  const { user } = useAuth();
  const { say } = useApp();
  const navigate = useNavigate();

  // Load safe non-PII draft state
  const [form, setForm] = useState<FormState>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_FORM,
          title: parsed.title || '',
          organizer: parsed.organizer || '',
          category: parsed.category || cats[0],
          customCategory: parsed.customCategory || '',
          mode: parsed.mode || 'online',
          location: parsed.location || '',
          prize: parsed.prize || '',
          teamSize: parsed.teamSize || '',
          eligibility: parsed.eligibility || ''
        };
      }
    } catch {
      // ignore parsing error
    }
    return INITIAL_FORM;
  });

  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  // Separated Primary Banner & Gallery
  const [primaryBannerUrl, setPrimaryBannerUrl] = useState<string>('');
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [uploadingPrimary, setUploadingPrimary] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // Anti-bot & security guards
  const [honeypot, setHoneypot] = useState('');
  const formMountTime = useRef<number>(Date.now());

  // Date input refs for full-field clickability
  const deadlineRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  // Mobile 3-step wizard state
  const [mobileStep, setMobileStep] = useState<1 | 2 | 3>(1);
  const [_isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });
  void _isMobile;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Auto-save non-sensitive fields to localStorage
  useEffect(() => {
    if (done) return;
    try {
      const draftPayload = {
        title: form.title,
        organizer: form.organizer,
        category: form.category,
        customCategory: form.customCategory,
        mode: form.mode,
        location: form.location,
        prize: form.prize,
        teamSize: form.teamSize,
        eligibility: form.eligibility
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftPayload));
    } catch {
      // ignore quota errors
    }
  }, [form, done]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key] || fieldErrors.global) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        delete next.global;
        return next;
      });
    }
  };

  // Category adaptation logic
  const effectiveCategory = form.category === 'Other' ? (form.customCategory.trim() || 'Other') : form.category;
  const isHackathonOrComp = form.category === 'Hackathons' || form.category === 'Competitions';
  const isInternshipOrFellowship = form.category === 'Internships' || form.category === 'Fellowships';
  const isScholarship = form.category === 'Scholarships';
  const isOther = form.category === 'Other';

  const requiresTeamSize = isHackathonOrComp;
  const showTeamSize = isHackathonOrComp || isOther;
  const requiresCompensation = isInternshipOrFellowship || isScholarship;
  const requiresEligibility = isScholarship;

  // Compensation / Reward field labels
  const getCompensationLabel = () => {
    if (isInternshipOrFellowship) return 'Stipend / Compensation';
    if (isScholarship) return 'Grant / Scholarship Amount';
    if (isHackathonOrComp) return 'Prize Pool';
    return 'Perks / Reward / Fee';
  };

  const getCompensationPlaceholder = () => {
    if (isInternshipOrFellowship) return 'e.g. ₹30,000 / month or $1,500 / month';
    if (isScholarship) return 'e.g. ₹1,00,000 or $5,000 academic grant';
    if (isHackathonOrComp) return 'e.g. ₹2,00,000 cash pool + swag';
    return 'e.g. Free swag, certificate, or mentorship';
  };

  // Date picker click trigger
  const handleDateClick = (ref: React.RefObject<HTMLInputElement | null>) => {
    try {
      ref.current?.showPicker?.();
    } catch {
      // fallback for browsers without showPicker
    }
  };

  // Skill Chip Builder
  const addSkill = (raw: string) => {
    const clean = sanitizeMetadata(raw.replace(/,/g, ''), 28);
    if (!clean) return;
    if (skills.length >= 8) {
      say('Maximum 8 skills/tags allowed.');
      return;
    }
    if (!skills.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      setSkills((prev) => [...prev, clean]);
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(skillInput);
    } else if (e.key === 'Backspace' && !skillInput && skills.length > 0) {
      setSkills((prev) => prev.slice(0, -1));
    }
  };

  // Primary Banner Upload Handler
  const handlePrimaryBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const val = validateOpportunityImageFile(file);
    if (!val.valid) {
      say(val.error || 'Invalid image file.');
      e.target.value = '';
      return;
    }

    setUploadingPrimary(true);
    try {
      const processed = await stripExifAndProcessImage(file);
      const url = await uploadOpportunityImage(processed, user?.id || (user as any)?.uid);
      setPrimaryBannerUrl(url);
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.banner;
        return next;
      });
      say('Primary banner uploaded.');
    } catch (err: any) {
      say(err?.message || 'Banner upload failed.');
    } finally {
      setUploadingPrimary(false);
      e.target.value = '';
    }
  };

  const handleRemovePrimaryBanner = async () => {
    const url = primaryBannerUrl;
    setPrimaryBannerUrl('');
    if (url) {
      await deleteStorageFile(url).catch(() => {});
    }
  };

  // Additional Gallery Images Handler (Max 2)
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    if (galleryUrls.length + files.length > 2) {
      say(`Maximum 2 additional images allowed (${2 - galleryUrls.length} remaining).`);
      e.target.value = '';
      return;
    }

    for (const f of files) {
      const v = validateOpportunityImageFile(f);
      if (!v.valid) {
        say(v.error || 'Invalid file format or size.');
        e.target.value = '';
        return;
      }
    }

    setUploadingGallery(true);
    const uploadedBatch: string[] = [];
    try {
      for (const f of files) {
        const processed = await stripExifAndProcessImage(f);
        const url = await uploadOpportunityImage(processed, user?.id || (user as any)?.uid);
        uploadedBatch.push(url);
      }
      setGalleryUrls((prev) => [...prev, ...uploadedBatch]);
      say(`${files.length} additional image${files.length > 1 ? 's' : ''} uploaded.`);
    } catch (err: any) {
      for (const url of uploadedBatch) {
        await deleteStorageFile(url).catch(() => {});
      }
      say(err?.message || 'Upload failed.');
    } finally {
      setUploadingGallery(false);
      e.target.value = '';
    }
  };

  const handleRemoveGalleryImage = async (idx: number) => {
    const target = galleryUrls[idx];
    setGalleryUrls((prev) => prev.filter((_, i) => i !== idx));
    if (target) {
      await deleteStorageFile(target).catch(() => {});
    }
  };

  const handleResetDraft = () => {
    setForm(INITIAL_FORM);
    setSkills([]);
    setPrimaryBannerUrl('');
    setGalleryUrls([]);
    setFieldErrors({});
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    say('Draft reset.');
  };

  // Focus on the first invalid field
  const scrollToFirstError = (errors: Record<string, string>) => {
    const fieldOrder = [
      'title',
      'organizer',
      'category',
      'customCategory',
      'officialUrl',
      'location',
      'description',
      'deadline',
      'prize',
      'teamSize',
      'eligibility',
      'banner'
    ];

    const firstKey = fieldOrder.find((k) => errors[k]);
    if (!firstKey) return;

    if (['title', 'organizer', 'category', 'customCategory', 'officialUrl', 'location', 'description'].includes(firstKey)) {
      setMobileStep(1);
    } else if (['deadline', 'prize', 'teamSize', 'eligibility'].includes(firstKey)) {
      setMobileStep(2);
    } else if (firstKey === 'banner') {
      setMobileStep(3);
    }

    setTimeout(() => {
      const el = document.getElementById(`field-${firstKey}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
    }, 120);
  };

  // Section 1 validation
  const validateSection1 = (): boolean => {
    const errors: Record<string, string> = {};
    const cleanTitle = sanitizeMetadata(form.title, 150);
    const cleanOrg = sanitizeMetadata(form.organizer, 120);
    const cleanDesc = sanitizeDescription(form.description, 4000);

    if (cleanTitle.length < 4) errors.title = 'Title must be between 4 and 150 characters.';
    if (cleanOrg.length < 2) errors.organizer = 'Organizer name is required (min 2 characters).';

    if (form.category === 'Other') {
      const cleanCustom = sanitizeMetadata(form.customCategory, 50);
      if (cleanCustom.length < 2) errors.customCategory = 'Please specify your custom category (min 2 chars).';
    }

    const urlCheck = validateSafeHttpUrl(form.officialUrl);
    if (!urlCheck.valid) errors.officialUrl = urlCheck.error || 'Valid application URL is required.';

    if (form.mode !== 'online' && !form.location.trim()) {
      errors.location = 'Location is required for offline or hybrid events.';
    }

    if (cleanDesc.length < 20) {
      errors.description = 'Please provide a description of at least 20 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...errors }));
      scrollToFirstError(errors);
      return false;
    }
    return true;
  };

  // Section 2 validation
  const validateSection2 = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.deadline) {
      errors.deadline = 'Application deadline is required.';
    } else {
      const dateCheck = validateOpportunityDates({
        startDate: form.startDate,
        endDate: form.endDate,
        deadline: form.deadline
      });
      if (!dateCheck.valid) {
        errors.deadline = dateCheck.error || 'Invalid date sequence.';
      }
    }

    if (requiresCompensation && !form.prize.trim()) {
      errors.prize = `${getCompensationLabel()} is mandatory for this category.`;
    }

    if (requiresTeamSize && !form.teamSize.trim()) {
      errors.teamSize = 'Team size is required for hackathons and competitions.';
    }

    if (requiresEligibility && !form.eligibility.trim()) {
      errors.eligibility = 'Eligibility criteria is mandatory for scholarships.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...errors }));
      scrollToFirstError(errors);
      return false;
    }
    return true;
  };

  // Section 3 validation
  const validateSection3 = (): boolean => {
    // Banner upload is optional; if omitted, the system generates a category cover
    return true;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Silent anti-bot honeypot check
    if (honeypot.trim() !== '') {
      setDone(true);
      return;
    }

    // Minimum interaction time check (reject sub-2-second automated bots)
    if (Date.now() - formMountTime.current < 2000) {
      say('Please review the form details before submitting.');
      return;
    }

    if (!user?.uid) {
      setFieldErrors({ global: 'You must be signed in to submit an opportunity.' });
      return;
    }

    const s1 = validateSection1();
    if (!s1) return;
    const s2 = validateSection2();
    if (!s2) return;
    const s3 = validateSection3();
    if (!s3) return;

    const cleanTitle = sanitizeMetadata(form.title, 150);
    const cleanOrg = sanitizeMetadata(form.organizer, 120);
    const cleanDesc = sanitizeDescription(form.description, 4000);
    const urlCheck = validateSafeHttpUrl(form.officialUrl);

    setSubmitting(true);
    setFieldErrors({});

    try {
      const deadlineTs = parseDateInputToTimestamp(form.deadline);
      const startTs = form.startDate ? parseDateInputToTimestamp(form.startDate) : Date.now();
      const endTs = form.endDate ? parseDateInputToTimestamp(form.endDate) : startTs + 86400000;

      // Construct final media string: primary banner (if custom) followed by gallery images
      const imagesList = [primaryBannerUrl, ...galleryUrls].filter(Boolean);
      const finalImageUrl = imagesList.join(',');

      const submitted = await submitOpportunity(user.uid, {
        title: cleanTitle,
        organizer: cleanOrg,
        category: effectiveCategory,
        mode: form.mode,
        location: form.mode === 'online' ? 'Online' : sanitizeMetadata(form.location, 120),
        description: cleanDesc,
        eligibility: sanitizeMetadata(form.eligibility, 300) || 'Open to all builders',
        teamSize: sanitizeMetadata(form.teamSize, 60),
        skills,
        startDate: startTs,
        endDate: endTs,
        deadline: deadlineTs,
        prize: sanitizeMetadata(form.prize, 100),
        officialUrl: urlCheck.normalized!,
        imageUrl: finalImageUrl
      });

      localStorage.removeItem(DRAFT_STORAGE_KEY);

      if (user.email) {
        sendSubmissionConfirmationEmail({
          recipientEmail: user.email,
          recipientName: user.displayName || undefined,
          opportunityTitle: cleanTitle,
          submissionId: submitted?.id,
          organizer: cleanOrg,
          category: effectiveCategory,
          mode: form.mode,
          deadline: formatDateToDDMMYYYY(form.deadline) || form.deadline,
          submissionPixels: 20,
          approvalPixels: 50
        }).catch(() => {});
      }

      setDone(true);
      say('Submitted successfully for review.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      const msg = err?.message || 'Failed to submit opportunity. Please try again.';
      setFieldErrors({ global: msg });
      say(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  const inputBase =
    'w-full rounded-xl pm-glass-input px-3.5 py-2.5 text-xs text-[#0e1b33] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition';
  const inputError = 'border-rose-500/80 dark:border-rose-500/80 focus:border-rose-500';
  const labelBase = 'block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5';
  const todayStr = new Date().toISOString().split('T')[0];

  // Success view
  if (done) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="pm-glass-card rounded-3xl p-8 sm:p-10 space-y-4">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
            <IconCheckCircle size={30} />
          </div>
          <h1 className="font-['Outfit',sans-serif] text-2xl font-extrabold text-[#0e1b33] dark:text-white">
            Submitted for Moderation
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
            Your submission has been queued for verification. Once approved by our team, it will be published to the platform and you will earn Pixels.
          </p>
          <div className="pt-4 flex flex-wrap justify-center gap-3">
            <Link
              to="/applications?tab=submissions"
              className="rounded-full px-5 py-2.5 text-xs font-bold pm-glass-control text-[#0e1b33] dark:text-white"
            >
              Track My Submissions
            </Link>
            <button
              type="button"
              onClick={() => {
                setDone(false);
                setForm(INITIAL_FORM);
                setSkills([]);
                setPrimaryBannerUrl('');
                setGalleryUrls([]);
                setMobileStep(1);
              }}
              className="rounded-full px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition cursor-pointer"
            >
              Submit Another
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8 space-y-5">
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full pm-glass-control text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-sky-400 transition cursor-pointer"
        >
          <IconArrowLeft size={14} />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={handleResetDraft}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition cursor-pointer"
          title="Clear saved draft"
        >
          <IconRotateCcw size={13} />
          <span>Clear Draft</span>
        </button>
      </div>

      {/* Title */}
      <div>
        <h1 className="font-['Outfit',sans-serif] text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0e1b33] dark:text-white">
          Share an Opportunity
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
          Submit verified programs, internships, hackathons, or fellowships for review.
        </p>
      </div>

      {/* Global Server or Network Error Banner */}
      {fieldErrors.global && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-semibold text-rose-600 dark:text-rose-300 flex items-start gap-2.5"
        >
          <IconAlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{fieldErrors.global}</span>
        </div>
      )}

      {/* Mobile 3-Step Wizard Indicator (Mobile Only) */}
      <div className="block md:hidden w-full space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 px-1">
          <span>Step {mobileStep} of 3</span>
          <span className="text-slate-500 dark:text-slate-400 font-medium">
            {mobileStep === 1 && 'Basic Information'}
            {mobileStep === 2 && 'Dates & Details'}
            {mobileStep === 3 && 'Cover & Submit'}
          </span>
        </div>

        {/* 3-Step Segmented Bar */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl pm-glass-control">
          {[
            { num: 1 as const, title: '1. Core & Link' },
            { num: 2 as const, title: '2. Details' },
            { num: 3 as const, title: '3. Media' }
          ].map((st) => (
            <button
              key={st.num}
              type="button"
              onClick={() => {
                if (st.num === 1) {
                  setMobileStep(1);
                } else if (st.num === 2) {
                  if (validateSection1()) setMobileStep(2);
                } else if (st.num === 3) {
                  if (validateSection1() && validateSection2()) setMobileStep(3);
                }
              }}
              className={`py-2 px-1 text-center rounded-xl text-xs font-bold truncate transition cursor-pointer ${
                mobileStep === st.num
                  ? 'bg-blue-600 text-white shadow-xs'
                  : mobileStep > st.num
                  ? 'text-blue-600 dark:text-sky-400 bg-blue-500/10'
                  : 'text-slate-500 dark:text-slate-400 hover:text-[#0e1b33] dark:hover:text-white'
              }`}
            >
              {st.title}
            </button>
          ))}
        </div>
      </div>

      {/* Single Column Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Anti-bot Honeypot */}
        <input
          type="text"
          name="website_hp"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="hidden"
          aria-hidden="true"
        />

        {/* ==================================================== */}
        {/* SECTION 1: Core Details & Official Link              */}
        {/* ==================================================== */}
        <section
          className={`pm-glass-card rounded-3xl p-6 space-y-4 ${
            mobileStep !== 1 ? 'hidden md:block' : 'block'
          }`}
        >
          <div className="border-b border-slate-200/80 dark:border-white/10 pb-3">
            <h2 className="font-['Outfit',sans-serif] text-sm font-bold text-[#0e1b33] dark:text-white uppercase tracking-wider">
              1. Core &amp; Official Link
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Primary identification and application destination
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="field-title" className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Opportunity Title <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400">{form.title.length}/150</span>
              </div>
              <input
                id="field-title"
                type="text"
                maxLength={150}
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g. Smart India Hackathon 2026"
                className={`${inputBase} ${fieldErrors.title ? inputError : ''}`}
              />
              {fieldErrors.title && (
                <p role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">{fieldErrors.title}</p>
              )}
            </div>

            {/* Organizer */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="field-organizer" className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Organizer / Host <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400">{form.organizer.length}/120</span>
              </div>
              <input
                id="field-organizer"
                type="text"
                maxLength={120}
                value={form.organizer}
                onChange={(e) => updateField('organizer', e.target.value)}
                placeholder="e.g. Google Cloud, MLH, IIT Bombay"
                className={`${inputBase} ${fieldErrors.organizer ? inputError : ''}`}
              />
              {fieldErrors.organizer && (
                <p role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">{fieldErrors.organizer}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label htmlFor="field-category" className={labelBase}>
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                id="field-category"
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
                className={`${inputBase} cursor-pointer dark:bg-[#07090e]`}
              >
                {cats.map((c) => (
                  <option key={c} value={c} className="bg-white dark:bg-[#07090e] text-[#0e1b33] dark:text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Category text input if "Other" is chosen */}
            {form.category === 'Other' && (
              <div>
                <label htmlFor="field-customCategory" className={labelBase}>
                  Custom Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="field-customCategory"
                  type="text"
                  maxLength={50}
                  value={form.customCategory}
                  onChange={(e) => updateField('customCategory', e.target.value)}
                  placeholder="e.g. Research Grant / Case Study"
                  className={`${inputBase} ${fieldErrors.customCategory ? inputError : ''}`}
                />
                {fieldErrors.customCategory && (
                  <p role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">{fieldErrors.customCategory}</p>
                )}
              </div>
            )}

            {/* Official Application URL (Top Priority) */}
            <div className={form.category === 'Other' ? 'sm:col-span-2' : ''}>
              <label htmlFor="field-officialUrl" className={labelBase}>
                Official Application URL <span className="text-rose-500">*</span>
              </label>
              <input
                id="field-officialUrl"
                type="url"
                value={form.officialUrl}
                onChange={(e) => updateField('officialUrl', e.target.value)}
                placeholder="https://example.com/apply"
                className={`${inputBase} ${fieldErrors.officialUrl ? inputError : ''}`}
              />
              {fieldErrors.officialUrl && (
                <p role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">{fieldErrors.officialUrl}</p>
              )}
            </div>

            {/* Mode (3-Button Segmented Control) */}
            <div className="sm:col-span-2">
              <span className={labelBase}>
                Mode <span className="text-rose-500">*</span>
              </span>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-200/50 dark:bg-white/5 border border-slate-300/60 dark:border-white/10 max-w-sm">
                {(['online', 'offline', 'hybrid'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => updateField('mode', m)}
                    className={`py-1.5 rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                      form.mode === m
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-[#0e1b33] dark:hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional Location */}
            {form.mode !== 'online' && (
              <div className="sm:col-span-2">
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="field-location" className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Location / Venue <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">{form.location.length}/120</span>
                </div>
                <input
                  id="field-location"
                  type="text"
                  maxLength={120}
                  value={form.location}
                  onChange={(e) => updateField('location', e.target.value)}
                  placeholder="e.g. Bengaluru, Karnataka (or Campus Auditorium)"
                  className={`${inputBase} ${fieldErrors.location ? inputError : ''}`}
                />
                {fieldErrors.location && (
                  <p role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">{fieldErrors.location}</p>
                )}
              </div>
            )}

            {/* Full Description */}
            <div className="sm:col-span-2">
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="field-description" className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Full Description <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400">{form.description.length}/4000</span>
              </div>
              <textarea
                id="field-description"
                rows={5}
                maxLength={4000}
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Outline program details, judging criteria, problem statements, or instructions (min 20 characters)..."
                className={`${inputBase} resize-y ${fieldErrors.description ? inputError : ''}`}
              />
              {fieldErrors.description && (
                <p role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">{fieldErrors.description}</p>
              )}
            </div>
          </div>

          {/* Section 1 Mobile Actions */}
          <div className="md:hidden pt-4 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-full px-4 py-2 text-xs font-bold pm-glass-control text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (validateSection1()) setMobileStep(2);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <span>Next</span>
              <IconArrowRight size={13} />
            </button>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SECTION 2: Schedule & Category-Specific Details       */}
        {/* ==================================================== */}
        <section
          className={`pm-glass-card rounded-3xl p-6 space-y-4 ${
            mobileStep !== 2 ? 'hidden md:block' : 'block'
          }`}
        >
          <div className="border-b border-slate-200/80 dark:border-white/10 pb-3">
            <h2 className="font-['Outfit',sans-serif] text-sm font-bold text-[#0e1b33] dark:text-white uppercase tracking-wider">
              2. Schedule &amp; Category Details
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Deadlines, rewards, and requirements adapted for {effectiveCategory}
            </p>
          </div>

          {/* Date Pickers (Full-Field Clickable) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="field-deadline" className={labelBase}>
                Application Deadline <span className="text-rose-500">*</span>
              </label>
              <input
                ref={deadlineRef}
                id="field-deadline"
                type="date"
                min={todayStr}
                value={form.deadline}
                onClick={() => handleDateClick(deadlineRef)}
                onFocus={() => handleDateClick(deadlineRef)}
                onChange={(e) => updateField('deadline', e.target.value)}
                className={`${inputBase} cursor-pointer ${fieldErrors.deadline ? inputError : ''}`}
              />
              {fieldErrors.deadline && (
                <p role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">{fieldErrors.deadline}</p>
              )}
            </div>

            <div>
              <label htmlFor="field-startDate" className={labelBase}>Start Date</label>
              <input
                ref={startDateRef}
                id="field-startDate"
                type="date"
                value={form.startDate}
                onClick={() => handleDateClick(startDateRef)}
                onFocus={() => handleDateClick(startDateRef)}
                onChange={(e) => updateField('startDate', e.target.value)}
                className={`${inputBase} cursor-pointer`}
              />
            </div>

            <div>
              <label htmlFor="field-endDate" className={labelBase}>End Date</label>
              <input
                ref={endDateRef}
                id="field-endDate"
                type="date"
                min={form.startDate || todayStr}
                value={form.endDate}
                onClick={() => handleDateClick(endDateRef)}
                onFocus={() => handleDateClick(endDateRef)}
                onChange={(e) => updateField('endDate', e.target.value)}
                className={`${inputBase} cursor-pointer`}
              />
            </div>
          </div>

          {/* Category-Adaptive Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Dynamic Compensation / Prize / Grant Field */}
            <div>
              <label htmlFor="field-prize" className={labelBase}>
                {getCompensationLabel()} {requiresCompensation && <span className="text-rose-500">*</span>}
              </label>
              <input
                id="field-prize"
                type="text"
                maxLength={100}
                value={form.prize}
                onChange={(e) => updateField('prize', e.target.value)}
                placeholder={getCompensationPlaceholder()}
                className={`${inputBase} ${fieldErrors.prize ? inputError : ''}`}
              />
              {fieldErrors.prize && (
                <p role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">{fieldErrors.prize}</p>
              )}
            </div>

            {/* Team Size (Shown if Hackathon, Competition, or Other) */}
            {showTeamSize && (
              <div>
                <label htmlFor="field-teamSize" className={labelBase}>
                  Team Size {requiresTeamSize && <span className="text-rose-500">*</span>}
                </label>
                <input
                  id="field-teamSize"
                  type="text"
                  maxLength={60}
                  value={form.teamSize}
                  onChange={(e) => updateField('teamSize', e.target.value)}
                  placeholder={requiresTeamSize ? 'e.g. 2–4 members' : 'e.g. 1–4 members or Solo'}
                  className={`${inputBase} ${fieldErrors.teamSize ? inputError : ''}`}
                />
                {fieldErrors.teamSize && (
                  <p role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">{fieldErrors.teamSize}</p>
                )}
              </div>
            )}

            {/* Eligibility (Mandatory for Scholarships, optional for others) */}
            <div className={!showTeamSize ? 'sm:col-span-2' : ''}>
              <label htmlFor="field-eligibility" className={labelBase}>
                Eligibility Criteria {requiresEligibility && <span className="text-rose-500">*</span>}
              </label>
              <input
                id="field-eligibility"
                type="text"
                maxLength={300}
                value={form.eligibility}
                onChange={(e) => updateField('eligibility', e.target.value)}
                placeholder={
                  requiresEligibility
                    ? 'e.g. Enrolled undergraduate students with CGPA >= 8.0'
                    : 'e.g. Open to all students & early-career developers'
                }
                className={`${inputBase} ${fieldErrors.eligibility ? inputError : ''}`}
              />
              {fieldErrors.eligibility && (
                <p role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">{fieldErrors.eligibility}</p>
              )}
            </div>
          </div>

          {/* Interactive Skills Chip Builder */}
          <div>
            <label htmlFor="field-skills" className={labelBase}>
              Skills &amp; Tags <span className="text-[11px] font-normal text-slate-400">({skills.length}/8)</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl pm-glass-input p-2 min-h-[44px]">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/10 dark:bg-sky-500/15 text-blue-700 dark:text-sky-300 text-xs font-bold border border-blue-500/20"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="hover:text-rose-500 cursor-pointer"
                    aria-label={`Remove ${skill}`}
                  >
                    <IconX size={12} />
                  </button>
                </span>
              ))}
              <input
                id="field-skills"
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown}
                placeholder={skills.length === 0 ? 'Type a tag and press Enter...' : 'Add another tag...'}
                className="flex-1 min-w-[130px] bg-transparent px-1.5 py-1 text-xs text-[#0e1b33] dark:text-white placeholder:text-slate-400 outline-none"
              />
            </div>

            {/* Quick-add preset tags */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRESET_TAGS.filter((t) => !skills.includes(t)).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => addSkill(t)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/60 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/20 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-white/10 transition cursor-pointer"
                >
                  <IconPlus size={10} />
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2 Mobile Actions */}
          <div className="md:hidden pt-4 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setMobileStep(1)}
              className="rounded-full px-4 py-2 text-xs font-bold pm-glass-control text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (validateSection2()) setMobileStep(3);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <span>Next</span>
              <IconArrowRight size={13} />
            </button>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SECTION 3: Media (Separated Primary & Gallery)        */}
        {/* ==================================================== */}
        <section
          className={`pm-glass-card rounded-3xl p-6 space-y-5 ${
            mobileStep !== 3 ? 'hidden md:block' : 'block'
          }`}
        >
          <div className="border-b border-slate-200/80 dark:border-white/10 pb-3">
            <h2 className="font-['Outfit',sans-serif] text-sm font-bold text-[#0e1b33] dark:text-white uppercase tracking-wider">
              3. Media &amp; Banners
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Primary 16:9 banner and optional gallery posters
            </p>
          </div>

          {/* Primary Banner Block */}
          <div id="field-banner" className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Cover Banner Image <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">(Optional · 16:9 recommended)</span>
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  If left empty, a category cover will be generated automatically.
                </p>
              </div>

              {primaryBannerUrl && (
                <button
                  type="button"
                  onClick={handleRemovePrimaryBanner}
                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 transition cursor-pointer"
                >
                  Remove &amp; Use Default Cover
                </button>
              )}
            </div>

            {primaryBannerUrl ? (
              /* Custom banner uploaded: Compact preview */
              <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 bg-slate-900 shadow-xs h-36 sm:h-40 w-full group">
                <img src={primaryBannerUrl} alt="Primary Banner" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
                <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold border border-white/20">
                  Custom Banner
                </span>
                <button
                  type="button"
                  onClick={handleRemovePrimaryBanner}
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/70 backdrop-blur-sm text-white hover:bg-rose-600 transition cursor-pointer"
                  title="Remove banner"
                  aria-label="Remove banner"
                >
                  <IconX size={14} />
                </button>
              </div>
            ) : (
              /* Compact Upload Box */
              <label className="flex flex-col items-center justify-center h-20 sm:h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/15 bg-white/40 dark:bg-white/[0.03] hover:border-blue-500/60 hover:bg-blue-50/20 dark:hover:bg-blue-500/5 p-3 text-center cursor-pointer transition">
                <div className="flex items-center gap-2">
                  <IconImagePlus size={18} className="text-blue-600 dark:text-sky-400" />
                  <span className="text-xs font-bold text-[#0e1b33] dark:text-slate-200">
                    {uploadingPrimary ? 'Uploading...' : 'Click to Upload Custom Banner'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  16:9 recommended · JPEG, PNG, or WebP up to 2 MB
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePrimaryBannerUpload}
                  disabled={uploadingPrimary}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Additional Gallery Images */}
          <div className="space-y-2 pt-1 border-t border-slate-200/50 dark:border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Additional Images <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">(Optional · max 2)</span>
              </span>
              <span className="text-[10px] text-slate-400">{galleryUrls.length}/2 uploaded</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {galleryUrls.map((url, idx) => (
                <div
                  key={url + idx}
                  className="relative h-20 rounded-xl overflow-hidden border border-slate-200/80 dark:border-white/10 bg-slate-900 shadow-xs"
                >
                  <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.2 rounded bg-black/70 text-white text-[9px] font-bold">
                    #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveGalleryImage(idx)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white hover:bg-rose-600 transition cursor-pointer"
                    aria-label="Remove gallery image"
                  >
                    <IconX size={11} />
                  </button>
                </div>
              ))}

              {galleryUrls.length < 2 && (
                <label className="flex flex-col items-center justify-center h-20 rounded-xl border border-dashed border-slate-300 dark:border-white/15 bg-white/40 dark:bg-white/[0.03] hover:border-blue-500/60 p-2 text-center cursor-pointer transition">
                  <IconPlus size={16} className="text-slate-500 dark:text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                    {uploadingGallery ? 'Uploading...' : 'Add poster'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleGalleryUpload}
                    disabled={uploadingGallery}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Form Card Bottom Actions: Inline, Close Together, Right-Aligned */}
          <div className="pt-4 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-end gap-2.5">
            {/* Mobile Back button */}
            <button
              type="button"
              onClick={() => setMobileStep(2)}
              className="md:hidden rounded-full px-4 py-2 text-xs font-bold pm-glass-control text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Back
            </button>

            {/* Desktop Cancel button */}
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="hidden md:inline-flex rounded-full px-4 py-2 text-xs font-bold pm-glass-control text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>

            {/* Final Submit Opportunity Button */}
            <button
              type="submit"
              disabled={submitting || uploadingPrimary || uploadingGallery}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer"
            >
              {submitting ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit Opportunity (+50 Pixels)</span>
              )}
            </button>
          </div>
        </section>
      </form>
    </main>
  );
}
