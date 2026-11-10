import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { submitOpportunity } from '../services/opportunities';
import { uploadOpportunityImage, validateOpportunityImageFile } from '../services/storage';
import { parseDateInputToTimestamp, validateOpportunityDates, formatDateToDDMMYYYY } from '../utils/dateUtils';
import { sendSubmissionConfirmationEmail } from '../services/emailService';
import { Upload, CheckCircle } from 'lucide-react';

const CATEGORIES = ['Hackathon', 'Tech Event', 'Workshop', 'Internship', 'Competition', 'Scholarship', 'Course', 'Startup Program', 'Conference', 'Other'];

const inputClass = "block w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-shadow bg-white text-slate-900";
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

export function SubmitOpportunity() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Hackathon',
    organizer: '',
    deadline: '',
    startDate: '',
    endDate: '',
    location: '',
    mode: 'online' as 'online' | 'offline' | 'hybrid',
    prize: '',
    eligibility: '',
    teamSize: '',
    skills: '',
    imageUrl: '',
    officialUrl: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError('You must be logged in to submit an opportunity.');
      return;
    }

    const dateVal = validateOpportunityDates({
      startDate: formData.startDate,
      endDate: formData.endDate,
      deadline: formData.deadline
    });
    if (!dateVal.valid) {
      setError(dateVal.error || 'Please provide valid dates.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let finalImageUrl = formData.imageUrl;
      if (imageFile) {
        const fileVal = validateOpportunityImageFile(imageFile);
        if (!fileVal.valid) {
          setError(fileVal.error || 'Invalid image file.');
          setLoading(false);
          return;
        }
        finalImageUrl = await uploadOpportunityImage(imageFile, currentUser.uid);
      }

      const submitted = await submitOpportunity(currentUser.uid, {
        ...formData,
        imageUrl: finalImageUrl,
        deadline: parseDateInputToTimestamp(formData.deadline),
        startDate: formData.startDate ? parseDateInputToTimestamp(formData.startDate) : Date.now(),
        endDate: formData.endDate ? parseDateInputToTimestamp(formData.endDate) : Date.now() + 86400000,
        skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean)
      });

      if (currentUser?.email) {
        sendSubmissionConfirmationEmail({
          recipientEmail: currentUser.email,
          recipientName: currentUser.displayName || undefined,
          opportunityTitle: formData.title,
          submissionId: submitted?.id,
          organizer: formData.organizer,
          category: formData.category,
          mode: formData.mode,
          deadline: formData.deadline,
          submissionPixels: 20,
          approvalPixels: 50
        }).catch((emailErr: unknown) => {
          console.warn('[SubmitOpportunity] Email notification note:', emailErr);
        });
      }

      setSuccess(true);
      window.scrollTo(0, 0);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to submit opportunity. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Submission Successful!</h2>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">
            Your opportunity has been submitted for review. Once approved by an admin, it will be published to the community.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/my-submissions" className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl text-sm hover:bg-slate-50 transition-colors">
              View My Submissions
            </Link>
            <button onClick={() => { setSuccess(false); setFormData({ title: '', description: '', category: 'Hackathon', organizer: '', deadline: '', startDate: '', endDate: '', location: '', mode: 'online', prize: '', eligibility: '', teamSize: '', skills: '', imageUrl: '', officialUrl: '' }); setImageFile(null); }} className="px-5 py-2.5 bg-sky-500 text-white font-semibold rounded-xl text-sm hover:bg-sky-600 transition-colors">
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Submit an Opportunity</h1>
          <p className="mt-2 text-slate-500 text-sm">
            Share a tech opportunity with the Pixel Minds community. All submissions are reviewed before publishing.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-5 pb-3 border-b border-slate-100">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className={labelClass}>Opportunity Title <span className="text-red-400">*</span></label>
                <input type="text" name="title" id="title" required value={formData.title} onChange={handleChange} className={inputClass} placeholder="e.g. Google Summer of Code 2024" />
              </div>
              <div>
                <label htmlFor="description" className={labelClass}>Description <span className="text-red-400">*</span></label>
                <textarea name="description" id="description" rows={5} required value={formData.description} onChange={handleChange} className={inputClass} placeholder="Describe the opportunity in detail..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className={labelClass}>Category <span className="text-red-400">*</span></label>
                  <select name="category" id="category" required value={formData.category} onChange={handleChange} className={inputClass}>
                    {CATEGORIES.map(c => (<option key={c} value={c}>{c}</option>))}
                  </select>
                </div>
                <div>
                  <label htmlFor="organizer" className={labelClass}>Organizer <span className="text-red-400">*</span></label>
                  <input type="text" name="organizer" id="organizer" required value={formData.organizer} onChange={handleChange} className={inputClass} placeholder="e.g. Google, MLH" />
                </div>
              </div>
            </div>
          </div>

          {/* Dates & Location */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-5 pb-3 border-b border-slate-100">Dates & Location</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="deadline" className={labelClass}>Application Deadline <span className="text-red-400">*</span></label>
                <input
                  type="date"
                  name="deadline"
                  id="deadline"
                  required
                  min="1000-01-01"
                  max={formData.endDate || "9999-12-31"}
                  value={formData.deadline}
                  onChange={handleChange}
                  className={inputClass}
                />
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>Format: DD/MM/YYYY</span>
                  {formData.deadline && formatDateToDDMMYYYY(formData.deadline) && (
                    <span className="font-semibold text-slate-800">
                      Display: {formatDateToDDMMYYYY(formData.deadline)}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="startDate" className={labelClass}>Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  id="startDate"
                  min="1000-01-01"
                  max="9999-12-31"
                  value={formData.startDate}
                  onChange={handleChange}
                  className={inputClass}
                />
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>Format: DD/MM/YYYY</span>
                  {formData.startDate && formatDateToDDMMYYYY(formData.startDate) && (
                    <span className="font-semibold text-slate-800">
                      Display: {formatDateToDDMMYYYY(formData.startDate)}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="endDate" className={labelClass}>End Date</label>
                <input
                  type="date"
                  name="endDate"
                  id="endDate"
                  min={formData.startDate || "1000-01-01"}
                  max="9999-12-31"
                  value={formData.endDate}
                  onChange={handleChange}
                  className={inputClass}
                />
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>Format: DD/MM/YYYY</span>
                  {formData.endDate && formatDateToDDMMYYYY(formData.endDate) && (
                    <span className="font-semibold text-slate-800">
                      Display: {formatDateToDDMMYYYY(formData.endDate)}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="mode" className={labelClass}>Mode <span className="text-red-400">*</span></label>
                <select name="mode" id="mode" required value={formData.mode} onChange={handleChange} className={inputClass}>
                  <option value="online">Online</option>
                  <option value="offline">Offline / In-person</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="location" className={labelClass}>Location <span className="text-slate-400 font-normal">(if offline/hybrid)</span></label>
                <input type="text" name="location" id="location" value={formData.location} onChange={handleChange} className={inputClass} placeholder="e.g. San Francisco, CA" />
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-5 pb-3 border-b border-slate-100">Requirements & Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="eligibility" className={labelClass}>Eligibility <span className="text-red-400">*</span></label>
                <input type="text" name="eligibility" id="eligibility" required value={formData.eligibility} onChange={handleChange} className={inputClass} placeholder="e.g. University students, High schoolers" />
              </div>
              <div>
                <label htmlFor="prize" className={labelClass}>Prize / Stipend</label>
                <input type="text" name="prize" id="prize" value={formData.prize} onChange={handleChange} className={inputClass} placeholder="e.g. $10,000 Total Pool" />
              </div>
              <div>
                <label htmlFor="teamSize" className={labelClass}>Team Size</label>
                <input type="text" name="teamSize" id="teamSize" value={formData.teamSize} onChange={handleChange} className={inputClass} placeholder="e.g. 1-4 Members" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="skills" className={labelClass}>Skills / Tags <span className="text-slate-400 font-normal">(comma separated)</span></label>
                <input type="text" name="skills" id="skills" value={formData.skills} onChange={handleChange} className={inputClass} placeholder="e.g. React, Python, Web3" />
              </div>
            </div>
          </div>

          {/* Links & Media */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-5 pb-3 border-b border-slate-100">Links & Media</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="officialUrl" className={labelClass}>Official Website URL <span className="text-red-400">*</span></label>
                <input type="url" name="officialUrl" id="officialUrl" required value={formData.officialUrl} onChange={handleChange} className={inputClass} placeholder="https://..." />
              </div>
              <div>
                <label className={labelClass}>Banner Image</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-sky-300 transition-colors cursor-pointer" onClick={() => document.getElementById('imageFile')?.click()}>
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">
                    {imageFile ? (
                      <span className="text-sky-600 font-medium">{imageFile.name}</span>
                    ) : (
                      <>Click to upload an image <span className="text-slate-400">(max 5MB)</span></>
                    )}
                  </p>
                  <input type="file" id="imageFile" accept="image/*" onChange={handleFileChange} className="hidden" />
                </div>
              </div>
              {!imageFile && (
                <div>
                  <label htmlFor="imageUrl" className={labelClass}>Or paste an Image URL</label>
                  <input type="url" name="imageUrl" id="imageUrl" value={formData.imageUrl} onChange={handleChange} className={inputClass} placeholder="https://.../image.png" />
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-2">
            <Link to="/opportunities" className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm inline-flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit for Review</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}