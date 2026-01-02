
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
      
      // Update worksheet record with share URL if it exists
      if (worksheet.id) {
        await supabase.from('worksheets').update({ share_url: url }).eq('id', worksheet.id);
      }

      navigator.clipboard.writeText(url);
    } catch (error) {
      console.error("Sharing failed", error);
      alert("Failed to generate share link. Check storage permissions.");
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

  const moveQuestion = (idx: number, direction: 'up' | 'down') => {
    const newQuestions = [...worksheet.questions];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newQuestions.length) return;
    [newQuestions[idx], newQuestions[targetIdx]] = [newQuestions[targetIdx], newQuestions[idx]];
    handleUpdate({ ...worksheet, questions: newQuestions });
  };

  const removeQuestion = (id: string) => {
    handleUpdate({ ...worksheet, questions: worksheet.questions.filter(q => q.id !== id) });
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
      case ThemeType.CREATIVE: return { body: 'font-handwriting-body', header: 'font-handwriting-header', accent: 'border-slate-900', accentBg: 'bg-slate-900', accentText: 'text-slate-900', container: 'bg-white', itemBg: 'bg-white/90', rounded: 'rounded-[1.5rem]' };
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
    <div className="relative group/ws">
      <div className="absolute -top-16 left-0 right-0 flex justify-between items-center no-print px-4 py-2 bg-white/80 backdrop-blur rounded-2xl border border-slate-200 shadow-sm z-[60]">
        <div className="flex gap-4 items-center">
          <button onClick={() => setIsBuilderMode(!isBuilderMode)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${isBuilderMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{isBuilderMode ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}{isBuilderMode ? 'Finish' : 'Edit Mode'}</button>
          
          <div className="flex items-center gap-2 border-l pl-4 border-slate-200">
            <button onClick={handleShare} disabled={isSharing} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all shadow-md active:scale-95 ${isSharing ? 'bg-slate-100 text-slate-400' : 'bg-green-600 text-white hover:bg-green-700'}`}>
              {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              <span className="text-[10px] uppercase tracking-widest font-black">{shareUrl ? 'Link Copied!' : 'Share to Supabase'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 border-l pl-4 border-slate-200">
            <Palette className="w-4 h-4 text-slate-400" />
            <select value={currentTheme} onChange={(e) => setCurrentTheme(e.target.value as ThemeType)} className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-0 cursor-pointer">
              <option value={ThemeType.ACADEMIC}>Academic Style</option>
              <option value={ThemeType.CREATIVE}>Creative Style</option>
              <option value={ThemeType.CLASSIC}>Classic Style</option>
              <option value={ThemeType.MODERN}>Modern Style</option>
            </select>
          </div>
          <div className="flex items-center gap-2 border-l pl-4 border-slate-200">
            <button onClick={() => bgInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-all shadow-sm"><ImagePlus className="w-4 h-4 text-blue-500" /><span className="text-[10px] uppercase tracking-widest font-black hidden lg:inline">Image</span></button>
            <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={handleBackgroundImageUpload} />
          </div>
          {!isBuilderMode && (
            <div className="flex items-center gap-2 border-l pl-4 border-slate-200">
              <button onClick={handleExportPDF} disabled={isExporting} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all shadow-md active:scale-95 ${isExporting ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}<span className="text-[10px] uppercase tracking-widest font-black">Download PDF</span></button>
            </div>
          )}
          {isBuilderMode && (
             <div className="flex gap-2 border-l pl-4 border-slate-200">
                <button onClick={() => addQuestion(QuestionType.MCQ)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"><CheckSquare className="w-4 h-4" /></button>
                <button onClick={() => addQuestion(QuestionType.SHORT_ANSWER)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"><Type className="w-4 h-4" /></button>
             </div>
          )}
        </div>
      </div>

      {shareUrl && (
        <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-2xl flex items-center justify-between no-print animate-in slide-in-from-top-4 duration-300">
           <div className="flex items-center gap-3">
              <LinkIcon className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-[10px] font-black uppercase text-green-700">Worksheet Published to Supabase</p>
                <p className="text-xs font-medium text-green-900 truncate max-w-sm">{shareUrl}</p>
              </div>
           </div>
           <button onClick={() => { navigator.clipboard.writeText(shareUrl); alert("Copied!"); }} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-green-700 transition-all">
             <Copy className="w-3.5 h-3.5" /> Copy Link
           </button>
        </div>
      )}

      <div id="worksheet-content" className={`max-w-[210mm] mx-auto p-[15mm] shadow-2xl min-h-[297mm] relative transition-all duration-300 ${themeClasses.body} ${themeClasses.container} border-x border-slate-200 print:shadow-none overflow-hidden`}>
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
                      <BookMarked className="w-3.5 h-3.5 text-blue-500" />
                      <EditableField value={worksheet.standardReference || "STANDARD ALIGNMENT"} onSave={(v: any) => handleUpdate({...worksheet, standardReference: v})} className="text-[10px] font-black text-slate-700 uppercase" />
                   </div>
                   <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <EditableField value={worksheet.instructorName || "INSTRUCTOR"} onSave={(v: any) => handleUpdate({...worksheet, instructorName: v})} className="text-xs font-bold text-slate-600" />
                   </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`inline-block px-4 py-1 text-[10px] font-black uppercase tracking-[0.3em] mb-2 text-white ${themeClasses.accentBg}`}>{worksheet.documentType}</div>
                <h1 className={`text-4xl ${themeClasses.header} text-slate-900 uppercase leading-none tracking-tighter`}>
                  <EditableField value={worksheet.title} onSave={(v: any) => handleUpdate({...worksheet, title: v})} />
                </h1>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-8 mt-10">
              <div className={`col-span-2 border-b-2 ${themeClasses.accent} pb-2 flex flex-col justify-end`}>
                <span className="text-[10px] font-black uppercase text-slate-400 mb-1">Student Name:</span>
                <div className="text-slate-200 text-sm opacity-30">____________________________________________________</div>
              </div>
              <div className={`border-2 ${themeClasses.accent} p-4 text-center ${themeClasses.itemBg}`}>
                <span className="text-[10px] font-black uppercase text-slate-500 block mb-1">Mark</span>
                <div className="text-3xl font-black text-slate-200">___ / {worksheet.questions.reduce((sum, q) => sum + (q.points || 0), 0)}</div>
              </div>
            </div>
          </div>

          <div className={`mb-12 p-6 border-l-4 ${themeClasses.accent} italic text-sm text-slate-700 ${themeClasses.itemBg} flex justify-between items-start`}>
            <div className="flex-1">
              <EditableField multiline value={worksheet.topic || "Please read questions carefully."} onSave={(v: any) => handleUpdate({...worksheet, topic: v})} isMath={isMathMode} />
            </div>
            <button 
              onClick={() => handleSpeech('intro', worksheet.topic || "Instruction section")}
              className={`no-print p-2 rounded-xl transition-all ${activeSpeechId === 'intro' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 hover:text-blue-600'}`}
              title="Listen to Instructions"
            >
              {activeSpeechId === 'intro' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          <div className="space-y-16 relative">
            {worksheet.questions.map((q, idx) => (
              <div key={q.id} className="relative group/q">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-10 h-10 flex items-center justify-center font-black text-sm flex-shrink-0 text-white ${themeClasses.rounded} ${themeClasses.accentBg}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="mb-2 flex items-center justify-between">
                        <EditableField value={q.sectionInstruction || ""} onSave={(v: any) => updateQuestion(q.id, {sectionInstruction: v})} className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic" />
                        <button 
                          onClick={() => handleSpeech(q.id, q.question)}
                          className={`no-print p-1.5 rounded-lg transition-all ${activeSpeechId === q.id ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-300 hover:text-blue-500'}`}
                          title="Read Question Aloud"
                        >
                          {activeSpeechId === q.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />}
                        </button>
                      </div>
                      <EditableField multiline value={q.question} onSave={(v: any) => updateQuestion(q.id, {question: v})} className={`text-xl font-bold text-slate-900 leading-tight block`} isMath={true} />
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <span className="text-[10px] font-black text-slate-300 uppercase block">Points</span>
                    <EditableField value={String(q.points || 0)} onSave={(v: any) => updateQuestion(q.id, {points: parseInt(v) || 0})} className="font-black text-slate-900 w-12 text-center" />
                  </div>
                </div>

                <div className="ml-14 mt-6">
                  {q.type === QuestionType.MCQ && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {q.options?.map((opt, i) => (
                        <div key={i} className={`flex items-center gap-3 p-3 border-2 border-slate-100 ${themeClasses.rounded} ${showKey && opt === q.correctAnswer ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                          <div className={`w-6 h-6 border-2 border-slate-900 flex items-center justify-center flex-shrink-0 ${themeClasses.rounded} ${showKey && opt === q.correctAnswer ? 'bg-red-600 border-red-600 text-white' : ''}`}>
                            {showKey && opt === q.correctAnswer && <Check className="w-4 h-4" />}
                          </div>
                          <EditableField value={opt} onSave={(v: any) => { const newOpts = [...(q.options || [])]; newOpts[i] = v; updateQuestion(q.id, {options: newOpts}); }} className={`text-sm font-bold block ${showKey && opt === q.correctAnswer ? 'text-red-700' : 'text-slate-700'}`} isMath={true} />
                        </div>
                      ))}
                    </div>
                  )}
                  {q.type === QuestionType.SHORT_ANSWER && <div className="space-y-4"> {[...Array(2)].map((_, i) => <div key={i} className="border-b border-slate-200 h-10 flex items-end"> {showKey && i === 0 && <span className="text-red-600 font-bold ml-4"><LatexRenderer content={q.correctAnswer} /></span>} </div> )} </div>}
                </div>
              </div>
            ))}
          </div>

          {worksheet.groundingSources && worksheet.groundingSources.length > 0 && (
            <div className={`mt-24 p-8 border-2 border-dashed ${themeClasses.accent} rounded-3xl bg-slate-50 no-print`}>
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheck className="w-6 h-6 text-green-600" />
                <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900">Perplexity Verified Sources</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {worksheet.groundingSources.map((src, i) => (
                  <a key={i} href={src.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 hover:border-blue-500 transition-all group shadow-sm">
                    <div className="p-2 bg-blue-50 rounded-xl group-hover:bg-blue-600 transition-colors">
                      <LinkIcon className="w-4 h-4 text-blue-600 group-hover:text-white" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">{new URL(src.uri).hostname}</p>
                      <p className="text-xs font-bold text-slate-800 truncate">{src.title}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className={`mt-32 pt-8 border-t-4 ${themeClasses.accent} flex justify-between items-end opacity-40`}>
             <div className="text-[10px] font-black uppercase tracking-widest text-slate-800">Standard: {worksheet.curriculumStandard} Aligned • TM-PRO-{(worksheet.id || '0000').slice(-4).toUpperCase()}</div>
             <div className="text-right text-[8px] font-bold uppercase">Academic Integrity Verified Content</div>
          </div>
        </div>
      </div>
    </div>
  );
};
