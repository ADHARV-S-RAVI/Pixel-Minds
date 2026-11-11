import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Lock,
  User,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import { Card, Btn } from '../ui';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../store';
import { updateUserProfile } from '../services/users';
import {
  COURSE_OPTIONS,
  getBranchesForCourse
} from '../data/academicOptions';

export function Settings() {
  const { userProfile, user, refreshProfile, updatePassword } = useAuth();
  const { say } = useApp();
  const navigate = useNavigate();

  // Profile details state
  const [nameInput, setNameInput] = useState(userProfile?.displayName || '');
  const [bioInput, setBioInput] = useState(userProfile?.bio || '');
  const [collegeInput, setCollegeInput] = useState(userProfile?.college || '');
  const [courseInput, setCourseInput] = useState(userProfile?.course || '');
  const [customCourseInput, setCustomCourseInput] = useState('');
  const [yearInput, setYearInput] = useState(userProfile?.yearOfStudy || '');
  const [branchInput, setBranchInput] = useState(userProfile?.branch || '');
  const [customBranchInput, setCustomBranchInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Change password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  // Sync inputs when userProfile updates
  useEffect(() => {
    if (userProfile) {
      setNameInput(userProfile.displayName || '');
      setBioInput(userProfile.bio || '');
      setCollegeInput(userProfile.college || '');
      const c = userProfile.course || '';
      if (COURSE_OPTIONS.includes(c)) {
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

  useEffect(() => {
    if (user?.uid && refreshProfile) {
      refreshProfile();
    }
  }, [user?.uid]);

  const handleSaveAllSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setSavingSettings(true);
    try {
      const finalCourse = courseInput === 'Other' ? customCourseInput.trim() : courseInput.trim();
      const finalBranch = (courseInput === 'Other' || branchInput === 'Other')
        ? customBranchInput.trim()
        : branchInput.trim();

      await updateUserProfile(user.uid, {
        displayName: nameInput.trim(),
        bio: bioInput.trim(),
        college: collegeInput.trim(),
        course: finalCourse,
        yearOfStudy: yearInput.trim(),
        branch: finalBranch
      });
      if (refreshProfile) await refreshProfile();
      say('Settings updated successfully');
    } catch {
      say('Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
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

    setChangingPwd(true);
    try {
      await updatePassword(newPassword);
      setPwdSuccess('Password changed successfully.');
      setNewPassword('');
      setConfirmNewPassword('');
      say('Password changed successfully');
    } catch (err: any) {
      setPwdError(err.message || 'Failed to change password. Please try again.');
    } finally {
      setChangingPwd(false);
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
                <label className="block text-xs font-bold text-[#2D2A26] mb-1">College / University</label>
                <input
                  type="text"
                  value={collegeInput}
                  onChange={(e) => setCollegeInput(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-white/80 px-3.5 py-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                  placeholder="e.g. Stanford / IIT Delhi"
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

        {/* Change Password Card */}
        <Card className="p-6 pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
          <h2 className="text-sm font-bold text-[#16171D] uppercase tracking-wider mb-2 flex items-center gap-2">
            <Lock size={16} className="text-[#C5A059]" />
            Change Password
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Update your account password securely.
          </p>

          {pwdError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-xs">
              {pwdError}
            </div>
          )}

          {pwdSuccess && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 size={14} />
              {pwdSuccess}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-bold text-[#2D2A26] mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white/80 px-3.5 py-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                placeholder="Min. 6 characters"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D2A26] mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white/80 px-3.5 py-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
            </div>

            <div className="pt-2">
              <Btn type="submit" disabled={changingPwd} className="!text-xs !rounded-full !px-5">
                {changingPwd ? 'Updating Password...' : 'Update Password'}
              </Btn>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

