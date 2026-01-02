
import React, { useState } from 'react';
import { Image as ImageIcon, Sparkles, Loader2, X, PenTool, Scissors } from 'lucide-react';
import { generateDoodles } from '../services/geminiService.ts';

export const MarkerHighlight: React.FC<{ children: React.ReactNode; className?: string; color?: string }> = ({ children, className, color = 'rgba(253, 224, 71, 0.4)' }) => (
  <span 
    className={`font-handwriting-header ${className}`}
    style={{ 
      background: `linear-gradient(100deg, ${color} 0%, ${color.replace('0.4', '0.7')} 50%, ${color} 100%)`,
      borderRadius: '2px',
      padding: '0 4px'
    }}
  >
    {children}
  </span>
);

export const DoodleStar = ({ className = "" }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} text-yellow-500`}>
    <path d="M12 2.5L14.7 9H21.5L16 13L18 20L12 16L6 20L8 13L2.5 9H9.3L12 2.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const DoodleCorner = ({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) => {
  const rotations = {
    tl: 'rotate-0',
    tr: 'rotate-90',
    bl: 'rotate-[-90deg]',
    br: 'rotate-180'
  };
  
  return (
    <div className={`absolute pointer-events-none opacity-20 ${position === 'tl' ? 'top-4 left-4' : position === 'tr' ? 'top-4 right-4' : position === 'bl' ? 'bottom-4 left-4' : 'bottom-4 right-4'} ${rotations[position]}`}>
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 56C4 20 20 4 56 4" stroke="black" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4"/>
        <path d="M12 48C12 28 28 12 48 12" stroke="black" strokeWidth="1" strokeLinecap="round" strokeDasharray="2 6"/>
        <circle cx="8" cy="8" r="3" fill="black" opacity="0.4"/>
      </svg>
    </div>
  );
};

export const QuestionIcon = ({ type, index }: { type: string, index: number }) => {
  const icons: Record<string, React.ReactNode> = {
    MCQ: <path d="M9 18H15M10 21H14M12 3C8.1 3 5 6.1 5 10C5 12.4 6.2 14.5 8 15.7V17H16V15.7C17.8 14.5 19 12.4 19 10C19 6.1 15.9 3 12 3Z" />,
    TF: <path d="M4 19.5V5C4 3.9 4.9 3 6 3H19M4 19.5C4 20.6 4.9 21.5 6 21.5H19V17H6C4.9 17 4 17.9 4 19.5Z" />,
    DRILL: <path d="M3 17V21H7L17.5 10.5L13.5 6.5L3 17Z" />,
    PAGE_BREAK: <path d="M3 12H5M8 12H10M13 12H15M18 12H21M7 8l-2 4 2 4M17 8l2 4-2 4" />,
    CHALLENGE: (
      <>
        <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="6" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="2" strokeWidth="1.5" />
      </>
    )
  };
  
  const icon = icons[type] || icons.DRILL;
  
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 rotate-3">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {icon}
      </svg>
    </div>
  );
};

export const HelenCharacter = () => (
  <div className="relative inline-block scale-75 origin-top-left">
    <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 80C20 60 30 45 50 45C70 45 80 60 80 80V85H20V80Z" fill="white" stroke="black" strokeWidth="2.5"/>
      <circle cx="50" cy="35" r="25" fill="white" stroke="black" strokeWidth="2.5"/>
      <circle cx="42" cy="35" r="1.5" fill="black"/>
      <circle cx="58" cy="35" r="1.5" fill="black"/>
      <path d="M48 42C48 42 50 43.5 52 42" stroke="black" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="45" cy="33" r="1" fill="white" opacity="0.4"/>
      <circle cx="55" cy="33" r="1" fill="white" opacity="0.4"/>
    </svg>
    <div className="absolute -top-10 -right-28 w-32">
      <div className="relative bg-white border border-black rounded-xl p-2 text-[9px] leading-tight font-handwriting-body shadow-sm">
        Helen says: You're doing great! Keep going!
        <div className="absolute -bottom-1.5 left-3 w-2 h-2 bg-white border-b border-l border-black -rotate-45"></div>
      </div>
    </div>
  </div>
);

export const HandDrawnArrow = ({ className }: { className?: string }) => (
  <svg width="30" height="30" viewBox="0 0 40 40" fill="none" className={className}>
    <path d="M10 10C15 15 20 25 20 35M20 35L15 30M20 35L25 30" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const HandwritingLabels = () => (
  <div className="flex justify-end gap-16 mb-6 pr-12 mt-2 no-print">
    <div className="text-center flex flex-col items-center">
      <span className="font-handwriting-body text-[10px] italic leading-tight">Reference</span>
      <HandDrawnArrow className="mt-1 rotate-12 opacity-30" />
    </div>
    <div className="text-center flex flex-col items-center">
      <span className="font-handwriting-body text-[10px] italic leading-tight">Practice Area</span>
      <div className="w-16 h-[1px] bg-black mt-4 rounded-full opacity-20"></div>
    </div>
  </div>
);

export const DraggableLineRow: React.FC<{ 
  text: string; 
  isSmall?: boolean; 
  showTraceButton?: boolean;
}> = ({ text, isSmall, showTraceButton }) => {
  const [isTracing, setIsTracing] = useState(false);

  return (
    <div className={`flex items-center gap-4 py-1.5 border-b border-slate-100/50 ${isSmall ? 'gap-2' : 'gap-6'}`}>
      <div className={`font-handwriting-body text-slate-900 truncate font-bold transition-all duration-300 ${isSmall ? 'text-lg w-12' : 'text-2xl w-24'} ${isTracing ? 'scale-105 text-yellow-600' : ''}`}>
        {text}
      </div>
      <div className={`flex-1 h-6 dotted-line transition-all duration-500 ${isTracing ? 'animate-trace-pulse opacity-100' : 'opacity-40'}`}></div>
      {showTraceButton && (
        <button 
          onClick={() => setIsTracing(!isTracing)}
          className={`no-print p-1.5 rounded-lg transition-all group flex items-center justify-center ${isTracing ? 'bg-yellow-400 text-yellow-900 shadow-md ring-2 ring-yellow-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}
          title={isTracing ? "Stop Tracing Practice" : "Start Tracing Practice"}
        >
          <PenTool className={`w-3.5 h-3.5 ${isTracing ? 'animate-bounce' : ''}`} />
          <span className="sr-only">Trace This</span>
        </button>
      )}
    </div>
  );
};

export const SymbolDrillRow: React.FC<{ symbols: string }> = ({ symbols }) => (
  <div className="flex flex-col gap-2 py-4">
    <div className="font-handwriting-body text-3xl tracking-[0.5em] text-slate-900 font-bold">{symbols}</div>
    <div className="h-12 dotted-line opacity-40 w-full"></div>
  </div>
);

export const SketchyBorderBox: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`relative p-6 ${className}`}>
    <div className="absolute inset-0 border-2 border-slate-900/10 pointer-events-none rounded-[15px_225px_15px_255px/225px_15px_225px_15px]"></div>
    <div className="relative z-10">{children}</div>
  </div>
);

export const HandDrawnDivider = ({ label }: { label?: string }) => (
  <div className="w-full flex items-center gap-4 my-8 opacity-30">
    <div className="flex-1 h-[2px] bg-slate-900 rounded-full"></div>
    {label && <span className="font-handwriting-header text-xl whitespace-nowrap">{label}</span>}
    <div className="flex-1 h-[2px] bg-slate-900 rounded-full"></div>
  </div>
);

interface DoodlePaletteProps {
  topic: string;
  gradeLevel: string;
  onDoodleSelect: (doodleUrl: string) => void;
}

export const DoodlePalette: React.FC<DoodlePaletteProps> = ({ topic, gradeLevel, onDoodleSelect }) => {
  const [doodles, setDoodles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchDoodles = async () => {
    setLoading(true);
    try {
      const generated = await generateDoodles(topic, gradeLevel);
      setDoodles(generated);
      setIsOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="no-print fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-4">
      {isOpen && doodles.length > 0 && (
        <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border-4 border-yellow-400 w-72 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-handwriting-header text-2xl text-slate-800">Doodle Styles</h4>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-100 rounded-full">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-4">Click to add to sheet</p>
          <div className="grid grid-cols-1 gap-4">
            {doodles.map((url, i) => (
              <button 
                key={i}
                onClick={() => onDoodleSelect(url)}
                className="relative group aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 hover:border-yellow-400 transition-all hover:scale-[1.02] bg-slate-50"
              >
                <img src={url} alt={`Doodle style ${i}`} className="w-full h-full object-contain mix-blend-multiply p-2" />
                <div className="absolute inset-0 bg-yellow-400/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Sparkles className="w-8 h-8 text-yellow-600 drop-shadow-sm" />
                </div>
              </button>
            ))}
          </div>
          <button 
            onClick={fetchDoodles}
            disabled={loading}
            className="w-full mt-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Regenerate
          </button>
        </div>
      )}

      <button 
        onClick={isOpen ? () => setIsOpen(false) : fetchDoodles}
        disabled={loading}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 ${
          loading ? 'bg-slate-100 animate-pulse cursor-wait' : 'bg-yellow-400 hover:bg-yellow-500 hover:rotate-12'
        }`}
      >
        {loading ? (
          <Loader2 className="w-8 h-8 text-yellow-600 animate-spin" />
        ) : (
          <ImageIcon className="w-8 h-8 text-yellow-900" />
        )}
      </button>
    </div>
  );
};
