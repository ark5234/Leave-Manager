'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Camera, Check, UserCircle, Mail, User, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, photoURL, displayName, updateUserProfile } = useAuth();

  const [customName, setCustomName] = useState('');
  const [customPhoto, setCustomPhoto] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  // Initialise fields once profile loads
  useEffect(() => {
    if (profile) {
      setCustomName(profile.customDisplayName || '');
      setCustomPhoto(profile.customPhotoURL || '');
      setPhotoPreview(profile.customPhotoURL || '');
    }
  }, [profile]);

  // Live preview as user types a photo URL
  useEffect(() => {
    const trimmed = customPhoto.trim();
    setPhotoError(false);
    const timer = setTimeout(() => {
      setPhotoPreview(trimmed);
    }, 600);
    return () => clearTimeout(timer);
  }, [customPhoto]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-gray-400">Loading...</div>;
  }

  if (!user) {
    router.replace('/');
    return null;
  }

  const effectivePhoto = photoPreview || user.photoURL || '';
  const effectiveName = customName.trim() || user.displayName || user.email || '';

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await updateUserProfile({
      customDisplayName: customName.trim(),
      customPhotoURL: customPhoto.trim(),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleResetPhoto = () => {
    setCustomPhoto('');
    setPhotoPreview('');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 sm:p-8 text-slate-800 dark:text-slate-200">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Back nav */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Calendar
        </button>

        {/* Profile card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">

          {/* Cover strip */}
          <div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-600" />

          {/* Avatar area */}
          <div className="px-6 pb-6">
            <div className="relative -mt-12 mb-4 flex items-end justify-between">
              <div className="relative">
                {effectivePhoto && !photoError ? (
                  <img
                    src={effectivePhoto}
                    alt="Profile"
                    className="w-24 h-24 rounded-full ring-4 ring-white dark:ring-slate-800 object-cover shadow-lg"
                    onError={() => setPhotoError(true)}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full ring-4 ring-white dark:ring-slate-800 bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shadow-lg">
                    <UserCircle className="w-14 h-14 text-indigo-400" />
                  </div>
                )}
                <div className="absolute bottom-0 right-0 bg-indigo-600 p-1.5 rounded-full border-2 border-white dark:border-slate-800">
                  <Camera className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="text-right mb-2">
                <div className="text-xs text-gray-400 dark:text-slate-500">
                  {profile?.customPhotoURL ? 'Custom photo' : 'Google photo'}
                </div>
              </div>
            </div>

            {/* Display info */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{effectiveName}</h2>
              <div className="flex items-center gap-1.5 mt-1 text-gray-500 dark:text-slate-400 text-sm">
                <Mail className="w-3.5 h-3.5" />
                {user.email}
              </div>
            </div>

            {/* Info badges */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <InfoBadge icon={<User className="w-4 h-4" />} label="Name" value={user.displayName || '—'} sublabel="Google account" />
              <InfoBadge icon={<Mail className="w-4 h-4" />} label="Email" value={user.email || '—'} sublabel="Cannot be changed" />
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 dark:border-slate-700 mb-6" />

            {/* Edit form */}
            <div className="space-y-5">
              <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wide">Customize Profile</h3>

              {/* Display name override */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Display Name <span className="text-gray-400 font-normal">(overrides Google name)</span>
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={user.displayName || 'Enter your name'}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {customName.trim() && (
                  <p className="text-xs text-gray-400 mt-1">Will display as: <span className="font-medium text-slate-600 dark:text-slate-300">{customName.trim()}</span></p>
                )}
              </div>

              {/* Custom photo URL */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Profile Photo URL <span className="text-gray-400 font-normal">(paste any image link)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customPhoto}
                    onChange={(e) => setCustomPhoto(e.target.value)}
                    placeholder="https://example.com/your-photo.jpg"
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {customPhoto && (
                    <button
                      onClick={handleResetPhoto}
                      className="px-3 py-2 text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 whitespace-nowrap"
                    >
                      Use Google photo
                    </button>
                  )}
                </div>
                {photoError && photoPreview && (
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-red-500">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Could not load this image — check the URL
                  </div>
                )}
                {!photoError && photoPreview && photoPreview !== user?.photoURL && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ✓ Preview looks good (shown above in the avatar)
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1.5">
                  Tip: Right-click any image online → &ldquo;Copy image address&rdquo; and paste it here
                </p>
              </div>

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className={clsx(
                  "w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all",
                  saved
                    ? "bg-green-600 text-white"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white",
                  saving && "opacity-60 cursor-not-allowed"
                )}
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : saved ? (
                  <>
                    <Check className="w-4 h-4" />
                    Saved!
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Info note */}
        <p className="text-xs text-center text-gray-400 dark:text-slate-500">
          Changes are saved to your account and reflected across all devices.
        </p>
      </div>
    </div>
  );
}

function InfoBadge({ icon, label, value, sublabel }: { icon: React.ReactNode; label: string; value: string; sublabel: string }) {
  return (
    <div className="bg-gray-50 dark:bg-slate-700/60 rounded-lg p-3 border border-gray-100 dark:border-slate-700">
      <div className="flex items-center gap-1.5 text-gray-400 dark:text-slate-400 text-xs mb-1">
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate" title={value}>{value}</div>
      <div className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{sublabel}</div>
    </div>
  );
}
