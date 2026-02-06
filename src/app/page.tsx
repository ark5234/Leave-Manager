"use client";

import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, isSameMonth, isSameDay, addMonths } from 'date-fns';
import { calculateAttendance, getStats, DayInfo, UserRecord } from '@/lib/attendance';
import { readRecords, upsertRecord, deleteRecord, clearAll } from '@/lib/localStore';
import { Calendar as CalendarIcon, AlertCircle, CheckCircle, XCircle, Clock, Moon, Sun } from 'lucide-react';
import clsx from 'clsx';

export default function Home() {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
  const [records, setRecords] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
    const [dark, setDark] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            // Prefer client-side LocalStorage for persistence (no accounts, public app).
            const local = await readRecords();
            if (mounted) {
                setRecords(local);
                setLoading(false);
            }

            // initialize theme from localStorage
            const saved = typeof window !== 'undefined' && window.localStorage.getItem('lm:theme');
            if (mounted) {
                if (saved === 'dark') {
                    setDark(true);
                    document.documentElement.className = 'dark';
                } else {
                    setDark(false);
                    document.documentElement.className = '';
                }
            }

            // Cloud API fallback (kept commented for future re-enable):
            /*
            const res = await fetch('/api/records');
            const data = await res.json();
            if (mounted) {
                setRecords(data);
                setLoading(false);
            }
            */
        })();
        return () => { mounted = false; };
    }, []);

    const timeline = useMemo(() => {
        // If user selected a range, use it; otherwise show a default 3-month window for browsing
        let visibleStart: Date;
        let visibleEnd: Date;
        if (startDate && endDate) {
            visibleStart = new Date(startDate);
            visibleEnd = new Date(endDate);
        } else {
            const now = new Date();
            // Default: Show the current full year (Jan to Dec of current year)
            visibleStart = new Date(now.getFullYear(), 0, 1);
            visibleEnd = new Date(now.getFullYear(), 11, 31);
        }
        return calculateAttendance(visibleStart, visibleEnd, records);
    }, [startDate, endDate, records]);

  const stats = useMemo(() => getStats(timeline), [timeline]);

    const handleDayClick = async (day: DayInfo) => {

    type NewStatus = UserRecord['status'] | 'DELETE';
    let newStatus: NewStatus = 'LEAVE_FULL';
    
    // Cycle logic based on EXISTING RECORD first
    if (day.originalStatus === 'LEAVE_FULL') newStatus = 'LEAVE_HALF_MORNING';
    else if (day.originalStatus === 'LEAVE_HALF_MORNING') newStatus = 'LEAVE_HALF_AFTERNOON';
    else if (day.originalStatus === 'LEAVE_HALF_AFTERNOON') newStatus = 'DELETE'; // Reset to auto
    else if (day.originalStatus === 'PRESENT') newStatus = 'LEAVE_FULL';
    
    // If no record, decide based on Computed Status
    else if (day.status === 'OFF' || day.status === 'SANDWICH_LEAVE') newStatus = 'PRESENT'; // Override Holiday/Sandwich
    else newStatus = 'LEAVE_FULL'; // Override Work Day

        // Persist to client LocalStorage (preferred for public, no-accounts app)
        if (typeof window !== 'undefined') {
                if (newStatus === 'DELETE') {
                    await deleteRecord(day.date);
                    setRecords(prev => prev.filter(r => !isSameDay(new Date(r.date), day.date)));
                } else {
                const toSave: UserRecord = { date: day.date.toISOString(), status: newStatus };
                const result = await upsertRecord(toSave);
                setRecords(prev => {
                    const exists = prev.find(r => isSameDay(new Date(r.date), new Date(result.date)));
                    if (exists) {
                        return prev.map(r => isSameDay(new Date(r.date), new Date(result.date)) ? result : r);
                    }
                    return [...prev, result];
                });
                }
        } else {
            // Cloud API call preserved and commented so it can be re-enabled in future.
            /*
            const res = await fetch('/api/records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: day.date, status: newStatus })
            });
            if (res.ok) {
                const result = await res.json();
                setRecords(prev => {
                    if (newStatus === 'DELETE') {
                        return prev.filter(r => !isSameDay(new Date(r.date), new Date(day.date)));
                    }
                    const exists = prev.find(r => isSameDay(new Date(r.date), new Date(result.date)));
                    if (exists) {
                        return prev.map(r => isSameDay(new Date(r.date), new Date(result.date)) ? result : r);
                    }
                    return [...prev, result];
                });
            }
            */
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
            // visibleStart = startOfMonth(new Date());
            const now = new Date();
            visibleStart = new Date(now.getFullYear(), 0, 1);
            // show 12 months by default
            visibleEnd = new Date(now.getFullYear(), 11, 31);
        }
    const monthStarts = [];
        let current = startOfMonth(visibleStart);
        while (current <= visibleEnd) {
      monthStarts.push(current);
      current = addMonths(current, 1);
    }
    return monthStarts;
  }, [startDate, endDate, timeline]);

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 sm:p-8 text-slate-800 dark:text-slate-200">
            <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header & Controls */}
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
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent text-xs sm:text-sm font-medium focus:outline-none text-slate-800 dark:text-slate-100 w-full"
                                title="Select start date"
                            />
                        </div>
                    </div>
                    <div className="w-px h-8 bg-gray-200 dark:bg-slate-600 mx-1 sm:mx-2"></div>
                    <div className="flex items-center gap-1 sm:gap-2 px-1 sm:px-2 flex-1">
                        <div className="flex flex-col w-full">
                            <label className="text-[9px] sm:text-[10px] text-gray-500 dark:text-slate-300 font-semibold uppercase">End</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent text-xs sm:text-sm font-medium focus:outline-none text-slate-800 dark:text-slate-100 w-full"
                                title="Select end date"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between sm:justify-start gap-2">
                    <button
                        type="button"
                        className="text-xs px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex-1 sm:flex-none whitespace-nowrap"
                        onClick={async () => {
                            const ok = typeof window !== 'undefined' && confirm('Reset all saved leaves? This will clear LocalStorage and cannot be undone.');
                            if (!ok) return;
                            await clearAll();
                            setRecords([]);
                        }}
                    >
                        Reset Leaves
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            const next = !dark;
                            setDark(next);
                            if (next) {
                                document.documentElement.className = 'dark';
                            } else {
                                document.documentElement.className = '';
                            }
                            if (typeof window !== 'undefined') window.localStorage.setItem('lm:theme', next ? 'dark' : 'light');
                        }}
                        className={clsx(
                            "p-2 rounded-md border",
                            dark
                                ? 'bg-slate-700 text-slate-200 border-slate-600'
                                : 'bg-gray-100 text-slate-700 border-gray-200'
                        )}
                        title="Toggle theme"
                        aria-label="Toggle dark mode"
                    >
                        {dark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                    </button>
                </div>
            </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <StatsCard 
                label="Attendance" 
                value={`${stats.percentage}%`} 
                subtext={parseFloat(stats.percentage) >= 80 ? "You are safe (Target: 80%)" : "Warning: Below limit!"}
                color={parseFloat(stats.percentage) >= 80 ? "text-green-600" : "text-red-600"}
                icon={<CheckCircle className="w-5 h-5" />}
            />
            <StatsCard 
                label="Safe Buffer" 
                value={`${stats.buffer} Days`} 
                subtext="Leaves remaining before <80%"
                color="text-indigo-600"
                icon={<AlertCircle className="w-5 h-5" />}
            />
            <StatsCard 
                label="Total Leaves" 
                value={stats.leaves} 
                subtext="Includes Half & Sandwich"
                color="text-amber-600"
                icon={<XCircle className="w-5 h-5" />}
            />
            <StatsCard 
                label="Working Days" 
                value={stats.workingDays} 
                subtext={`Out of ${timeline.length} total`}
                color="text-slate-600"
                icon={<Clock className="w-5 h-5" />}
            />
        </div>

        {/* Legends */}
        <div className="flex flex-wrap gap-4 text-sm bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-100 dark:border-slate-700">
            <LegendItem color="bg-green-100 border-green-300 text-green-700 dark:bg-green-900 dark:text-green-300" label="Present (Work)" />
            <LegendItem color="bg-red-100 border-red-300 text-red-700 dark:bg-red-900 dark:text-red-300" label="Full Leave" />
            <LegendItem color="bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-900 dark:text-orange-300" label="Half Leave" />
            <LegendItem color="bg-red-200 border-red-400 text-red-800 dark:bg-red-800 dark:text-red-200" label="Sandwich Leave (Penalty)" />
            <LegendItem color="bg-gray-100 border-gray-300 text-gray-500 dark:bg-slate-700 dark:text-slate-300" label="Off (Weekend/Holiday)" />
        </div>

        {/* Calendar View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {months.map(monthStart => (
                <MonthGrid 
                    key={monthStart.toISOString()} 
                    monthStart={monthStart} 
                    timeline={timeline}
                    onDayClick={handleDayClick}
                />
            ))}
        </div>

        <footer className="text-center text-sm text-gray-500 dark:text-slate-400 py-6 mt-8 border-t border-gray-200 dark:border-slate-700">
            Made by Vikrant Kawadkar
        </footer>
      </div>
    </div>
  );
}

type StatsCardProps = {
    label: string;
    value: string | number;
    subtext: string;
    color: string;
    icon: React.ReactNode;
};
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
    )
}

type LegendItemProps = {
    color: string;
    label: string;
};
function LegendItem({ color, label }: LegendItemProps) {
    return (
        <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${color} border`}></div>
            <span className="dark:text-slate-200">{label}</span>
        </div>
    )
}

function MonthGrid({ monthStart, timeline, onDayClick }: { monthStart: Date, timeline: DayInfo[], onDayClick: (d: DayInfo) => void }) {
    const monthDays = timeline.filter(d => isSameMonth(d.date, monthStart));
    const startOffset = monthStart.getDay(); // 0 is Sunday
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
                {monthDays.map((day) => (
                    <DayCell key={day.date.toISOString()} day={day} onClick={() => onDayClick(day)} />
                ))}
            </div>
        </div>
    )
}

function DayCell({ day, onClick }: { day: DayInfo, onClick: () => void }) {
    let bg = 'bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700';
    const border = 'border-transparent';

    if (day.status === 'OFF') {
        bg = 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-300';
        if (day.holidayName) {
            bg = 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 font-medium border-purple-200 dark:border-purple-700';
        }
    } else if (day.status === 'LEAVE_FULL') {
        bg = 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700 shadow-sm';
    } else if (day.status === 'LEAVE_HALF') {
        bg = 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700 shadow-sm';
    } else if (day.status === 'SANDWICH_LEAVE') {
        bg = 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700 ring-1 ring-red-400';
    } else if (day.status === 'PRESENT') {
        bg = 'bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700';
    }

    return (
        <button 
            onClick={onClick}
            className={clsx(
                "h-12 sm:h-14 rounded-lg flex flex-col items-center justify-center text-xs sm:text-sm border transition-all relative group focus:outline-none focus:ring-2 focus:ring-indigo-500",
                bg,
                border
            )}
            title={day.holidayName || (day.isSandwich ? "Sandwich Leave Rule Applied" : day.status)}
        >
            <span className="font-semibold">{day.date.getDate()}</span>
            {day.leaveAmount > 0 && !(day.isSandwich) && <span className="text-[9px] sm:text-[10px] opacity-75">-{day.leaveAmount}</span>}
            {day.isSandwich && <span className="text-[8px] font-bold">SANDWICH</span>}
            {day.holidayName && (
                <span className="absolute bottom-0 w-full text-[8px] truncate px-1 text-center font-bold pb-1">
                    {day.holidayName.substring(0,6)}..
                </span>
            )}
        </button>
    )
}
