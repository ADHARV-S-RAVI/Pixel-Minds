import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Lock,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  RotateCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card, Btn } from '../ui';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../store';
import { updateUserProfile, checkUsernameAvailable } from '../services/users';
import { OtpInput } from '../components/OtpInput';
import {
  COURSE_OPTIONS,
  getBranchesForCourse
} from '../data/academicOptions';

export function Settings() {
  const { userProfile, user, refreshProfile, resetPasswordForEmail, verifyRecoveryOtp, updatePassword } = useAuth();
  const { say } = useApp();
  const navigate = useNavigate();

  // Profile details state
  const [nameInput, setNameInput] = useState(userProfile?.displayName || '');
  const [usernameInput, setUsernameInput] = useState(userProfile?.username || '');
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    valid: boolean;
    available: boolean;
    message: string;
  } | null>(null);
  const [bioInput, setBioInput] = useState(userProfile?.bio || '');
  const [collegeInput, setCollegeInput] = useState(userProfile?.college || '');
  const [courseInput, setCourseInput] = useState(userProfile?.course || '');
  const [customCourseInput, setCustomCourseInput] = useState('');
  const [yearInput, setYearInput] = useState(userProfile?.yearOfStudy || '');
  const [branchInput, setBranchInput] = useState(userProfile?.branch || '');
  const [customBranchInput, setCustomBranchInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // OTP-Protected Change password state
  const [pwdStep, setPwdStep] = useState<'init' | 'otp' | 'new_password'>('init');
  const [pwdOtp, setPwdOtp] = useState('');
  const [pwdResendCooldown, setPwdResendCooldown] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  // Cooldown countdown timer for password OTP resend
  useEffect(() => {
    if (pwdResendCooldown <= 0) return;
    const interval = setInterval(() => {
      setPwdResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [pwdResendCooldown]);

  // Sync inputs when userProfile updates
  useEffect(() => {
    if (userProfile) {
      setNameInput(userProfile.displayName || '');
      setUsernameInput(userProfile.username || '');
      setBioInput(userProfile.bio || '');
      setCollegeInput(userProfile.college || '');
      const c = userProfile.course || '';
      if ((COURSE_OPTIONS as readonly string[]).includes(c)) {
        setCourseInput(c);
      } else if (c) {
        setCourseInput('Other');
        setCustomCourseInput(c);
      }
      setYearInput(userProfile.yearOfStudy || '');
      const b = userProfile.branch || '';
      const availableBranches = c ? getBranchesForCourse(c) : [];
      if (availableBranches.includes(b)) {
        setBranchInput(b);
      } else if (b) {
        setBranchInput('Other');
        setCustomBranchInput(b);
      }
    }
  }, [userProfile]);

  // Username validation & availability debounce for settings
  useEffect(() => {
    const raw = usernameInput.trim().toLowerCase();
    if (!raw || (userProfile?.username && raw === userProfile.username.toLowerCase())) {
      setUsernameStatus(null);
      return;
    }

    if (raw.length < 3) {
      setUsernameStatus({
        checking: false,
        valid: false,
        available: false,
        message: 'Username must be at least 3 characters.'
      });
      return;
    }

    if (raw.length > 20) {
      setUsernameStatus({
        checking: false,
        valid: false,
        available: false,
        message: 'Username cannot exceed 20 characters.'
      });
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(raw)) {
      setUsernameStatus({
        checking: false,
        valid: false,
        available: false,
        message: 'Only letters, numbers, and underscores are allowed.'
      });
      return;
    }

    setUsernameStatus({ checking: true, valid: true, available: false, message: 'Checking availability...' });

    const timer = setTimeout(async () => {
      try {
        const res = await checkUsernameAvailable(raw, user?.uid);
        setUsernameStatus({
          checking: false,
          valid: res.available,
          available: res.available,
          message: res.available ? `@${raw} is available` : (res.error || 'Username already taken.')
        });
      } catch {
        setUsernameStatus({
          checking: false,
          valid: false,
          available: false,
          message: 'Error verifying availability.'
        });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [usernameInput, userProfile?.username, user?.uid]);

  useEffect(() => {
    if (user?.uid && refreshProfile) {
      refreshProfile();
    }
  }, [user?.uid]);

  const handleSaveAllSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    const cleanUsername = usernameInput.trim().toLowerCase();
    if (cleanUsername) {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
        say('Username must be 3-20 characters: letters, numbers, and underscores only.');
        return;
      }
      if (usernameStatus && !usernameStatus.available && !usernameStatus.checking) {
        say(usernameStatus.message || 'Please choose an available username.');
        return;
      }
    }

    setSavingSettings(true);
    try {
      const finalCourse = courseInput === 'Other' ? customCourseInput.trim() : courseInput.trim();
      const finalBranch = (courseInput === 'Other' || branchInput === 'Other')
        ? customBranchInput.trim()
        : branchInput.trim();

      await updateUserProfile(user.uid, {
        displayName: nameInput.trim(),
        username: cleanUsername || undefined,
        bio: bioInput.trim(),
        college: collegeInput.trim(),
        course: finalCourse,
        yearOfStudy: yearInput.trim(),
        branch: finalBranch
      });
      if (refreshProfile) await refreshProfile();
      say('Settings updated successfully');
    } catch (err: any) {
      say(err?.message || 'Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Step 1: Request 6-digit OTP to user's registered email
  const handleRequestPasswordOtp = async () => {
    if (!user?.email) {
      setPwdError('No verified email associated with this account.');
      return;
    }

    setPwdLoading(true);
    setPwdError('');
    setPwdSuccess('');
    try {
      await resetPasswordForEmail(user.email);
      setPwdStep('otp');
      setPwdResendCooldown(60);
      setPwdSuccess(`A 6-digit verification code has been sent to ${user.email}.`);
    } catch (err: any) {
      setPwdError(err?.message || 'Failed to send verification code. Please try again.');
    } finally {
      setPwdLoading(false);
    }
  };

  // Step 2: Verify 6-digit OTP code using Supabase recovery flow
  const handleVerifyPasswordOtp = async (codeToVerify?: string) => {
    const token = (codeToVerify || pwdOtp).trim();
    if (token.length !== 6) {
      setPwdError('Please enter the full 6-digit verification code.');
      return;
    }

    if (!user?.email) return;

    setPwdLoading(true);
    setPwdError('');
    setPwdSuccess('');
    try {
      await verifyRecoveryOtp(user.email, token);
      setPwdStep('new_password');
      setPwdSuccess('Verification code accepted. Please set your new password below.');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('expired')) {
        setPwdError('Verification code has expired. Please request a new code.');
      } else if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('token')) {
        setPwdError('Invalid 6-digit verification code. Please check and try again.');
      } else {
        setPwdError(msg || 'Failed to verify code. Please try again.');
      }
    } finally {
      setPwdLoading(false);
    }
  };

  // Resend password change OTP
  const handleResendPasswordOtp = async () => {
    if (pwdResendCooldown > 0 || pwdLoading || !user?.email) return;
    setPwdLoading(true);
    setPwdError('');
    setPwdSuccess('');
    try {
      setPwdResendCooldown(60);
      await resetPasswordForEmail(user.email);
      setPwdSuccess(`A new 6-digit code has been sent to ${user.email}.`);
    } catch (err: any) {
      setPwdError(err?.message || 'Failed to resend verification code.');
    } finally {
      setPwdLoading(false);
    }
  };

  // Step 3: Set and confirm new password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPwdError('Passwords do not match.');
      return;
    }

    setPwdLoading(true);
    try {
      await updatePassword(newPassword);
      setPwdSuccess('Password changed successfully! Your account is secure.');
      setNewPassword('');
      setConfirmNewPassword('');
      setPwdOtp('');
      setPwdStep('init');
      say('Password changed successfully');
    } catch (err: any) {
      setPwdError(err.message || 'Failed to change password. Please try again.');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Top Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-[#16171D] font-['Outfit',sans-serif] sm:text-3xl">
          Account Settings
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Manage your personal details, academic information, and security preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Academic & Profile Details Card */}
        <Card className="p-6 pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
          <h2 className="text-sm font-bold text-[#16171D] uppercase tracking-wider mb-4 flex items-center gap-2">
            <GraduationCap size={16} className="text-[#C5A059]" />
            Profile &amp; Academic Information
          </h2>
          <form onSubmit={handleSaveAllSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2D2A26] mb-1">Full Name</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-white/80 px-3.5 py-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                  placeholder="Your Name"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#2D2A26]">Unique Username</label>
                  <span className="text-[10px] text-slate-400">Letters, numbers, _</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">@</span>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-zA-Z0-9_]/g, ''))}
                    className={`w-full rounded-xl border ${
                      usernameStatus
                        ? usernameStatus.available
                          ? 'border-emerald-500 bg-emerald-50/20'
                          : 'border-rose-500 bg-rose-50/20'
                        : 'border-black/10 bg-white/80'
                    } pl-7 pr-8 py-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]`}
                    placeholder="username"
                    maxLength={20}
                  />
                  {usernameStatus?.checking && (
                    <div className="absolute right-2.5 top-3">
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400/30 border-t-[#C5A059]" />
                    </div>
                  )}
                  {usernameStatus && !usernameStatus.checking && (
                    <div className="absolute right-2.5 top-2.5">
                      {usernameStatus.available ? (
                        <CheckCircle2 size={14} className="text-emerald-600" />
                      ) : (
                        <AlertCircle size={14} className="text-rose-600" />
                      )}
                    </div>
                  )}
                </div>
                {usernameStatus && (
                  <p className={`mt-1 text-[11px] font-medium ${usernameStatus.available ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {usernameStatus.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2D2A26] mb-1">College / University</label>
                <input
                  type="text"
                  value={collegeInput}
                  onChange={(e) => setCollegeInput(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-white/80 px-3.5 py-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                  placeholder="e.g. Stanford / IIT Delhi"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D2A26] mb-1">Account Email</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full rounded-xl border border-black/10 bg-slate-100/80 px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D2A26] mb-1">Bio</label>
              <textarea
                rows={2}
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white/80 px-3.5 py-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                placeholder="A short description about yourself..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2D2A26] mb-1">Course / Degree</label>
                <select
                  value={courseInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCourseInput(val);
                    setBranchInput('');
                    if (val !== 'Other') {
                      setCustomCourseInput('');
                    }
                  }}
                  className="w-full rounded-xl border border-black/10 bg-white/80 px-3.5 py-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D] cursor-pointer"
                >
                  <option value="">Select Course</option>
                  {COURSE_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                {courseInput === 'Other' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={customCourseInput}
                      onChange={(e) => setCustomCourseInput(e.target.value)}
                      placeholder="Enter your course name"
                      className="w-full rounded-xl border border-[#C5A059]/60 bg-white px-3 py-2 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D2A26] mb-1">Year of Study</label>
                <select
                  value={yearInput}
                  onChange={(e) => setYearInput(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-white/80 px-3.5 py-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D] cursor-pointer"
                >
                  <option value="">Select Year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Postgraduate">Postgraduate</option>
                  <option value="Graduate / Alum">Graduate / Alum</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D2A26] mb-1">Branch / Department</label>
                {courseInput && courseInput !== 'Other' ? (
                  <>
                    <select
                      value={branchInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBranchInput(val);
                        if (val !== 'Other') {
                          setCustomBranchInput('');
                        }
                      }}
                      className="w-full rounded-xl border border-black/10 bg-white/80 px-3.5 py-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D] cursor-pointer"
                    >
                      <option value="">Select Branch</option>
                      {getBranchesForCourse(courseInput).map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>

                    {branchInput === 'Other' && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={customBranchInput}
                          onChange={(e) => setCustomBranchInput(e.target.value)}
                          placeholder="Enter your branch / specialization"
                          className="w-full rounded-xl border border-[#C5A059]/60 bg-white px-3 py-2 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <input
                    type="text"
                    value={customBranchInput}
                    onChange={(e) => setCustomBranchInput(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white/80 px-3.5 py-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                    placeholder={courseInput === 'Other' ? "Enter your branch / specialization" : "Select course first or enter branch"}
                  />
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Btn type="submit" disabled={savingSettings} className="!text-xs !rounded-full !px-5">
                {savingSettings ? 'Saving...' : 'Save Profile Changes'}
              </Btn>
            </div>
          </form>
        </Card>

        {/* Change Password Card - Strictly Protected by 6-digit Email OTP */}
        <Card className="p-6 pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
          <h2 className="text-sm font-bold text-[#16171D] uppercase tracking-wider mb-2 flex items-center gap-2">
            <Lock size={16} className="text-[#C5A059]" />
            Security &amp; Password
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Password changes strictly require 6-digit email OTP verification sent to your registered address.
          </p>

          {pwdError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{pwdError}</span>
            </div>
          )}

          {pwdSuccess && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
              <span>{pwdSuccess}</span>
            </div>
          )}

          {pwdStep === 'init' && (
            <div className="space-y-4 max-w-md">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-2">
                <p className="font-semibold text-slate-700">Account Security Verification</p>
                <p className="text-slate-500">
                  To protect your account, we will send a 6-digit verification code to{' '}
                  <span className="font-bold text-slate-800">{user?.email}</span> before allowing password updates.
                </p>
              </div>

              <Btn
                type="button"
                onClick={handleRequestPasswordOtp}
                disabled={pwdLoading || !user?.email}
                className="!text-xs !rounded-full !px-5"
              >
                {pwdLoading ? 'Sending verification code...' : 'Send Verification Code'}
              </Btn>
            </div>
          )}

          {pwdStep === 'otp' && (
            <div className="space-y-4 max-w-md">
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 text-xs space-y-1">
                <p className="font-semibold text-blue-900">Enter 6-Digit Code</p>
                <p className="text-blue-700">
                  Please enter the code sent to <span className="font-bold">{user?.email}</span>.
                </p>
              </div>

              <div className="py-2">
                <OtpInput
                  length={6}
                  value={pwdOtp}
                  onChange={(val) => {
                    setPwdOtp(val);
                    if (pwdError) setPwdError('');
                  }}
                  onComplete={(code) => handleVerifyPasswordOtp(code)}
                  disabled={pwdLoading}
                  hasError={Boolean(pwdError)}
                />
              </div>

              <div className="flex items-center gap-3">
                <Btn
                  type="button"
                  onClick={() => handleVerifyPasswordOtp()}
                  disabled={pwdLoading || pwdOtp.length !== 6}
                  className="!text-xs !rounded-full !px-5"
                >
                  {pwdLoading ? 'Verifying code...' : 'Verify Code'}
                </Btn>

                <button
                  type="button"
                  onClick={handleResendPasswordOtp}
                  disabled={pwdResendCooldown > 0 || pwdLoading}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 disabled:text-slate-400 transition cursor-pointer disabled:cursor-not-allowed"
                >
                  <RotateCw size={13} className={pwdResendCooldown > 0 ? 'animate-spin' : ''} />
                  <span>
                    {pwdResendCooldown > 0 ? `Resend code in ${pwdResendCooldown}s` : 'Resend Code'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPwdStep('init');
                    setPwdOtp('');
                    setPwdError('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 ml-auto transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {pwdStep === 'new_password' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-bold text-[#2D2A26] mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white/80 pl-3.5 pr-10 py-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D2A26] mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white/80 pl-3.5 pr-10 py-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <Btn type="submit" disabled={pwdLoading} className="!text-xs !rounded-full !px-5">
                  {pwdLoading ? 'Saving Password...' : 'Save New Password'}
                </Btn>
                <button
                  type="button"
                  onClick={() => {
                    setPwdStep('init');
                    setNewPassword('');
                    setConfirmNewPassword('');
                    setPwdOtp('');
                    setPwdError('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

