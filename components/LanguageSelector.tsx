'use client';

import { useLanguage, LANGUAGES, Lang } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  size?: 'sm' | 'md';
}

export default function LanguageSelector({ size = 'md' }: LanguageSelectorProps) {
  const { lang, setLang } = useLanguage();
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-lg border transition-all ${
          size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'
        } ${isDark
          ? 'bg-white/[0.02] border-white/[0.08] text-gray-300 hover:bg-white/[0.04]'
          : 'bg-white border-[#dddddd] text-[#222222] hover:bg-[#f7f7f7]'
        }`}
      >
        <Globe className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
        <span className="font-medium">{current.flag}</span>
      </button>

      {open && (
        <div className={`absolute right-0 top-full mt-1 rounded-xl border shadow-lg z-50 overflow-hidden min-w-[160px] ${
          isDark ? 'bg-[#222244] border-white/[0.08]' : 'bg-white border-[#ebebeb]'
        }`}>
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                l.code === lang
                  ? 'bg-[#FF385C]/10 text-[#FF385C] font-medium'
                  : isDark
                    ? 'text-gray-300 hover:bg-white/[0.04]'
                    : 'text-[#222222] hover:bg-[#f7f7f7]'
              }`}
            >
              <span className="font-bold text-xs w-6">{l.flag}</span>
              <span>{l.name}</span>
              {l.code === lang && (
                <span className="ml-auto text-[#FF385C]">&#10003;</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
