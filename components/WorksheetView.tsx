
import React, { useState, useEffect, useRef } from 'react';
import { Worksheet, QuestionType, ThemeType, Question } from '../types';
import { LatexRenderer } from './LatexRenderer';
import { generateSpeech } from '../services/geminiService';
import { uploadFile, getPublicUrl, supabase } from '../services/supabaseClient';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  Trash2, Edit3, Check, Landmark, Printer, Loader2, Link as LinkIcon, Share2, Volume2, Copy, GripVertical, Image as ImageIcon, PlusCircle, Sparkles
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
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
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
    return <span onClick={() => setEditing(true)} className={`cursor-text hover:bg-slate-50 transition-colors p-1 rounded border border-transparent hover:border-slate-200 block min-w-[20px] ${className} ${!value ? 'text-slate-400 italic font-bold' : ''}`}>{isMath ? <LatexRenderer content={value || placeholder} /> : (value || placeholder)}</span>;
  };

  return (
    <div className="relative group/ws antialiased">
      <div className="absolute -top-16 left-0 right-0 flex justify-between items-center no-print px-6 py-3 bg-white border border-slate-200 shadow-sm z-[60] rounded-2xl">
        <div className="flex gap-4 items-center">
          <button onClick={() => setIsBuilderMode(!isBuilderMode)} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold transition-all ${isBuilderMode ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{isBuilderMode ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}{isBuilderMode ? 'Finish' : 'Edit'}</button>
          
          {isBuilderMode && (
             <button onClick={distributePoints} className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"><Sparkles className="w-4 h-4" /> Auto Marks</button>
          )}

          <div className="flex items-center gap-2 border-l pl-4 border-slate-100">
            <select value={currentTheme} onChange={(e) => setCurrentTheme(e.target.value as ThemeType)} className="bg-transparent border-none text-[9px] font-black uppercase tracking-widest text-slate-700 focus:ring-0 cursor-pointer">
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
                  className={`w-20 h-20 border-2 border-dashed rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden group/logo relative ${worksheet.logoUrl ? 'border-transparent' : 'border-slate-200 hover:border-slate-400'}`}
                >
                  <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  {worksheet.logoUrl ? (
                    <>
                      <img src={worksheet.logoUrl} className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/logo:opacity-100 flex items-center justify-center transition-opacity no-print"><Edit3 className="text-white w-5 h-5" /></div>
                    </>
                  ) : (
                    <div className="text-center no-print">
                      <ImageIcon className="w-6 h-6 text-slate-300 mx-auto" />
                      <span className="text-[7px] font-black uppercase text-slate-400 mt-1 block">Add Logo</span>
                    </div>
                  )}
                  {!worksheet.logoUrl && <Landmark className="w-10 h-10 text-slate-100 absolute pointer-events-none print:hidden" />}
                </div>

                <div className="space-y-4 flex-1">
                  <EditableField value={worksheet.institutionName || "NAME OF INSTITUTION"} onSave={(v: any) => handleUpdate({...worksheet, institutionName: v})} className={`text-2xl ${themeClasses.header} uppercase tracking-tight text-slate-900`} />
                  <EditableField value={worksheet.standardReference || "STANDARD ALIGNMENT REFERENCE"} onSave={(v: any) => handleUpdate({...worksheet, standardReference: v})} className="text-[9px] font-black text-slate-600 uppercase tracking-widest block" />
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
                <span className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Student Name / ID:</span>
              </div>
              <div className={`border-2 ${themeClasses.accent} p-4 text-center ${themeClasses.itemBg}`}>
                <span className="text-[9px] font-black uppercase text-slate-600 block mb-1">Total Marks</span>
                <div className="text-3xl font-black text-slate-900">___ / {totalPoints}</div>
              </div>
            </div>
          </div>

          <div className={`mb-12 p-6 border-l-4 ${themeClasses.accent} text-sm text-slate-800 bg-slate-50/50 flex justify-between items-start`}>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2">Instructions & Context:</p>
              <EditableField multiline value={worksheet.topic || "Please read all questions carefully before answering."} onSave={(v: any) => handleUpdate({...worksheet, topic: v})} isMath={isMathMode} className="font-bold leading-relaxed" />
            </div>
            <button onClick={() => handleSpeech('intro', worksheet.topic || "")} className="no-print p-2 rounded-lg bg-slate-100 text-slate-600 hover:text-blue-600 transition-all"><Volume2 className="w-3 h-3" /></button>
          </div>

          <div className="space-y-16">
            {worksheet.questions.map((q, idx) => (
              <div key={q.id} className="relative group/q">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-8 h-8 flex items-center justify-center font-black text-xs flex-shrink-0 text-white ${themeClasses.rounded} ${themeClasses.accentBg}`}>{idx + 1}</div>
                    <div className="flex-1">
                      <div className="mb-2 flex items-center justify-between">
                        <EditableField value={q.sectionInstruction || "Section Direction"} onSave={(v: any) => updateQuestion(q.id, {sectionInstruction: v})} className="text-[9px] font-black uppercase text-slate-600 tracking-widest italic" />
                        {isBuilderMode && <button onClick={() => handleUpdate({...worksheet, questions: worksheet.questions.filter(qu => qu.id !== q.id)})} className="no-print p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>}
                      </div>
                      <EditableField multiline value={q.question} onSave={(v: any) => updateQuestion(q.id, {question: v})} className="text-xl font-bold text-slate-900 leading-tight block" isMath={true} />
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <span className="text-[9px] font-black text-slate-500 uppercase block">Marks</span>
                    <EditableField value={String(q.points || 0)} onSave={(v: any) => updateQuestion(q.id, {points: parseInt(v) || 0})} className="font-black text-slate-900 w-8 text-center" />
                  </div>
                </div>

                <div className="ml-12 mt-6">
                  {q.type === QuestionType.MCQ && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {q.options?.map((opt, i) => (
                        <div key={i} className={`flex items-center gap-3 p-3 border border-slate-200 ${themeClasses.rounded} bg-white`}>
                          <div className={`w-5 h-5 border-2 border-slate-900 rounded-full flex-shrink-0 ${showKey && opt === q.correctAnswer ? 'bg-slate-900' : ''}`} />
                          <EditableField value={opt} onSave={(v: any) => { const n = [...(q.options||[])]; n[i]=v; updateQuestion(q.id, {options: n}); }} className={`text-sm font-bold ${showKey && opt === q.correctAnswer ? 'text-red-600' : 'text-slate-800'}`} isMath={true} />
                        </div>
                      ))}
                    </div>
                  )}
                  {(q.type === QuestionType.SHORT_ANSWER || q.type === QuestionType.VOCABULARY) && (
                    <div className="space-y-4">
                      <div className="border-b-2 border-slate-100 h-10 w-full" />
                      {showKey && <div className="text-red-600 text-sm font-bold mt-2">Correct Response: <LatexRenderer content={q.correctAnswer} /></div>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className={`mt-32 pt-8 border-t-2 ${themeClasses.accent} flex justify-between items-end opacity-40`}>
             <div className="text-[9px] font-black uppercase tracking-widest text-slate-900">Academic Standard Certification</div>
             <div className="text-right text-[7px] font-black uppercase tracking-wider text-slate-900">Generated for professional institutional use</div>
          </div>
        </div>
      </div>
    </div>
  );
};
