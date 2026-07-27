import React from 'react';
import { DrawstringItem, AppTheme, UserProfile } from '../types';

interface DrawstringReportProps {
  items?: DrawstringItem[];
  theme?: AppTheme;
  currentUser?: UserProfile | null;
  canEdit?: boolean;
  onUpdateItem?: (updatedItem: DrawstringItem) => void;
  onDeleteItem?: (id: number) => void;
}

export const DrawstringReport: React.FC<DrawstringReportProps> = ({
  theme = 'light',
}) => {
  const isLight = theme === 'light';

  return (
    <div className={`w-full min-h-[60vh] p-8 rounded-3xl border flex flex-col items-center justify-center text-center ${
      isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
    }`}>
      <div className="max-w-md space-y-3">
        <h2 className="text-xl font-black tracking-tight text-slate-400 dark:text-slate-500">
          Report Section (Blank)
        </h2>
        <p className="text-xs text-slate-400">
          রিপোর্ট পেজটি বর্তমানে খালি রাখা হয়েছে। পরবর্তীতে আপনাদের প্রয়োজন অনুযায়ী এটি সাজানো হবে।
        </p>
      </div>
    </div>
  );
};
