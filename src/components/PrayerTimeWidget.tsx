import React, { useState, useEffect } from 'react';
import { Clock, Key, Compass, Sparkles } from 'lucide-react';

interface PrayerTime {
  nameBn: string;
  nameEn: string;
  time: string;
  startHour: number; // 24-hour format
  startMin: number;
}

export const PrayerTimeWidget: React.FC = () => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const prayers: PrayerTime[] = [
    { nameBn: 'ফজর', nameEn: 'Fajr', time: '০৪:১৫ AM', startHour: 4, startMin: 15 },
    { nameBn: 'যোহর', nameEn: 'Dhuhr', time: '১২:১৫ PM', startHour: 12, startMin: 15 },
    { nameBn: 'আসর', nameEn: 'Asr', time: '০৪:৪৫ PM', startHour: 16, startMin: 45 },
    { nameBn: 'মাগরিব', nameEn: 'Maghrib', time: '০৬:৫০ PM', startHour: 18, startMin: 50 },
    { nameBn: 'এশা', nameEn: 'Isha', time: '০৮:২০ PM', startHour: 20, startMin: 20 },
  ];

  // Calculate current active prayer based on 24-hour current time
  const getActivePrayerIndex = (): number => {
    const h = currentTime.getHours();
    const m = currentTime.getMinutes();
    const currentMins = h * 60 + m;

    const fMins = 4 * 60 + 15;   // 04:15
    const dMins = 12 * 60 + 15;  // 12:15
    const aMins = 16 * 60 + 45;  // 16:45
    const mMins = 18 * 60 + 50;  // 18:50
    const iMins = 20 * 60 + 20;  // 20:20

    if (currentMins >= fMins && currentMins < dMins) return 0; // Fajr
    if (currentMins >= dMins && currentMins < aMins) return 1; // Dhuhr
    if (currentMins >= aMins && currentMins < mMins) return 2; // Asr
    if (currentMins >= mMins && currentMins < iMins) return 3; // Maghrib
    return 4; // Isha / Night
  };

  const activeIdx = getActivePrayerIndex();

  // Formatted live time string
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('bn-BD', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="w-full max-w-md my-4 bg-white/95 border border-emerald-200/80 rounded-3xl p-4 sm:p-5 shadow-xl backdrop-blur-md z-10 animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden">
      {/* Decorative top accent glow */}
      <div className="absolute -top-12 -left-12 w-28 h-28 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-28 h-28 bg-teal-400/20 rounded-full blur-2xl pointer-events-none" />

      {/* Header: Title + Live Clock */}
      <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-600 text-white rounded-xl shadow-sm">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              ৫ ওয়াক্ত নামাজের সময়সূচী
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            </h3>
            <p className="text-[10px] font-bold text-emerald-700">{formatDate(currentTime)}</p>
          </div>
        </div>

        {/* Live Running Digital Clock */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs font-black shadow-inner border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>{formatTime(currentTime)}</span>
        </div>
      </div>

      {/* 5 Waqt Prayer Grid */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 my-3">
        {prayers.map((p, idx) => {
          const isActive = idx === activeIdx;
          return (
            <div
              key={p.nameEn}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-300 border ${
                isActive
                  ? 'bg-gradient-to-b from-emerald-600 to-teal-700 text-white border-emerald-400 shadow-md scale-105 ring-2 ring-emerald-300/50'
                  : 'bg-emerald-50/50 hover:bg-emerald-100/60 text-slate-800 border-emerald-100'
              }`}
            >
              <span className={`text-[10px] font-extrabold ${isActive ? 'text-emerald-100' : 'text-emerald-800'}`}>
                {p.nameBn}
              </span>
              <span className={`text-[11px] font-black tracking-tighter mt-0.5 ${isActive ? 'text-white' : 'text-slate-900'}`}>
                {p.time.split(' ')[0]}
              </span>
              <span className={`text-[8px] uppercase font-bold tracking-widest ${isActive ? 'text-amber-300' : 'text-slate-500'}`}>
                {p.time.split(' ')[1]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer Banner: "নামাজ বেহেশতের চাবি" */}
      <div className="pt-2.5 border-t border-emerald-100/80 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500/10 via-teal-500/15 to-emerald-500/10 py-1.5 rounded-2xl border border-emerald-200/50">
        <Key className="w-4 h-4 text-amber-600 animate-bounce" />
        <span className="text-xs sm:text-sm font-black text-emerald-900 tracking-wide font-serif">
          "নামাজ বেহেশতের চাবি"
        </span>
        <Key className="w-4 h-4 text-amber-600 animate-bounce scale-x-[-1]" />
      </div>
    </div>
  );
};
