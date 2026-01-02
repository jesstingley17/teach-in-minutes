
import React, { useState, useEffect, useRef } from 'react';
import { Worksheet, QuestionType, ThemeType, Question, DocumentType } from '../types';
import { 
  MarkerHighlight, 
  HelenCharacter, 
  QuestionIcon,
  DoodleCorner,
  DoodlePalette,
  DraggableLineRow
} from './HandwritingElements';
import { LatexRenderer } from './LatexRenderer';
import { generateSpeech } from '../services/geminiService';
import { uploadFile, getPublicUrl, supabase } from '../services/supabaseClient';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  Trash2, Edit3, Check, X, FilePlus, Type, 
  CheckSquare, PlusCircle, ChevronUp, ChevronDown,
  Settings, User, Landmark, Clock as ClockIcon,
  Hash, Scissors, HelpCircle, ImageIcon, ImagePlus,
  Palette, Printer, Loader2, Link as LinkIcon, ShieldCheck, 
  BookMarked, Share2, Volume2, Copy
} from 'lucide-react';

interface WorksheetViewProps {
  worksheet: Worksheet;
  theme: ThemeType;
  showKey?: boolean;
  showDoodles?: boolean;
  isMathMode?: boolean;
  onUpdate?: (worksheet: Worksheet) => void;
}

export const WorksheetView: React.FC<WorksheetViewProps> = ({ 
  worksheet: initialWorksheet, 
  theme: initialTheme, 
  showKey = false, 
  showDoodles = false, 
  isMathMode = false,
  onUpdate
}) => {
  const [worksheet, setWorksheet] = useState<Worksheet>(initialWorksheet);
  const [isBuilderMode, setIsBuilderMode] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(initialTheme);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setWorksheet(initialWorksheet);
  }, [initialWorksheet]);

  const handleUpdate = (newWs: Worksheet) => {
    setWorksheet(newWs);
    if (onUpdate) onUpdate(newWs);
  };

  const handleSpeech = async (id: string, text: string) => {
    setActiveSpeechId(id);
    await generateSpeech(text);
    setActiveSpeechId(null);
  };

  const generatePdfBlob = async (): Promise<Blob> => {
    const element = document.getElementById('worksheet-content');
    if (!element) throw new Error("Content not found");
    const canvas = await html2canvas(element, { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
    return pdf.output('blob');
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const blob = await generatePdfBlob();
      const fileName = `${worksheet.id || 'temp'}-${Date.now()}.pdf`;
      await uploadFile('worksheets-pdf', fileName, blob);
      const url = getPublicUrl('worksheets-pdf', fileName);
      setShareUrl(url);
      
      if (worksheet.id) {
        await supabase.from('worksheets').update({ share_url: url }).eq('id', worksheet.id);
      }

      navigator.clipboard.writeText(url);
    } catch (error) {
      console.error("Sharing failed", error);
      alert("Failed to share.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const blob = await generatePdfBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${worksheet.title.replace(/\s+/g, '_')}_Worksheet.pdf`;
      link.click();
    } finally {
      setIsExporting(false);
    }
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    handleUpdate({
      ...worksheet,
      questions: worksheet.questions.map(q => q.id === id ? { ...q, ...updates } : q)
    });
  };

  const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => handleUpdate({ ...worksheet, backgroundImage: reader.result as string });
    reader.readAsDataURL(file);
  };

  const addQuestion = (type: QuestionType) => {
    const newQ: Question = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      sectionInstruction: "Directions:",
      question: "Edit question...",
      correctAnswer: "Answer",
      explanation: "",
      isChallenge: false,
      points: 5,
      options: type === QuestionType.MCQ ? ["Option 1", "Option 2"] : undefined
    };
    handleUpdate({ ...worksheet, questions: [...worksheet.questions, newQ] });
  };

  const themeClasses = (() => {
    switch (currentTheme) {
      case ThemeType.CREATIVE: return { body: 'font-handwriting-body', header: 'font-handwriting-header', accent: 'border-slate-900', accentBg: 'bg-slate-900', accentText: 'text-slate-900', container: 'bg-white', itemBg: 'bg-white', rounded: 'rounded-[1.5rem]' };
      case ThemeType.CLASSIC: return { body: 'font-classic-body', header: 'font-classic-header', accent: 'border-slate-800', accentBg: 'bg-slate-800', accentText: 'text-slate-800', container: 'bg-stone-50', itemBg: 'bg-stone-100/50', rounded: 'rounded-none' };
      case ThemeType.MODERN: return { body: 'font-sans tracking-tight', header: 'font-sans font-black tracking-tighter', accent: 'border-blue-600', accentBg: 'bg-blue-600', accentText: 'text-blue-600', container: 'bg-white', itemBg: 'bg-blue-50/30', rounded: 'rounded-2xl' };
      case ThemeType.ACADEMIC: return { body: 'font-sans leading-relaxed', header: 'font-sans font-extrabold tracking-tight', accent: 'border-slate-950', accentBg: 'bg-slate-950', accentText: 'text-slate-950', container: 'bg-white', itemBg: 'bg-slate-100/50', rounded: 'rounded-md' };
      default: return { body: 'font-sans', header: 'font-sans font-bold', accent: 'border-slate-900', accentBg: 'bg-slate-900', accentText: 'text-slate-900', container: 'bg-white', itemBg: 'bg-slate-50', rounded: 'rounded-lg' };
    }
  })();

  const EditableField = ({ value, onSave, className, multiline = false, placeholder = "", isMath = false }: any) => {
    const [local, setLocal] = useState(value);
    const [editing, setEditing] = useState(false);
    useEffect(() => setLocal(value), [value]);
    if (!isBuilderMode) return isMath ? <LatexRenderer content={value || placeholder} className={className} /> : <span className={className}>{value || placeholder}</span>;
    if (editing) return multiline ? <textarea autoFocus className={`w-full p-2 border-2 border-blue-400 rounded bg-blue-50 focus:outline-none ${className}`} value={local} onChange={(e) => setLocal(e.target.value)} onBlur={() => { setEditing(false); onSave(local); }} /> : <input autoFocus className={`w-full p-1 border-2 border-blue-400 rounded bg-blue-50 focus:outline-none ${className}`} value={local} onChange={(e) => setLocal(e.target.value)} onBlur={() => { setEditing(false); onSave(local); }} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />;
    return <span onClick={() => setEditing(true)} className={`cursor-text hover:bg-slate-50 transition-colors p-1 rounded border border-transparent hover:border-slate-200 block min-w-[20px] ${className} ${!value ? 'text-slate-300 italic' : ''}`}>{isMath ? <LatexRenderer content={value || placeholder} /> : (value || placeholder)}</span>;
  };

  return (
    <div className="relative group/ws antialiased">
      <div className="absolute -top-16 left-0 right-0 flex justify-between items-center no-print px-6 py-3 bg-white border border-slate-200 shadow-sm z-[60] rounded-2xl">
        <div className="flex gap-4 items-center">
          <button onClick={() => setIsBuilderMode(!isBuilderMode)} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold transition-all ${isBuilderMode ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{isBuilderMode ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}{isBuilderMode ? 'Finish' : 'Edit'}</button>
          
          <div className="flex items-center gap-2 border-l pl-4 border-slate-100">
            <button onClick={handleShare} disabled={isSharing} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold transition-all shadow-sm ${isSharing ? 'bg-slate-50 text-slate-300' : 'bg-green-600 text-white hover:bg-green-700'}`}>
              {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              <span className="text-[9px] uppercase tracking-widest font-black">{shareUrl ? 'Published' : 'Publish'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 border-l pl-4 border-slate-100">
            <select value={currentTheme} onChange={(e) => setCurrentTheme(e.target.value as ThemeType)} className="bg-transparent border-none text-[9px] font-black uppercase tracking-widest text-slate-500 focus:ring-0 cursor-pointer">
              <option value={ThemeType.ACADEMIC}>Academic Style</option>
              <option value={ThemeType.CREATIVE}>Creative Style</option>
              <option value={ThemeType.CLASSIC}>Classic Style</option>
              <option value={ThemeType.MODERN}>Modern Style</option>
            </select>
          </div>
          
          {!isBuilderMode && (
            <div className="flex items-center gap-2 border-l pl-4 border-slate-100">
              <button onClick={handleExportPDF} disabled={isExporting} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold transition-all shadow-sm ${isExporting ? 'bg-slate-50 text-slate-300' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}<span className="text-[9px] uppercase tracking-widest font-black">Export PDF</span></button>
            </div>
          )}
        </div>
      </div>

      {shareUrl && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-between no-print animate-in slide-in-from-top-2">
           <div className="flex items-center gap-3">
              <LinkIcon className="w-4 h-4 text-green-600" />
              <p className="text-[10px] font-black uppercase text-green-700">Live: {shareUrl}</p>
           </div>
           <button onClick={() => { navigator.clipboard.writeText(shareUrl); alert("Copied!"); }} className="flex items-center gap-2 px-4 py-1.5 bg-green-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow hover:bg-green-700 transition-all">
             <Copy className="w-3 h-3" /> Copy
           </button>
        </div>
      )}

      <div id="worksheet-content" className={`max-w-[210mm] mx-auto p-[15mm] shadow-2xl min-h-[297mm] relative transition-all duration-300 ${themeClasses.body} ${themeClasses.container} border border-slate-100 print:shadow-none overflow-hidden antialiased`}>
        {worksheet.backgroundImage && (
          <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.05] print:opacity-[0.08]">
            <img src={worksheet.backgroundImage} className="w-[85%] h-auto object-contain grayscale" />
          </div>
        )}

        <div className="relative z-10">
          <div className={`border-b-4 ${themeClasses.accent} pb-6 mb-10`}>
            <div className="flex justify-between items-start mb-8">
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-4">
                  <Landmark className={`w-8 h-8 ${themeClasses.accentText}`} />
                  <EditableField value={worksheet.institutionName || "NAME OF INSTITUTION"} onSave={(v: any) => handleUpdate({...worksheet, institutionName: v})} className={`text-2xl ${themeClasses.header} uppercase tracking-tight text-slate-900`} />
                </div>
                <div className="flex flex-wrap gap-x-8 gap-y-2">
                   <div className="flex items-center gap-2">
                      <EditableField value={worksheet.standardReference || "STANDARD ALIGNMENT"} onSave={(v: any) => handleUpdate({...worksheet, standardReference: v})} className="text-[9px] font-black text-slate-500 uppercase tracking-widest" />
                   </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`inline-block px-3 py-1 text-[9px] font-black uppercase tracking-widest mb-2 text-white ${themeClasses.accentBg}`}>{worksheet.documentType}</div>
                <h1 className={`text-4xl ${themeClasses.header} text-slate-900 uppercase leading-none tracking-tighter`}>
                  <EditableField value={worksheet.title} onSave={(v: any) => handleUpdate({...worksheet, title: v})} />
                </h1>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-8 mt-10">
              <div className={`col-span-2 border-b-2 ${themeClasses.accent} pb-2`}>
                <span className="text-[9px] font-black uppercase text-slate-300 mb-1 block">Student Name:</span>
              </div>
              <div className={`border-2 ${themeClasses.accent} p-4 text-center ${themeClasses.itemBg}`}>
                <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Mark</span>
                <div className="text-3xl font-black text-slate-100">___ / {worksheet.questions.reduce((sum, q) => sum + (q.points || 0), 0)}</div>
              </div>
            </div>
          </div>

          <div className={`mb-12 p-6 border-l-4 ${themeClasses.accent} text-sm text-slate-700 bg-slate-50/50 flex justify-between items-start`}>
            <div className="flex-1">
              <EditableField multiline value={worksheet.topic || "Instruction section"} onSave={(v: any) => handleUpdate({...worksheet, topic: v})} isMath={isMathMode} />
            </div>
            <button 
              onClick={() => handleSpeech('intro', worksheet.topic || "Instruction section")}
              className={`no-print p-2 rounded-lg transition-all ${activeSpeechId === 'intro' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 hover:text-blue-600'}`}
            >
              {activeSpeechId === 'intro' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />}
            </button>
          </div>

          <div className="space-y-16 relative">
            {worksheet.questions.map((q, idx) => (
              <div key={q.id} className="relative group/q">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-8 h-8 flex items-center justify-center font-black text-xs flex-shrink-0 text-white ${themeClasses.rounded} ${themeClasses.accentBg}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="mb-2 flex items-center justify-between">
                        <EditableField value={q.sectionInstruction || ""} onSave={(v: any) => updateQuestion(q.id, {sectionInstruction: v})} className="text-[9px] font-black uppercase text-slate-300 tracking-widest italic" />
                      </div>
                      <EditableField multiline value={q.question} onSave={(v: any) => updateQuestion(q.id, {question: v})} className={`text-xl font-bold text-slate-900 leading-tight block`} isMath={true} />
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <span className="text-[9px] font-black text-slate-200 uppercase block">Pts</span>
                    <EditableField value={String(q.points || 0)} onSave={(v: any) => updateQuestion(q.id, {points: parseInt(v) || 0})} className="font-black text-slate-900 w-8 text-center" />
                  </div>
                </div>

                <div className="ml-12 mt-6">
                  {q.type === QuestionType.MCQ && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {q.options?.map((opt, i) => (
                        <div key={i} className={`flex items-center gap-3 p-3 border border-slate-100 ${themeClasses.rounded} ${showKey && opt === q.correctAnswer ? 'bg-red-50 border-red-100' : 'bg-white'}`}>
                          <div className={`w-5 h-5 border border-slate-900 flex items-center justify-center flex-shrink-0 ${themeClasses.rounded} ${showKey && opt === q.correctAnswer ? 'bg-red-600 border-red-600 text-white' : ''}`}>
                            {showKey && opt === q.correctAnswer && <Check className="w-3 h-3" />}
                          </div>
                          <EditableField value={opt} onSave={(v: any) => { const newOpts = [...(q.options || [])]; newOpts[i] = v; updateQuestion(q.id, {options: newOpts}); }} className={`text-sm font-bold block ${showKey && opt === q.correctAnswer ? 'text-red-700' : 'text-slate-700'}`} isMath={true} />
                        </div>
                      ))}
                    </div>
                  )}
                  {q.type === QuestionType.SHORT_ANSWER && <div className="space-y-4"> {[...Array(2)].map((_, i) => <div key={i} className="border-b border-slate-100 h-10 flex items-end"> {showKey && i === 0 && <span className="text-red-600 font-bold ml-4"><LatexRenderer content={q.correctAnswer} /></span>} </div> )} </div>}
                </div>
              </div>
            ))}
          </div>

          <div className={`mt-32 pt-8 border-t-2 ${themeClasses.accent} flex justify-between items-end opacity-20`}>
             <div className="text-[9px] font-black uppercase tracking-widest text-slate-800">Standard Alignment Verified</div>
             <div className="text-right text-[7px] font-bold uppercase">TM-PRO-GENERATED</div>
          </div>
        </div>
      </div>
    </div>
  );
};
