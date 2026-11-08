import React, { useRef, useEffect } from 'react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (otp: string) => void;
  onComplete?: (otp: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  hasError?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
  hasError = false
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Split value into array of single characters
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus, disabled]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Extract only digits
    const cleanDigits = rawVal.replace(/\D/g, '');

    if (!cleanDigits) {
      // User erased or entered non-digit
      const newDigits = [...digits];
      newDigits[index] = '';
      const newOtp = newDigits.join('');
      onChange(newOtp);
      return;
    }

    if (cleanDigits.length > 1) {
      // User typed or pasted multiple characters into a single box
      handlePastedData(cleanDigits, index);
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleanDigits;
    const newOtp = newDigits.join('');
    onChange(newOtp);

    // Auto-advance focus to the next input
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // If all digits filled, fire onComplete
    if (newOtp.length === length && !newOtp.includes('')) {
      onComplete?.(newOtp);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Current box is empty, move back and clear previous
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePastedData = (pastedText: string, startIndex = 0) => {
    const cleaned = pastedText.replace(/\D/g, '').slice(0, length);
    if (!cleaned) return;

    const newDigits = [...digits];
    for (let i = 0; i < cleaned.length; i++) {
      const targetIndex = startIndex + i;
      if (targetIndex < length) {
        newDigits[targetIndex] = cleaned[i];
      }
    }

    const newOtp = newDigits.join('');
    onChange(newOtp);

    // Focus next available empty box or the last box
    const nextIndex = Math.min(startIndex + cleaned.length, length - 1);
    inputRefs.current[nextIndex]?.focus();

    if (newOtp.length === length) {
      onComplete?.(newOtp);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    handlePastedData(pasted, 0);
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 my-2" role="group" aria-label="6-digit verification code">
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => { inputRefs.current[idx] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          maxLength={idx === 0 ? length : 1}
          value={digits[idx]}
          onChange={(e) => handleChange(idx, e)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          aria-label={`Digit ${idx + 1}`}
          className={`h-12 w-10 sm:h-14 sm:w-12 text-center text-lg sm:text-2xl font-bold font-mono rounded-xl bg-[#0B1628]/80 text-white border transition-all outline-none select-all ${
            hasError
              ? 'border-rose-500/80 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/30'
              : 'border-slate-700/80 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-600'}`}
        />
      ))}
    </div>
  );
};

