"use client";

import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, isSameMonth, isSameDay, addMonths } from 'date-fns';
import { calculateAttendance, getStats, DayInfo, UserRecord } from '@/lib/attendance';
import { readRecords, upsertRecord, deleteRecord, clearAll } from '@/lib/localStore';
import { Calendar as CalendarIcon, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import clsx from 'clsx';

export default function Home() {
  const [startDate, setStartDate] = useState(new Date().getFullYear() + '-01-01');
  const [endDate, setEndDate] = useState(new Date().getFullYear() + '-12-31');
  const [records, setRecords] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (!startDate || !endDate) return [];
    return calculateAttendance(new Date(startDate), new Date(endDate), records);
  }, [startDate, endDate, records]);

  const stats = useMemo(() => getStats(timeline), [timeline]);

    const handleDayClick = async (day: DayInfo) => {
    // Prevent accidentally clicking loading/invalid days
    if (!startDate || !endDate) return;

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
    const start = new Date(startDate);
    const end = new Date(endDate);
    const monthStarts = [];
    let current = startOfMonth(start);
    while (current <= end) {
      monthStarts.push(current);
      current = addMonths(current, 1);
    }
    return monthStarts;
  }, [startDate, endDate, timeline]);

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-slate-800">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <CalendarIcon className="w-6 h-6 text-indigo-600" />
                    Leave Manager
                </h1>
                <p className="text-gray-500 text-sm mt-1">Plan your internship attendance wisely. (Sandwich rules active)</p>
            </div>
            
            <div className="flex gap-4 items-center bg-gray-50 p-2 rounded-lg border">
                <div className="flex flex-col">
                    <label className="text-xs text-gray-500 font-semibold uppercase">Start Date</label>
                    <input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)} 
                        className="bg-transparent text-sm font-medium focus:outline-none"
                        title="Select start date"
                    />
                </div>
                <div className="w-px h-8 bg-gray-300"></div>
                <div className="flex flex-col">
                    <label className="text-xs text-gray-500 font-semibold uppercase">End Date</label>
                    <input 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)} 
                        className="bg-transparent text-sm font-medium focus:outline-none"
                        title="Select end date"
                    />
                </div>
                <div className="w-px h-8 bg-gray-300"></div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="text-xs px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                        onClick={async () => {
                            const ok = typeof window !== 'undefined' && confirm('Reset all saved leaves? This will clear LocalStorage and cannot be undone.');
                            if (!ok) return;
                            await clearAll();
                            setRecords([]);
                        }}
                    >
                        Reset Leaves
                    </button>
                </div>
                
            </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatsCard 
                label="Attendance Score" 
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
        <div className="flex flex-wrap gap-4 text-sm bg-white p-4 rounded-lg border border-gray-100">
            <LegendItem color="bg-green-100 border-green-300 text-green-700" label="Present (Work)" />
            <LegendItem color="bg-red-100 border-red-300 text-red-700" label="Full Leave" />
            <LegendItem color="bg-orange-100 border-orange-300 text-orange-700" label="Half Leave" />
            <LegendItem color="bg-red-200 border-red-400 text-red-800" label="Sandwich Leave (Penalty)" />
            <LegendItem color="bg-gray-100 border-gray-300 text-gray-500" label="Off (Weekend/Holiday)" />
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
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className={`flex justify-between items-start ${color}`}>
                <div className="font-semibold">{label}</div>
                {icon}
            </div>
            <div className="mt-4">
                <div className="text-3xl font-bold text-gray-900">{value}</div>
                <div className="text-xs text-gray-500 mt-1">{subtext}</div>
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
            <span>{label}</span>
        </div>
    )
}

function MonthGrid({ monthStart, timeline, onDayClick }: { monthStart: Date, timeline: DayInfo[], onDayClick: (d: DayInfo) => void }) {
    const monthDays = timeline.filter(d => isSameMonth(d.date, monthStart));
    const startOffset = monthStart.getDay(); // 0 is Sunday
    const blanks = Array(startOffset).fill(null);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-semibold text-center border-t-4 border-t-indigo-500 flex justify-between items-center">
                <span>{format(monthStart, 'MMMM yyyy')}</span>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-gray-400 py-2 border-b bg-gray-50">
                <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
            </div>
            <div className="grid grid-cols-7 p-2 gap-1 bg-white">
                {blanks.map((_, i) => <div key={`blank-${i}`} />)}
                {monthDays.map((day) => (
                    <DayCell key={day.date.toISOString()} day={day} onClick={() => onDayClick(day)} />
                ))}
            </div>
        </div>
    )
}

function DayCell({ day, onClick }: { day: DayInfo, onClick: () => void }) {
    let bg = 'bg-white hover:bg-gray-50';
    const border = 'border-transparent';

    if (day.status === 'OFF') {
        bg = 'bg-gray-100 text-gray-400';
        if (day.holidayName) {
            bg = 'bg-purple-100 text-purple-600 font-medium border-purple-200';
        }
    } else if (day.status === 'LEAVE_FULL') {
        bg = 'bg-red-100 text-red-700 border-red-200 shadow-sm';
    } else if (day.status === 'LEAVE_HALF') {
        bg = 'bg-orange-100 text-orange-700 border-orange-200 shadow-sm';
    } else if (day.status === 'SANDWICH_LEAVE') {
        bg = 'bg-red-200 text-red-800 border-red-300 ring-1 ring-red-400';
    } else if (day.status === 'PRESENT') {
        bg = 'bg-green-50 text-green-700 border-green-200';
    }

    return (
        <button 
            onClick={onClick}
            className={clsx(
                "h-14 rounded-lg flex flex-col items-center justify-center text-sm border transition-all relative group focus:outline-none focus:ring-2 focus:ring-indigo-500",
                bg,
                border
            )}
            title={day.holidayName || (day.isSandwich ? "Sandwich Leave Rule Applied" : day.status)}
        >
            <span className="font-semibold">{day.date.getDate()}</span>
            {day.leaveAmount > 0 && !(day.isSandwich) && <span className="text-[10px] opacity-75">-{day.leaveAmount}</span>}
            {day.isSandwich && <span className="text-[8px] font-bold">SANDWICH</span>}
            {day.holidayName && (
                <span className="absolute bottom-0 w-full text-[8px] truncate px-1 text-center font-bold pb-1">
                    {day.holidayName.substring(0,6)}..
                </span>
            )}
        </button>
    )
}
