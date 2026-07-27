import React, { useState, useEffect } from 'react';
import { Sparkles, ChevronUp, ChevronDown } from 'lucide-react';

interface AllahName {
  id: number;
  arabic: string;
  bangla: string;
  meaning: string;
}

export const allahNames: AllahName[] = [
  { id: 1, arabic: 'الرَّحْمَٰنُ', bangla: 'আর-রহমান', meaning: 'পরম দয়ালু' },
  { id: 2, arabic: 'الرَّحِيمُ', bangla: 'আর-রহীম', meaning: 'অতি দয়ালু' },
  { id: 3, arabic: 'الْمَلِكُ', bangla: 'আল-মালিক', meaning: 'সর্বভৌম ক্ষমতার অধিকারী / বাদশাহ' },
  { id: 4, arabic: 'الْقُدُّوسُ', bangla: 'আল-কুদ্দুস', meaning: 'অতি পবিত্র' },
  { id: 5, arabic: 'السَّلاَمُ', bangla: 'আস-সালাম', meaning: 'শান্তিদাতা' },
  { id: 6, arabic: 'الْمُؤْمِنُ', bangla: 'আল-মু’মিন', meaning: 'নিরাপত্তা ও ঈমান দানকারী' },
  { id: 7, arabic: 'الْمُهَيْمِنُ', bangla: 'আল-মুহাইমিন', meaning: 'রক্ষক ও অভিভাবক' },
  { id: 8, arabic: 'الْعَزِيزُ', bangla: 'আল-আযীয', meaning: 'পরাক্রমশালী / মহাপরাক্রান্ত' },
  { id: 9, arabic: 'الْجَبَّارُ', bangla: 'আল-জাব্বার', meaning: 'দুর্নিবার / বাধ্যকারী' },
  { id: 10, arabic: 'الْمُتَكَبِّرُ', bangla: 'আল-মুতাকাব্বির', meaning: 'মহিমাময় / অহংকারের অধিকারী' },
  { id: 11, arabic: 'الْخَالِقُ', bangla: 'আল-খালিক্ব', meaning: 'সৃষ্টিকর্তা' },
  { id: 12, arabic: 'الْبَارِئُ', bangla: 'আল-বারী', meaning: 'সঠিক রূপদাতা' },
  { id: 13, arabic: 'الْمُصَوِّرُ', bangla: 'আল-মুছব্বির', meaning: 'আকৃতিদানকারী' },
  { id: 14, arabic: 'الْغَفَّارُ', bangla: 'আল-গাফ্ফার', meaning: 'পরম ক্ষমাশীল' },
  { id: 15, arabic: 'الْقَهَّارُ', bangla: 'আল-কাহ্হার', meaning: 'কঠোর সমর্পণকারী' },
  { id: 16, arabic: 'الْوَهَّابُ', bangla: 'আল-ওয়াহ্হাব', meaning: 'মহাদাতা' },
  { id: 17, arabic: 'الرَّزَّاقُ', bangla: 'আর-রয্যাক্ব', meaning: 'রিযিকদাতা' },
  { id: 18, arabic: 'الْفَتَّاحُ', bangla: 'আল-ফাত্তাহ', meaning: 'উন্মোচনকারী / বিজয়দাতা' },
  { id: 19, arabic: 'الْعَلِيمُ', bangla: 'আল-আলীম', meaning: 'সর্বজ্ঞানী' },
  { id: 20, arabic: 'الْقَابِضُ', bangla: 'আল-ক্বাবিদ্ব', meaning: 'সংকোচনকারী' },
  { id: 21, arabic: 'الْبَاسِطُ', bangla: 'আল-বাসিত', meaning: 'সম্প্রসারণকারী' },
  { id: 22, arabic: 'الْخَافِضُ', bangla: 'আল-খাফিদ', meaning: 'অবনতকারী' },
  { id: 23, arabic: 'الرَّافِعُ', bangla: 'আর-রাফি’', meaning: 'উন্নতকারী' },
  { id: 24, arabic: 'الْمُعِزُّ', bangla: 'আল-মু’ইয' , meaning: 'সম্মানদাতা' },
  { id: 25, arabic: 'الْمُذِلُّ', bangla: 'আল-মুযিল', meaning: 'অপমানকারী' },
  { id: 26, arabic: 'السَّمِيعُ', bangla: 'আস-সামী’', meaning: 'সর্বশ্রোতা' },
  { id: 27, arabic: 'الْبَصِيرُ', bangla: 'আল-বাছীর', meaning: 'সর্বদ্রষ্টা' },
  { id: 28, arabic: 'الْحَكَمُ', bangla: 'আল-হাকাম', meaning: 'বিচারক' },
  { id: 29, arabic: 'الْعَدْلُ', bangla: 'আল-’আদল', meaning: 'ন্যায়পরায়ণ' },
  { id: 30, arabic: 'اللَّطِيفُ', bangla: 'আল-লতীফ', meaning: 'সুক্ষ্মদদর্শী / মেহেরবান' },
  { id: 31, arabic: 'الْخَبِيرُ', bangla: 'আল-খাবীর', meaning: 'সর্ববিষয় সম্যক অবহিত' },
  { id: 32, arabic: 'الْحَلِيمُ', bangla: 'আল-হালীম', meaning: 'ধৈর্যশীল / সহনশীল' },
  { id: 33, arabic: 'الْعَظِيمُ', bangla: 'আল-’আজীম', meaning: 'মহান / সর্বোচ্চ' },
  { id: 34, arabic: 'الْغَفُورُ', bangla: 'আল-গফূর', meaning: 'ক্ষমাশীল' },
  { id: 35, arabic: 'الشَّكُورُ', bangla: 'আশ-শাকূর', meaning: 'গুণগ্রাহী / মূল্যায়নকারী' },
  { id: 36, arabic: 'الْعَلِيُّ', bangla: 'আল-’আলী', meaning: 'উচ্চ মর্যাদাশীল' },
  { id: 37, arabic: 'الْكَبِيرُ', bangla: 'আল-কবীর', meaning: 'মহামহিম' },
  { id: 38, arabic: 'الْحَفِيظُ', bangla: 'আল-হাফীয', meaning: 'সংরক্ষক' },
  { id: 39, arabic: 'الْمُقِيتُ', bangla: 'আল-মুক্বীত', meaning: 'জীবনোপকরণ দাতা' },
  { id: 40, arabic: 'الْحَسِيبُ', bangla: 'আল-হাসীব', meaning: 'হিসাব গ্রহণকারী' },
  { id: 41, arabic: 'الْجَلِيلُ', bangla: 'আল-জালীিল', meaning: 'প্রভাবশালী / মহিমান্বিত' },
  { id: 42, arabic: 'الْكَرِيمُ', bangla: 'আল-কারীম', meaning: 'মহা বদান্য' },
  { id: 43, arabic: 'الرَّقِيبُ', bangla: 'আর-ারক্বীব', meaning: 'তত্ত্বাবধানকারী' },
  { id: 44, arabic: 'الْمُجِيبُ', bangla: 'আল-মুজীব', meaning: 'সাড়া দানকারী' },
  { id: 45, arabic: 'الْوَاسِعُ', bangla: 'আল-ওয়াসি’', meaning: 'সর্বব্যাপী' },
  { id: 46, arabic: 'الْحَكِيمُ', bangla: 'আল-হাকীম', meaning: 'প্রজ্ঞাময়' },
  { id: 47, arabic: 'الْوَدُودُ', bangla: 'আল-ওয়াদূদ', meaning: 'প্রেমময় / স্নেহশীল' },
  { id: 48, arabic: 'الْمَجِيدُ', bangla: 'আল-মাজীদ', meaning: 'মহা গৌরবান্বিত' },
  { id: 49, arabic: 'الْبَاعِثُ', bangla: 'আল-বা’ইছ', meaning: 'পুনরুত্থানকারী' },
  { id: 50, arabic: 'الشَّهِيدُ', bangla: 'আশ-শাহীদ', meaning: 'সর্বদর্শী সাক্ষী' },
  { id: 51, arabic: 'الْحَقُّ', bangla: 'আল-হাক্ক', meaning: 'পরম সত্য' },
  { id: 52, arabic: 'الْوَكِيلُ', bangla: 'আল-ওয়াকীল', meaning: 'কর্মসম্পাদনকারী / অভিভাবক' },
  { id: 53, arabic: 'الْقَوِيُّ', bangla: 'আল-ক্ববীয়্যা', meaning: 'মহাসক্ষম / শক্তিশালী' },
  { id: 54, arabic: 'الْمَتِينُ', bangla: 'আল-মাতীন', meaning: 'সুদৃঢ়' },
  { id: 55, arabic: 'الْوَلِيُّ', bangla: 'আল-ওয়ালী', meaning: 'অভিভাবক ও সাহায্যকারী' },
  { id: 56, arabic: 'الْحَمِيدُ', bangla: 'আল-হামীদ', meaning: 'প্রশংসিত' },
  { id: 57, arabic: 'الْمُحْصِي', bangla: 'আল-মুহ্ছী', meaning: 'গণনাকারী' },
  { id: 58, arabic: 'الْمُبْدِئُ', bangla: 'আল-মুব্দী', meaning: 'সূচনাকারী' },
  { id: 59, arabic: 'الْمُعِيدُ', bangla: 'আল-মু’ঈদ্', meaning: 'পুনর্বার সৃষ্টিকারী' },
  { id: 60, arabic: 'الْمُحْيِي', bangla: 'আল-মুহ্্য়ী', meaning: 'জীবনদানকারী' },
  { id: 61, arabic: 'الْمُمِيتُ', bangla: 'আল-মুমীত', meaning: 'মৃত্যুদানকারী' },
  { id: 62, arabic: 'الْحَيُّ', bangla: 'আল-হাইয়্যু', meaning: 'চিরঞ্জীব' },
  { id: 63, arabic: 'الْقَيُّومُ', bangla: 'আল-ক্বাইয়্যূম', meaning: 'চিরস্থায়ী' },
  { id: 64, arabic: 'الْوَاجِدُ', bangla: 'আল-ওয়াজিদ', meaning: 'প্রাপ্তকারী' },
  { id: 65, arabic: 'الْمَاجِدُ', bangla: 'আল-মাজিদ', meaning: 'শ্রেষ্ঠ ও সম্মানিত' },
  { id: 66, arabic: 'الْواحِدُ', bangla: 'আল-ওয়াহিদ', meaning: 'এক ও অদ্বিতীয়' },
  { id: 67, arabic: 'الصَّمَدُ', bangla: 'আছ-চ্ছমাদ', meaning: 'অমুখাপেক্ষী' },
  { id: 68, arabic: 'الْقَادِرُ', bangla: 'আল-ক্বাদির', meaning: 'সর্বশক্তিমান' },
  { id: 69, arabic: 'الْمُقْتَدِرُ', bangla: 'আল-মুক্ব্তাদির', meaning: 'মহাশক্তিধর' },
  { id: 70, arabic: 'الْمُقَدِّمُ', bangla: 'আল-মুক্বদ্দিম', meaning: 'অগ্রসরকারী' },
  { id: 71, arabic: 'الْمُؤَخِّرُ', bangla: 'আল-মুয়াক্ষির', meaning: 'পশ্চাদ্বর্তীকারী' },
  { id: 72, arabic: 'الأَوَّلُ', bangla: 'আল-আউয়াল', meaning: 'অনাদি / প্রথম' },
  { id: 73, arabic: 'الأَخِرُ', bangla: 'আল-আখির', meaning: 'অনন্ত / শেষ' },
  { id: 74, arabic: 'الظَّاهِرُ', bangla: 'অ্যায-যাহির', meaning: 'প্রকাশ্য' },
  { id: 75, arabic: 'الْبَاطِنُ', bangla: 'আল-বাতিন', meaning: 'গুপ্ত / অদৃশ্য' },
  { id: 76, arabic: 'الْوَالِي', bangla: 'আল-ওয়ালী', meaning: 'শাসনকর্তা' },
  { id: 77, arabic: 'الْمُتَعَالِي', bangla: 'আল-মুতালীয়্যা', meaning: 'সর্বোচ্চ সুউচ্চ' },
  { id: 78, arabic: 'الْبَرُّ', bangla: 'আল-বার্র', meaning: 'সদাচারী / পরম উপকারী' },
  { id: 79, arabic: 'التَّوَّابُ', bangla: 'আত-তাওয়াব', meaning: 'তওবা কবুলকারী' },
  { id: 80, arabic: 'الْمُنْتَقِمُ', bangla: 'আল-মুনতাক্বিম', meaning: 'প্রতিশোধগ্রহণকারী' },
  { id: 81, arabic: 'العَفُوُّ', bangla: 'আল-’আফুউ', meaning: 'পরম ক্ষমাশীল' },
  { id: 82, arabic: 'الرَّؤُوفُ', bangla: 'আর-র’ঊফ', meaning: 'পরম স্নেহশীল' },
  { id: 83, arabic: 'مَالِكُ الْمُلْكِ', bangla: 'মালিকুল মুলক', meaning: 'সাম্রাজ্যের অধিপতি' },
  { id: 84, arabic: 'ذُو الْجَلاَلِ وَالإِكْرَامِ', bangla: 'যুল জালালি ওয়াল ইকরাম', meaning: 'মহিমান্বিত ও মহানুভব' },
  { id: 85, arabic: 'الْمُقْسِطُ', bangla: 'আল-মুক্ব্সিত', meaning: 'সুবিচারকারী' },
  { id: 86, arabic: 'الْجَامِعُ', bangla: 'আল-জামি’', meaning: 'একত্রকারী' },
  { id: 87, arabic: 'الْغَنِيُّ', bangla: 'আল-গানী', meaning: 'ধনী / অমুখাপেক্ষী' },
  { id: 88, arabic: 'الْمُغْنِي', bangla: 'আল-মুগ্‌নী', meaning: 'সমৃদ্ধকারী' },
  { id: 89, arabic: 'الْمَانِعُ', bangla: 'আল-মানি’', meaning: 'প্রতিরোধকারী' },
  { id: 90, arabic: 'الضَّارُّ', bangla: 'অ্যাদ্ব-দ্বারর', meaning: 'ক্ষতিসাধনকারী' },
  { id: 91, arabic: 'النَّافِعُ', bangla: 'আন-নাফি’', meaning: 'উপকারী' },
  { id: 92, arabic: 'النُّورُ', bangla: 'আন-নূর', meaning: 'জ্যোতি / আলো' },
  { id: 93, arabic: 'الْهَادِي', bangla: 'আল-হাদী', meaning: 'পথপ্রদর্শক' },
  { id: 94, arabic: 'الْبَدِيعُ', bangla: 'আল-বাদী’', meaning: 'অনুপম দ্রষ্টা' },
  { id: 95, arabic: 'الْبَاقِي', bangla: 'আল-বাক্বী', meaning: 'চিরস্থায়ী' },
  { id: 96, arabic: 'الْوَارِثُ', bangla: 'আল-ওয়ারিস', meaning: 'উত্তরাধিকারী' },
  { id: 97, arabic: 'الرَّشِيدُ', bangla: 'আর-রশীদ', meaning: 'সঠিক পথ পরিচালনকারী' },
  { id: 98, arabic: 'الصَّبُورُ', bangla: 'আছ-চ্ছবূর', meaning: 'অসীম ধৈর্যশীল' },
  { id: 99, arabic: 'اللهُ', bangla: 'আল্লাহু', meaning: 'একমাত্র উপাস্য' },
];

export const AllahNamesWidget: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % allahNames.length);
    }, 2800); // changes every 2.8s

    return () => clearInterval(interval);
  }, [isPaused]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % allahNames.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + allahNames.length) % allahNames.length);
  };

  // Showing current name and next name in vertical sliding container
  const currentItem = allahNames[currentIndex];

  return (
    <div 
      className="relative flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-2xl px-4 py-2.5 border border-emerald-500/30 shadow-lg backdrop-blur-md overflow-hidden max-w-sm sm:max-w-md w-full my-1 transition-all hover:border-emerald-400/60"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Decorative Glow */}
      <div className="absolute -top-10 -left-10 w-24 h-24 bg-emerald-500/20 rounded-full blur-xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-amber-500/20 rounded-full blur-xl pointer-events-none" />

      {/* Left Icon Badge */}
      <div className="flex flex-col items-center justify-center shrink-0 border-r border-emerald-700/50 pr-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md">
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
        </div>
        <span className="text-[9px] font-black text-emerald-300 mt-1 tracking-wider uppercase">
          আল্লাহর নাম
        </span>
      </div>

      {/* Middle Animated Vertical Slide Area */}
      <div className="flex-1 min-w-0 h-11 relative overflow-hidden flex items-center">
        <div 
          key={currentItem.id}
          className="w-full flex items-center justify-between gap-2 animate-in slide-in-from-top-4 fade-in duration-500"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black bg-emerald-900/80 text-amber-300 px-1.5 py-0.5 rounded-md border border-emerald-700/60 shrink-0">
                #{currentItem.id}
              </span>
              <span className="text-sm font-black text-white truncate tracking-tight">
                {currentItem.bangla}
              </span>
            </div>
            <p className="text-[11px] font-medium text-emerald-200/90 truncate mt-0.5">
              অর্থ: <span className="text-amber-200 font-semibold">{currentItem.meaning}</span>
            </p>
          </div>

          {/* Arabic Calligraphy Style Text */}
          <div className="shrink-0 text-right pl-2">
            <span className="text-lg sm:text-xl font-bold font-serif text-amber-300 tracking-wide drop-shadow-sm">
              {currentItem.arabic}
            </span>
          </div>
        </div>
      </div>

      {/* Right Up / Down Manual Control Buttons */}
      <div className="flex flex-col items-center gap-0.5 shrink-0 pl-2 border-l border-emerald-700/50">
        <button 
          onClick={handlePrev}
          className="p-1 hover:bg-emerald-800/60 rounded-md text-emerald-300 hover:text-white transition cursor-pointer"
          title="পূর্ববর্তী নাম"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={handleNext}
          className="p-1 hover:bg-emerald-800/60 rounded-md text-emerald-300 hover:text-white transition cursor-pointer"
          title="পরবর্তী নাম"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
