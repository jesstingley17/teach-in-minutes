
import React, { useState, useEffect, useRef } from 'react';
import { Worksheet, QuestionType, ThemeType, Question } from '../types';
import { LatexRenderer } from './LatexRenderer';
import { generateSpeech } from '../services/geminiService';
import { uploadFile, getPublicUrl, supabase } from '../services/supabaseClient';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  Trash2, Edit3, Check, Landmark, Printer, Loader2, Link as LinkIcon, Share2, Volume2, Copy, GripVertical, Image as ImageIcon, PlusCircle, Sparkles, BookOpen, FileText
} from 'lucide-react';

interface WorksheetViewProps {
  worksheet: Worksheet;
  theme: ThemeType;
  showKey?: boolean;
  isMathMode?: boolean;
  onUpdate?: (worksheet: Worksheet) => void;
}

export const WorksheetView: React.FC<WorksheetViewProps> = ({ 
  worksheet: initialWorksheet, 
  theme: initialTheme, 
  showKey = false, 
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
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setWorksheet(initialWorksheet); }, [initialWorksheet]);

  const handleUpdate = (newWs: Worksheet) => {
    setWorksheet(newWs);
    if (onUpdate) onUpdate(newWs);
  };

  const handleSpeech = async (id: string, text: string) => {
    setActiveSpeechId(id);
    await generateSpeech(text);
    setActiveSpeechId(null);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => handleUpdate({ ...worksheet, logoUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  const totalPoints = worksheet.questions.reduce((sum, q) => sum + (q.points || 0), 0);

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
      if (worksheet.id) await supabase.from('worksheets').update({ share_url: url }).eq('id', worksheet.id);
      navigator.clipboard.writeText(url);
    } catch (error) { alert("Sharing failed."); } finally { setIsSharing(false); }
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
    } finally { setIsExporting(false); }
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    handleUpdate({
      ...worksheet,
      questions: worksheet.questions.map(q => q.id === id ? { ...q, ...updates } : q)
    });
  };

  const distributePoints = () => {
    const pts = prompt("Enter points per question:", "5");
    if (pts) {
      handleUpdate({
        ...worksheet,
        questions: worksheet.questions.map(q => ({ ...q, points: parseInt(pts) }))
      });
    }
  };

  const themeClasses = (() => {
    switch (currentTheme) {
      case ThemeType.CREATIVE: return { body: 'font-handwriting-body', header: 'font-handwriting-header', accent: 'border-slate-900', accentBg: 'bg-slate-900', accentText: 'text-slate-900', container: 'bg-white', itemBg: 'bg-white', rounded: 'rounded-[1.5rem]' };
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
    return <span onClick={() => setEditing(true)} className={`cursor-text hover:bg-slate-50 transition-colors p-1 rounded border border-transparent hover:border-slate-200 block min-w-[20px] ${className} ${!value ? 'text-slate-900 font-black' : ''}`}>{isMath ? <LatexRenderer content={value || placeholder} /> : (value || placeholder)}</span>;
  };

  return (
    <div className="relative group/ws antialiased">
      <div className="absolute -top-16 left-0 right-0 flex justify-between items-center no-print px-6 py-3 bg-white border border-slate-200 shadow-sm z-[60] rounded-2xl">
        <div className="flex gap-4 items-center">
          <button onClick={() => setIsBuilderMode(!isBuilderMode)} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold transition-all ${isBuilderMode ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{isBuilderMode ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}{isBuilderMode ? 'Finish' : 'Edit Content'}</button>
          
          {isBuilderMode && (
             <button onClick={distributePoints} className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold bg-slate-100 text-slate-900 hover:bg-slate-200 transition-all border border-slate-200"><Sparkles className="w-4 h-4" /> Auto Marks</button>
          )}

          <div className="flex items-center gap-2 border-l pl-4 border-slate-100">
            <select value={currentTheme} onChange={(e) => setCurrentTheme(e.target.value as ThemeType)} className="bg-transparent border-none text-[9px] font-black uppercase tracking-widest text-slate-900 focus:ring-0 cursor-pointer">
              <option value={ThemeType.ACADEMIC}>Academic Style</option>
              <option value={ThemeType.CREATIVE}>Creative Style</option>
              <option value={ThemeType.MODERN}>Modern Style</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2 border-l pl-4 border-slate-100">
            <button onClick={handleExportPDF} disabled={isExporting} className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-50">
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              <span className="text-[9px] uppercase tracking-widest font-black">Export PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div id="worksheet-content" className={`max-w-[210mm] mx-auto p-[15mm] shadow-2xl min-h-[297mm] relative transition-all duration-300 ${themeClasses.body} ${themeClasses.container} border border-slate-100 print:shadow-none overflow-hidden antialiased`}>
        <div className="relative z-10">
          <div className={`border-b-4 ${themeClasses.accent} pb-6 mb-10`}>
            <div className="flex justify-between items-start mb-8">
              <div className="flex gap-6 flex-1">
                <div 
                  onClick={() => logoInputRef.current?.click()} 
                  className={`w-24 h-24 border-2 border-dashed rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden group/logo relative ${worksheet.logoUrl ? 'border-transparent' : 'border-slate-900 bg-slate-50'}`}
                >
                  <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  {worksheet.logoUrl ? (
                    <>
                      <img src={worksheet.logoUrl} className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/logo:opacity-100 flex items-center justify-center transition-opacity no-print"><Edit3 className="text-white w-5 h-5" /></div>
                    </>
                  ) : (
                    <div className="text-center no-print">
                      <ImageIcon className="w-8 h-8 text-slate-900 mx-auto" />
                      <span className="text-[8px] font-black uppercase text-slate-900 mt-1 block">Logo</span>
                    </div>
                  )}
                  {!worksheet.logoUrl && <Landmark className="w-10 h-10 text-slate-200 absolute pointer-events-none print:hidden" />}
                </div>

                <div className="space-y-4 flex-1">
                   <div className="relative group/name">
                      {isBuilderMode && <div className="absolute -left-6 top-1.5 no-print"><Edit3 className="w-3 h-3 text-blue-500" /></div>}
                      <EditableField value={worksheet.institutionName || "NAME OF INSTITUTION"} onSave={(v: any) => handleUpdate({...worksheet, institutionName: v})} className={`text-2xl ${themeClasses.header} uppercase tracking-tight text-slate-900 block`} />
                   </div>
                   <div className="relative group/std">
                      {isBuilderMode && <div className="absolute -left-6 top-0 no-print"><Edit3 className="w-3 h-3 text-blue-500" /></div>}
                      <EditableField value={worksheet.standardReference || "STANDARD ALIGNMENT REFERENCE"} onSave={(v: any) => handleUpdate({...worksheet, standardReference: v})} className="text-[10px] font-black text-slate-900 uppercase tracking-widest block" />
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
                <span className="text-[10px] font-black uppercase text-slate-900 mb-1 block">Student Name / ID:</span>
              </div>
              <div className={`border-2 ${themeClasses.accent} p-4 text-center ${themeClasses.itemBg}`}>
                <span className="text-[10px] font-black uppercase text-slate-900 block mb-1">Total Marks</span>
                <div className="text-3xl font-black text-slate-900">___ / {totalPoints}</div>
              </div>
            </div>
          </div>

          <div className={`mb-12 p-6 border-l-4 ${themeClasses.accent} text-sm text-slate-900 bg-slate-50 flex justify-between items-start`}>
            <div className="flex-1">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-900 mb-2 underline decoration-2 decoration-slate-300">Administrative Instructions:</p>
              <EditableField multiline value={worksheet.topic || "Please read all questions carefully before answering."} onSave={(v: any) => handleUpdate({...worksheet, topic: v})} isMath={isMathMode} className="font-bold leading-relaxed text-slate-900" />
            </div>
            <button onClick={() => handleSpeech('intro', worksheet.topic || "")} className="no-print p-2 rounded-lg bg-white border border-slate-200 text-slate-900 hover:text-blue-600 shadow-sm transition-all ml-4"><Volume2 className="w-4 h-4" /></button>
          </div>

          <div className="space-y-16">
            {worksheet.questions.map((q, idx) => (
              <div key={q.id} className="relative group/q">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-8 h-8 flex items-center justify-center font-black text-xs flex-shrink-0 text-white shadow-sm ${themeClasses.rounded} ${themeClasses.accentBg}`}>{idx + 1}</div>
                    <div className="flex-1">
                      <div className="mb-2 flex items-center justify-between">
                        <EditableField value={q.sectionInstruction || "Section Direction"} onSave={(v: any) => updateQuestion(q.id, {sectionInstruction: v})} className="text-[10px] font-black uppercase text-slate-900 tracking-widest italic" />
                        {isBuilderMode && <button onClick={() => handleUpdate({...worksheet, questions: worksheet.questions.filter(qu => qu.id !== q.id)})} className="no-print p-1 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                      </div>
                      <EditableField multiline value={q.question} onSave={(v: any) => updateQuestion(q.id, {question: v})} className="text-xl font-bold text-slate-900 leading-tight block" isMath={true} />
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <span className="text-[10px] font-black text-slate-900 uppercase block">Marks</span>
                    <div className="flex items-center gap-1">
                      {isBuilderMode && <Edit3 className="w-3 h-3 text-blue-500 no-print" />}
                      <EditableField value={String(q.points || 0)} onSave={(v: any) => updateQuestion(q.id, {points: parseInt(v) || 0})} className="font-black text-slate-900 w-10 text-center text-lg" />
                    </div>
                  </div>
                </div>

                <div className="ml-12 mt-6">
                  {q.type === QuestionType.MCQ && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {q.options?.map((opt, i) => (
                        <div key={i} className={`flex items-center gap-3 p-4 border-2 border-slate-200 ${themeClasses.rounded} bg-white shadow-sm`}>
                          <div className={`w-6 h-6 border-2 border-slate-900 rounded-full flex-shrink-0`} />
                          <EditableField value={opt} onSave={(v: any) => { const n = [...(q.options||[])]; n[i]=v; updateQuestion(q.id, {options: n}); }} className={`text-base font-bold text-slate-900`} isMath={true} />
                        </div>
                      ))}
                    </div>
                  )}
                  {(q.type === QuestionType.SHORT_ANSWER || q.type === QuestionType.VOCABULARY || q.type === QuestionType.ESSAY) && (
                    <div className="space-y-6">
                      <div className="border-b-2 border-slate-200 h-10 w-full" />
                      {(q.type === QuestionType.ESSAY || q.type === QuestionType.SHORT_ANSWER) && <div className="border-b-2 border-slate-100 h-10 w-full opacity-50" />}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className={`mt-32 pt-8 border-t-2 ${themeClasses.accent} flex justify-between items-end opacity-40`}>
             <div className="text-[10px] font-black uppercase tracking-widest text-slate-900">Academic Standard Certification</div>
             <div className="text-right text-[8px] font-black uppercase tracking-wider text-slate-900">Generated for professional institutional use</div>
          </div>
        </div>

        {/* Dedicated Answer Key Section - Only shows when toggle is on */}
        {showKey && (
          <div className="mt-20 pt-20 border-t-4 border-double border-slate-300 relative z-10 page-break-before">
             <div className="flex items-center gap-4 mb-10">
                <BookOpen className="w-10 h-10 text-red-600" />
                <h2 className="text-5xl font-black uppercase tracking-tighter text-red-600">Teacher's Reference</h2>
             </div>
             
             <div className="bg-red-50/30 p-8 rounded-[2rem] border-2 border-red-100 space-y-12">
                {worksheet.questions.map((q, idx) => (
                  <div key={`key-${q.id}`} className="space-y-4">
                     <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center font-black text-xs">{idx + 1}</span>
                        <p className="text-sm font-bold text-slate-700 truncate max-w-md">{q.question.replace(/[$]/g, '')}</p>
                     </div>
                     <div className="ml-11">
                        <div className="p-4 bg-white border-2 border-red-200 rounded-2xl shadow-sm">
                           <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1">Validated Solution:</p>
                           <p className="text-xl font-black text-slate-900"><LatexRenderer content={q.correctAnswer} /></p>
                        </div>
                        {q.explanation && (
                          <div className="mt-4 p-4 bg-white/50 border border-slate-100 rounded-2xl">
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Pedagogical Rationale:</p>
                             <p className="text-sm font-medium text-slate-700 leading-relaxed"><LatexRenderer content={q.explanation} /></p>
                          </div>
                        )}
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>

      {isBuilderMode && (
        <div className="mt-12 p-10 border-4 border-dashed border-slate-200 rounded-[3rem] bg-slate-50/50 flex flex-wrap gap-4 justify-center no-print animate-in zoom-in">
           <div className="w-full text-center mb-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Append Assessment Objects</h4>
           </div>
           <button onClick={() => {
              const newQ: Question = { id: Math.random().toString(36).substr(2, 9), type: QuestionType.MCQ, sectionInstruction: "Select the best answer:", question: "New Question...", options: ["Option A", "Option B", "Option C"], correctAnswer: "Option A", explanation: "Rationale here...", isChallenge: false, points: 5 };
              handleUpdate({...worksheet, questions: [...worksheet.questions, newQ]});
           }} className="flex items-center gap-3 px-8 py-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-blue-500 transition-all shadow-sm"><PlusCircle className="w-5 h-5 text-blue-500" /> MCQ</button>
           
           <button onClick={() => {
              const newQ: Question = { id: Math.random().toString(36).substr(2, 9), type: QuestionType.SHORT_ANSWER, sectionInstruction: "Provide a concise response:", question: "New Question...", correctAnswer: "Expected Answer", explanation: "Rationale here...", isChallenge: false, points: 10 };
              handleUpdate({...worksheet, questions: [...worksheet.questions, newQ]});
           }} className="flex items-center gap-3 px-8 py-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-blue-500 transition-all shadow-sm"><PlusCircle className="w-5 h-5 text-blue-500" /> Open Ended</button>
        </div>
      )}
    </div>
  );
};
