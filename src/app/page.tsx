"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, parseISO } from 'date-fns';
import { calculateAttendance, getStats, DayInfo, UserRecord } from '@/lib/attendance';
import {
  readRecords,
  upsertRecord,
  deleteRecord,
  clearAll,
  getAllUserProfiles,
  UserProfile,
  getInternshipDates,
  saveInternshipDates,
  readNotes,
  saveNote,
} from '@/lib/firebaseStore';
import { useAuth } from '@/context/AuthContext';
import { Calendar as CalendarIcon, AlertCircle, CheckCircle, XCircle, Clock, Moon, Sun, LogOut, ShieldCheck, UserCircle, StickyNote, PenLine } from 'lucide-react';
import clsx from 'clsx';

function LoginScreen({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 gap-6 p-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-10 flex flex-col items-center gap-5 max-w-sm w-full border border-gray-100 dark:border-slate-700">
        <CalendarIcon className="w-12 h-12 text-indigo-600" />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Leave Manager</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Internship attendance tracker with sandwich leave rules</p>
        </div>
        <button
          onClick={onSignIn}
          className="flex items-center gap-3 w-full justify-center px-5 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600 shadow-sm transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.9 2.5 30.3 0 24 0 14.8 0 6.9 5.4 3 13.3l7.8 6C12.7 13.2 17.9 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/>
            <path fill="#FBBC05" d="M10.8 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7L2.5 13.3A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.5 10.7l8.3-6z"/>
            <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.6l-7.5-5.8c-2.1 1.4-4.8 2.3-8 2.3-6.1 0-11.3-3.7-13.2-9l-7.8 6C6.9 42.6 14.8 48 24 48z"/>
          </svg>
          Sign in with Google
        </button>
        <p className="text-xs text-gray-400 text-center">Your leave records are saved to your account and accessible from any device.</p>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, loading: authLoading, isAdmin, photoURL, displayName, signInWithGoogle, logout } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [records, setRecords] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  // Initialise dark mode synchronously from localStorage — avoids calling
  // setState inside an effect and prevents the flash-of-wrong-theme.
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('lm:theme') === 'dark';
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previewCount, setPreviewCount] = useState(1);
  const [viewAdminUid, setViewAdminUid] = useState<string | null>(null);
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [noteModal, setNoteModal] = useState<{ dateKey: string; note: string } | null>(null);
  // Tracks whether we've finished loading dates from Firestore.
  // Auto-save is blocked until this is true to prevent overwriting
  // loaded values with empty strings during the initial render.
  const datesLoaded = useRef(false);

  const activeUid = viewAdminUid ?? user?.uid ?? null;
  const isViewingOtherUser = isAdmin && viewAdminUid !== null && viewAdminUid !== user?.uid;

  // Apply dark class whenever `dark` changes (no setState here — read-only DOM write).
  useEffect(() => {
    document.documentElement.className = dark ? 'dark' : '';
  }, [dark]);

  // Load records + internship dates.
  // Dependency is on user.uid and viewAdminUid so we re-fetch when admin switches user.
  useEffect(() => {
    if (!user) return; // LoginScreen shown above — no setState needed here
    const uid = user.uid;
    // Reset so auto-save won't fire until this load completes
    datesLoaded.current = false;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [fetched, dates, fetchedNotes] = await Promise.all([
          readRecords(activeUid ?? uid),
          // Only load own dates, not when admin is viewing another user
          !isViewingOtherUser ? getInternshipDates(uid) : Promise.resolve({ internshipStart: '', internshipEnd: '' }),
          readNotes(activeUid ?? uid),
        ]);
        if (mounted) {
          setRecords(fetched);
          setNotes(fetchedNotes);
          if (!isViewingOtherUser) {
            // Set BOTH dates together before unblocking auto-save
            setStartDate(dates.internshipStart ?? '');
            setEndDate(dates.internshipEnd ?? '');
          }
          // Only allow auto-save after the load is fully done
          datesLoaded.current = true;
        }
      } catch (err) {
        console.error('Failed to load data from Firestore:', err);
        datesLoaded.current = true; // unblock even on error
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.uid, viewAdminUid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save internship dates to Firestore whenever they change.
  // datesLoaded.current guards against overwriting Firestore with empty strings
  // before the initial load has completed.
  useEffect(() => {
    if (!user || isViewingOtherUser || !datesLoaded.current) return;
    if (!startDate && !endDate) return;
    const t = setTimeout(() => {
      saveInternshipDates(user.uid, {
        internshipStart: startDate,
        internshipEnd: endDate,
      });
    }, 800);
    return () => clearTimeout(t);
  }, [startDate, endDate, user, isViewingOtherUser]);

  useEffect(() => {
    if (!isAdmin) return;
    getAllUserProfiles().then(setAdminUsers);
  }, [isAdmin]);

  const timeline = useMemo(() => {
    let visibleStart: Date;
    let visibleEnd: Date;
    if (startDate && endDate) {
      visibleStart = new Date(startDate);
      visibleEnd = new Date(endDate);
    } else {
      const now = new Date();
      visibleStart = new Date(now.getFullYear(), 0, 1);
      visibleEnd = new Date(now.getFullYear(), 11, 31);
    }
    return calculateAttendance(visibleStart, visibleEnd, records);
  }, [startDate, endDate, records]);

    const stats = useMemo(() => getStats(timeline), [timeline]);

  const preview = useMemo(() => {
    const add = previewCount;
    const newWorking = stats.workingDays + add;
    const newPercentage = newWorking === 0 ? 100 : (stats.presentDays / newWorking) * 100;
    const newBufferRaw = (stats.presentDays / 0.8) - newWorking;
    const newBuffer = newBufferRaw < 0 ? 0 : Math.round(newBufferRaw * 100) / 100;
    return { newPercentage: newPercentage.toFixed(2), newBuffer };
  }, [stats, previewCount]);

  const handleNoteClick = (day: DayInfo) => {
    if (isViewingOtherUser || !user) return;
    const dateKey = format(day.date, 'yyyy-MM-dd');
    setNoteModal({ dateKey, note: notes[dateKey] ?? '' });
  };

  const handleNoteSave = async (dateKey: string, note: string) => {
    if (!user) return;
    // Update local state immediately so UI reflects the change
    setNotes(prev => {
      const next = { ...prev };
      if (!note.trim()) delete next[dateKey];
      else next[dateKey] = note.trim();
      return next;
    });
    // Persist to Firestore; log but don't crash if it fails
    try {
      await saveNote(user.uid, dateKey, note);
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  };

  const handleDayClick = async (day: DayInfo) => {
    if (isViewingOtherUser || !user) return;
    type NewStatus = UserRecord['status'] | 'DELETE';
    let newStatus: NewStatus = 'LEAVE_FULL';
    if (day.originalStatus === 'LEAVE_FULL') newStatus = 'LEAVE_HALF_MORNING';
    else if (day.originalStatus === 'LEAVE_HALF_MORNING') newStatus = 'LEAVE_HALF_AFTERNOON';
    else if (day.originalStatus === 'LEAVE_HALF_AFTERNOON') newStatus = 'DELETE';
    else if (day.originalStatus === 'PRESENT') newStatus = 'LEAVE_FULL';
    else if (day.status === 'OFF' || day.status === 'SANDWICH_LEAVE') newStatus = 'PRESENT';
    else newStatus = 'LEAVE_FULL';

    if (newStatus === 'DELETE') {
      await deleteRecord(user.uid, day.date);
      setRecords(prev => prev.filter(r => !isSameDay(new Date(r.date), day.date)));
    } else {
      const toSave: UserRecord = { date: day.date.toISOString(), status: newStatus };
      const result = await upsertRecord(user.uid, toSave);
      setRecords(prev => {
        const exists = prev.find(r => isSameDay(new Date(r.date), new Date(result.date)));
        if (exists) return prev.map(r => isSameDay(new Date(r.date), new Date(result.date)) ? result : r);
        return [...prev, result];
      });
    }
  };

  const months = useMemo(() => {
    if (timeline.length === 0) return [];
    let visibleStart: Date;
    let visibleEnd: Date;
    if (startDate && endDate) {
      visibleStart = new Date(startDate);
      visibleEnd = new Date(endDate);
    } else {
      const now = new Date();
      visibleStart = new Date(now.getFullYear(), 0, 1);
      visibleEnd = new Date(now.getFullYear(), 11, 31);
    }
    const monthStarts = [];
    let current = startOfMonth(visibleStart);
    while (current <= visibleEnd) { monthStarts.push(current); current = addMonths(current, 1); }
    return monthStarts;
  }, [startDate, endDate, timeline]);

  if (authLoading) return <div className="flex h-screen items-center justify-center text-gray-400">Loading...</div>;
  if (!user) return <LoginScreen onSignIn={signInWithGoogle} />;
  if (loading) return <div className="flex h-screen items-center justify-center text-gray-400">Loading records...</div>;

  return (
    <>
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 sm:p-8 text-slate-800 dark:text-slate-200">
      <div className="max-w-7xl mx-auto space-y-6">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-indigo-600" />
              Leave Manager
            </h1>
            <p className="text-gray-500 dark:text-slate-300 text-sm mt-1">Plan your internship attendance wisely. (Sandwich rules active)</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <div className="flex items-center justify-between gap-1 sm:gap-3 bg-gray-50 dark:bg-slate-700 p-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm flex-1 sm:flex-none">
              <div className="flex items-center gap-1 sm:gap-2 px-1 sm:px-2 flex-1">
                <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                <div className="flex flex-col w-full">
                  <label className="text-[9px] sm:text-[10px] text-gray-500 dark:text-slate-300 font-semibold uppercase">Start</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-xs sm:text-sm font-medium focus:outline-none text-slate-800 dark:text-slate-100 w-full" title="Select start date" />
                </div>
              </div>
              <div className="w-px h-8 bg-gray-200 dark:bg-slate-600 mx-1 sm:mx-2" />
              <div className="flex items-center gap-1 sm:gap-2 px-1 sm:px-2 flex-1">
                <div className="flex flex-col w-full">
                  <label className="text-[9px] sm:text-[10px] text-gray-500 dark:text-slate-300 font-semibold uppercase">End</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-xs sm:text-sm font-medium focus:outline-none text-slate-800 dark:text-slate-100 w-full" title="Select end date" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-start gap-2">
              {!isViewingOtherUser && (
                <button type="button" className="text-xs px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex-1 sm:flex-none whitespace-nowrap"
                  onClick={async () => {
                    const ok = confirm('Reset all saved leaves? This cannot be undone.');
                    if (!ok) return;
                    await clearAll(user.uid);
                    setRecords([]);
                  }}>
                  Reset Leaves
                </button>
              )}
              <button type="button"
                onClick={() => {
                  const next = !dark;
                  setDark(next);
                  document.documentElement.className = next ? 'dark' : '';
                  if (typeof window !== 'undefined') window.localStorage.setItem('lm:theme', next ? 'dark' : 'light');
                }}
                className={clsx("p-2 rounded-md border", dark ? 'bg-slate-700 text-slate-200 border-slate-600' : 'bg-gray-100 text-slate-700 border-gray-200')}
                title="Toggle theme" aria-label="Toggle dark mode">
                {dark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>
              <div className="flex items-center gap-2">
                <a href="/profile" title="View profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  {photoURL ? (
                    <img src={photoURL} alt="avatar" className="w-8 h-8 rounded-full ring-2 ring-indigo-400 object-cover" />
                  ) : (
                    <UserCircle className="w-8 h-8 text-indigo-400" />
                  )}
                  <span className="text-xs text-gray-500 dark:text-slate-400 hidden sm:block max-w-[120px] truncate">{displayName}</span>
                </a>
                <button onClick={logout} title="Sign out" className="p-2 rounded-md border bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 border-gray-200 dark:border-slate-600" aria-label="Sign out">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-amber-50 dark:bg-amber-900/20 p-3 sm:p-4 rounded-xl border border-amber-200 dark:border-amber-700">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4" />
              Admin View
            </div>
            <select
              aria-label="Select user to view"
              title="Select user to view"
              value={viewAdminUid ?? user.uid} onChange={(e) => setViewAdminUid(e.target.value === user.uid ? null : e.target.value)}
              className="border rounded px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-amber-300 dark:border-amber-600">
              <option value={user.uid}>Your own records</option>
              {adminUsers.filter(u => u.uid !== user.uid).map(u => (
                <option key={u.uid} value={u.uid}>{u.displayName || u.email} ({u.email})</option>
              ))}
            </select>
            {isViewingOtherUser && <span className="text-xs text-amber-600 dark:text-amber-400 italic">Read-only — clicks disabled</span>}
            <button onClick={() => getAllUserProfiles().then(setAdminUsers)}
              className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-200 rounded border border-amber-300 dark:border-amber-600 hover:bg-amber-200 dark:hover:bg-amber-700">
              Refresh users
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard label="Attendance" value={`${stats.percentage}%`} subtext={parseFloat(stats.percentage) >= 80 ? "You are safe (Target: 80%)" : "Warning: Below limit!"} color={parseFloat(stats.percentage) >= 80 ? "text-green-600" : "text-red-600"} icon={<CheckCircle className="w-5 h-5" />} />
          <StatsCard label="Safe Buffer" value={`${stats.buffer} Days`} subtext="Leaves remaining before <80%" color="text-indigo-600" icon={<AlertCircle className="w-5 h-5" />} />
          <StatsCard label="Total Leaves" value={stats.leaves} subtext="Includes Half & Sandwich" color="text-amber-600" icon={<XCircle className="w-5 h-5" />} />
          <StatsCard label="Working Days" value={stats.workingDays} subtext={`Out of ${timeline.length} total`} color="text-slate-600" icon={<Clock className="w-5 h-5" />} />
        </div>

        <div className="mt-3 flex items-start gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="preview-select" className="text-sm font-medium">Simulate additional leaves:</label>
            <select id="preview-select" aria-label="Simulate additional leaves" title="Select number of additional leave days to simulate" value={previewCount} onChange={(e) => setPreviewCount(Number(e.target.value))} className="border rounded px-2 py-1">
              <option value={0.5}>+0.5 day</option>
              <option value={1}>+1 day</option>
              <option value={2}>+2 days</option>
              <option value={3}>+3 days</option>
              <option value={5}>+5 days</option>
            </select>
            <button onClick={() => setShowPreview(s => !s)} className="ml-2 px-3 py-1 bg-indigo-600 text-white rounded">What if?</button>
          </div>
          {showPreview && (
            <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
              <div className="text-sm">Projected Attendance: <span className="font-bold">{preview.newPercentage}%</span></div>
              <div className="text-sm">Projected Safe Buffer: <span className="font-bold">{preview.newBuffer} Days</span></div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-4 text-sm bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-100 dark:border-slate-700">
          <LegendItem color="bg-green-100 border-green-300 text-green-700 dark:bg-green-900 dark:text-green-300" label="Present (Work)" />
          <LegendItem color="bg-red-100 border-red-300 text-red-700 dark:bg-red-900 dark:text-red-300" label="Full Leave" />
          <LegendItem color="bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-900 dark:text-orange-300" label="Half Leave" />
          <LegendItem color="bg-red-200 border-red-400 text-red-800 dark:bg-red-800 dark:text-red-200" label="Sandwich Leave (Penalty)" />
          <LegendItem color="bg-gray-100 border-gray-300 text-gray-500 dark:bg-slate-700 dark:text-slate-300" label="Off (Weekend)" />
          <LegendItem color="bg-purple-100 border-purple-300 text-purple-600 dark:bg-purple-900 dark:text-purple-300" label="Holiday" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {months.map(monthStart => (
            <MonthGrid key={monthStart.toISOString()} monthStart={monthStart} timeline={timeline} onDayClick={handleDayClick} onNoteClick={handleNoteClick} notes={notes} readonly={isViewingOtherUser} />
          ))}
        </div>

        <footer className="text-center text-sm text-gray-500 dark:text-slate-400 py-6 mt-8 border-t border-gray-200 dark:border-slate-700">
          Made by Vikrant Kawadkar
        </footer>
      </div>
    </div>

    {noteModal && (
      <NoteModal
        dateKey={noteModal.dateKey}
        initialNote={noteModal.note}
        onSave={handleNoteSave}
        onClose={() => setNoteModal(null)}
      />
    )}
    </>
  );
}

type StatsCardProps = { label: string; value: string | number; subtext: string; color: string; icon: React.ReactNode };
function StatsCard({ label, value, subtext, color, icon }: StatsCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 p-3 sm:p-5 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col justify-between h-full">
      <div className={`flex justify-between items-start ${color}`}>
        <div className="font-semibold text-xs sm:text-base">{label}</div>
        <div className="scale-75 sm:scale-100 origin-top-right">{icon}</div>
      </div>
      <div className="mt-2 sm:mt-4">
        <div className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100">{value}</div>
        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-300 mt-1 leading-tight">{subtext}</div>
      </div>
    </div>
  );
}

type LegendItemProps = { color: string; label: string };
function LegendItem({ color, label }: LegendItemProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded ${color} border`} />
      <span className="dark:text-slate-200">{label}</span>
    </div>
  );
}

function MonthGrid({ monthStart, timeline, onDayClick, onNoteClick, notes, readonly }: { monthStart: Date; timeline: DayInfo[]; onDayClick: (d: DayInfo) => void; onNoteClick: (d: DayInfo) => void; notes: Record<string, string>; readonly?: boolean }) {
  const today = new Date();
  const daysInMonth = eachDayOfInterval({ start: startOfMonth(monthStart), end: endOfMonth(monthStart) });
  const startOffset = startOfMonth(monthStart).getDay();
  const blanks = Array(startOffset).fill(null);
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="bg-gray-50 dark:bg-slate-800 px-4 py-3 border-b border-gray-200 dark:border-slate-700 font-semibold text-center border-t-4 border-t-indigo-500 flex justify-between items-center">
        <span className="text-gray-700 dark:text-slate-200">{format(monthStart, 'MMMM yyyy')}</span>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-gray-400 dark:text-slate-400 py-2 border-b bg-gray-50 dark:bg-slate-800">
        <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
      </div>
      <div className="grid grid-cols-7 p-2 gap-1 bg-white dark:bg-slate-800">
        {blanks.map((_, i) => <div key={`blank-${i}`} />)}
        {daysInMonth.map((date) => {
          const dayInfo = timeline.find(d => isSameDay(d.date, date));
          const isToday = isSameDay(date, today);
          if (dayInfo) return <DayCell key={date.toISOString()} day={dayInfo} isToday={isToday} onClick={() => onDayClick(dayInfo)} onNoteClick={onNoteClick} notes={notes} readonly={readonly} />;
          return (
            <div key={date.toISOString()} className={clsx("h-12 sm:h-14 rounded-lg flex flex-col items-center justify-center text-xs sm:text-sm text-gray-300 dark:text-slate-600 border border-transparent", isToday && "ring-2 ring-indigo-400")}>
              {date.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayCell({ day, onClick, onNoteClick, notes, isToday, readonly }: { day: DayInfo; onClick: () => void; onNoteClick: (d: DayInfo) => void; notes: Record<string, string>; isToday?: boolean; readonly?: boolean }) {
  const dateKey = format(day.date, 'yyyy-MM-dd');
  const noteText = notes[dateKey] ?? '';
  const hasNote = !!noteText;
  let bg = 'bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700';
  if (day.status === 'OFF') {
    bg = day.holidayName
      ? 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 font-medium border-purple-200 dark:border-purple-700'
      : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-300';
  } else if (day.status === 'LEAVE_FULL') {
    bg = 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700 shadow-sm';
  } else if (day.status === 'LEAVE_HALF') {
    bg = 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700 shadow-sm';
  } else if (day.status === 'SANDWICH_LEAVE') {
    bg = 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700 ring-1 ring-red-400';
  } else if (day.status === 'PRESENT') {
    bg = 'bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700';
  }

  const titleText = [
    day.holidayName || (day.isSandwich ? 'Sandwich Leave Rule Applied' : day.status),
    noteText ? `Note: ${noteText}` : '',
  ].filter(Boolean).join(' — ');

  return (
    <div className={clsx('relative group h-12 sm:h-14 rounded-lg border transition-all', bg, isToday && 'ring-2 ring-inset ring-indigo-500')}>
      {/* Main day button — cycles leave status */}
      <button
        onClick={readonly ? undefined : onClick}
        className={clsx('absolute inset-0 flex flex-col items-center justify-center text-xs sm:text-sm focus:outline-none rounded-lg', !readonly && 'focus:ring-2 focus:ring-indigo-500', readonly && 'cursor-default')}
        title={titleText}
      >
        <span className={clsx('font-semibold', isToday && 'underline')}>{day.date.getDate()}</span>
        {day.leaveAmount > 0 && !day.isSandwich && <span className="text-[9px] sm:text-[10px] opacity-75">-{day.leaveAmount}</span>}
        {day.isSandwich && <span className="text-[8px] font-bold">SAND</span>}
        {day.holidayName && <span className="absolute bottom-0 w-full text-[8px] truncate px-1 text-center font-bold pb-1" title={day.holidayName}>{day.holidayName.substring(0, 6)}..</span>}
      </button>

      {/* Note indicator dot */}
      {hasNote && (
        <span className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-indigo-500 rounded-full pointer-events-none" title={noteText} />
      )}

      {/* Pencil button — opens note modal */}
      {!readonly && (
        <button
          onClick={(e) => { e.stopPropagation(); onNoteClick(day); }}
          className="absolute bottom-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/20 focus:outline-none"
          title="Add / edit note"
        >
          <PenLine className="w-2.5 h-2.5 text-slate-400 dark:text-slate-400" />
        </button>
      )}
    </div>
  );
}

// --------------- Note Modal ---------------

function NoteModal({ dateKey, initialNote, onSave, onClose }: {
  dateKey: string;        // YYYY-MM-DD
  initialNote: string;
  onSave: (dateKey: string, note: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(initialNote);
  const displayDate = format(parseISO(dateKey), 'EEEE, MMMM d, yyyy');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { onSave(dateKey, text); onClose(); }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-1">
          <StickyNote className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Day Note</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">{displayDate}</p>

        <textarea
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Doctor appointment, family event, project milestone..."
          className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={4}
        />
        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">Ctrl + Enter to save &nbsp;·&nbsp; Esc to cancel</p>

        <div className="flex gap-2 mt-4 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          {initialNote && (
            <button
              onClick={() => { onSave(dateKey, ''); onClose(); }}
              className="px-4 py-2 text-sm rounded-lg bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
            >
              Delete Note
            </button>
          )}
          <button
            onClick={() => { onSave(dateKey, text); onClose(); }}
            className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}
