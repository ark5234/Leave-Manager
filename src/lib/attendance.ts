import { eachDayOfInterval, isSameDay, getDay, parseISO } from 'date-fns';

export type UserRecord = {
  date: Date | string;
  status: 'PRESENT' | 'LEAVE_FULL' | 'LEAVE_HALF_MORNING' | 'LEAVE_HALF_AFTERNOON';
};

export type DayInfo = {
  date: Date;
  status: 'WORK' | 'OFF' | 'LEAVE_FULL' | 'LEAVE_HALF' | 'SANDWICH_LEAVE' | 'PRESENT';
  isWeekend: boolean;
  isHoliday: boolean;
  isSandwich: boolean;
  leaveAmount: number; // 0, 0.5, 1
  holidayName?: string;
  originalStatus?: string;
};

// Mock Gujarat/National Holidays for 2026 (and late 2025)
export const HOLIDAYS = [
  { date: '2026-01-14', name: 'Makar Sankranti' },
  { date: '2026-01-26', name: 'Republic Day' },
  { date: '2026-03-04', name: 'Holi (Dhuleti)' },
  { date: '2026-03-19', name: 'Chetichand' },
  { date: '2026-03-21', name: 'Ramjan-Eid (Eid-Ul-Fitra)' },
  { date: '2026-03-26', name: 'Shree Ram Navmi' },
  { date: '2026-03-31', name: 'Mahavir Janma Kalyanak' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-04-14', name: "Dr. Baba Saheb Ambedkar's Birthday" },
  { date: '2026-05-27', name: 'Eid-Ul-Adha (Bakri-Eid)' },
  { date: '2026-06-26', name: 'Muharram (Ashoora)' },
  { date: '2026-08-15', name: 'Independence Day / Parsi New Year (Pateti)' },
  { date: '2026-08-26', name: "Eid-e-Miladunnabi (Prophet's Birthday)" },
  { date: '2026-08-28', name: 'Raksha Bandhan' },
  { date: '2026-09-04', name: 'Janmashtami' },
  { date: '2026-09-15', name: 'Samvatsari (Chaturthi Paksha)' },
  { date: '2026-10-02', name: "Mahatma Gandhi's Birthday" },
  { date: '2026-10-20', name: 'Dusshera (Vijaya Dashmi)' },
  { date: '2026-10-31', name: "Sardar Vallabhbhai Patel's Birthday" },
  { date: '2026-11-10', name: 'Vikram Samvant New Year Day' },
  { date: '2026-11-11', name: 'Bhai Bij' },
  { date: '2026-11-24', name: "Guru Nanak's Birthday" },
  { date: '2026-12-25', name: 'Christmas' },
];

function isSecondOrFourthSaturday(date: Date): boolean {
  const day = getDay(date);
  if (day !== 6) return false; // Not Saturday
  
  // Check strict 2nd or 4th saturday of the month
  const dayOfMonth = date.getDate();
  const weekNum = Math.ceil(dayOfMonth / 7);
  return weekNum === 2 || weekNum === 4;
}

export function calculateAttendance(
  start: Date, 
  end: Date, 
  records: UserRecord[]
): DayInfo[] {
  const days = eachDayOfInterval({ start, end });
  
  // 1. Initial Pass: Identify Base Status (Work, Off, User-Record)
  const timeline: DayInfo[] = days.map(day => {
    // Check specific holidays
    const holiday = HOLIDAYS.find(h => isSameDay(parseISO(h.date), day));
    
    // Check weekends (Sun OR 2nd/4th Sat)
    const sunday = getDay(day) === 0;
    const sat24 = isSecondOrFourthSaturday(day);
    const isOff = !!holiday || sunday || sat24;
    
    // Check User Record
    const record = records.find(r => isSameDay(new Date(r.date), day));
    
    let status: DayInfo['status'] = isOff ? 'OFF' : 'PRESENT'; // Default present if working day
    let leaveAmount = 0;

    if (record) {
      if (record.status === 'LEAVE_FULL') {
        status = 'LEAVE_FULL';
        leaveAmount = 1;
      } else if (record.status.startsWith('LEAVE_HALF')) {
        status = 'LEAVE_HALF';
        leaveAmount = 0.5;
        // Even if it was a holiday, user 'took leave'? Usually user record overrides holiday.
      } else if (record.status === 'PRESENT') {
        status = 'PRESENT';
        leaveAmount = 0;
      }
    } else {
        // No record.
        // If it's OFF -> OFF.
        // If it's Work -> PRESENT (Assuming default presence for past? Or Future?)
        // Requirement: "calculate when to take a leave".
        // Implicitly, future days with no record are 'Working' days that you *will* attend unless marked otherwise.
    }

    return {
      date: day,
      status,
      isWeekend: sunday || sat24,
      isHoliday: !!holiday,
      isSandwich: false,
      leaveAmount,
      holidayName: holiday?.name,
      originalStatus: record?.status
    };
  });

  // 2. Sandwich Pass: "If I take leave on Sat, and Mon, Sun is leave".
  // Definition: A sequence of OFF days that is immediately preceded AND followed by a LEAVE (Full or Half).
  // Iterate through the timeline.
  
  // We need to identify sequences of "OFF" (that are not already user-leaves).
  // Note: user might set a record on a holiday? If so, it's LEAVE_FULL, not OFF.
  // So we assume OFF means "System generated Holiday/Weekend with no user override".

  for (let i = 0; i < timeline.length; i++) {
    if (timeline[i].status === 'OFF') {
      // Start of an OFF sequence?
      let j = i;
      while (j < timeline.length && timeline[j].status === 'OFF') {
        j++;
      }
      // Sequence is i to j-1.
      
      const prevDayIndex = i - 1;
      const nextDayIndex = j;

      const hasPrev = prevDayIndex >= 0;
      const hasNext = nextDayIndex < timeline.length;

      // Check Boundary conditions
      const prevIsLeave = hasPrev && (timeline[prevDayIndex].leaveAmount > 0);
      const nextIsLeave = hasNext && (timeline[nextDayIndex].leaveAmount > 0);

      if (hasPrev && hasNext && prevIsLeave && nextIsLeave) {
        // Trigger Sandwich! 
        // All days from i to j-1 become SANDWICH_LEAVE
        for (let k = i; k < j; k++) {
          timeline[k].status = 'SANDWICH_LEAVE';
          timeline[k].isSandwich = true;
          timeline[k].leaveAmount = 1; // Counts as full leave
        }
      }

      // Advance i to j-1 (loop increment will do i++)
      i = j - 1;
    }
  }

  return timeline;
}

export function getStats(timeline: DayInfo[]) {
  // const totalDays = timeline.length;
  // Denominator: Total Working Days (Assuming sandwich days count as they 'should have been' working days? Or just penalty?)
  // Standard: Percentage = Present / (Total Scheduled - Excused).
  // A Leave makes a day "Scheduled but Absent".
  // A Sandwich Leave makes a Holiday "Scheduled but Absent".
  // So effective "Working Opportunities" = Present + All Leaves (including Sandwich).
  
  const presentDays = timeline.filter(d => d.status === 'PRESENT').length;
  const leaves = timeline.reduce((acc, d) => acc + d.leaveAmount, 0);
  
  // Working Days defined as: Days meant to be worked (Present) + Days missed (Leaves).
  // Days that are OFF and NOT Sandwich are excluded.
  const workingDays = presentDays + leaves; 
  
  // Percentage
  const percentage = workingDays === 0 ? 100 : (presentDays / workingDays) * 100;
  
  // Buffer Calculation:
  // How many regular leaves (1 day) can I take before dropping below 80%?
  // Solve for X: (Present) / (Working + X) >= 0.8
  // Present >= 0.8 * Working + 0.8 * X
  // Present - 0.8 * Working >= 0.8 * X
  // X <= (Present - 0.8 * Working) / 0.8
  // X <= (Present / 0.8) - Working
  
  const buffer = Math.floor((presentDays / 0.8) - workingDays);

  return {
    percentage: percentage.toFixed(2),
    presentDays,
    leaves,
    workingDays,
    buffer: buffer < 0 ? 0 : buffer
  };
}
