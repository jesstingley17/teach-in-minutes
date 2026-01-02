
import React, { useState, useEffect, useRef } from 'react';
import { Worksheet, QuestionType, ThemeType, Question, AudienceCategory } from '../types';
import { LatexRenderer } from './LatexRenderer';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  Trash2, Edit3, Check, Landmark, Printer, Loader2, ShieldCheck, GraduationCap, Grid, Info, Scale, PenTool, QrCode
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

  useEffect(() => { setWorksheet(initialWorksheet); }, [initialWorksheet]);

  const handleUpdate = (newWs: Worksheet) => {
    setWorksheet(newWs);
    if (onUpdate) onUpdate(newWs);
  };

  const primaryColor = worksheet.visualMetadata?.primaryColor || '#0f172a';
  const isK12 = worksheet.audienceCategory && [
    AudienceCategory.EARLY_YEARS, 
    AudienceCategory.PRIMARY, 
    AudienceCategory.MIDDLE_SCHOOL, 
    AudienceCategory.HIGH_SCHOOL
  ].includes(worksheet.audienceCategory);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById('worksheet-content');
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      pdf.save(`${worksheet.title.replace(/\s+/g, '_')}_Final.pdf`);
    } finally { setIsExporting(false); }
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    handleUpdate({
      ...worksheet,
      questions: worksheet.questions.map(q => q.id === id ? { ...q, ...updates } : q)
    });
  };

  const EditableField = ({ value, onSave, className, multiline = false, placeholder = "", isMath = false }: any) => {
    const [local, setLocal] = useState(value);
    const [editing, setEditing] = useState(false);
    useEffect(() => setLocal(value), [value]);
    if (!isBuilderMode) return isMath ? <LatexRenderer content={value || placeholder} className={className} /> : <span className={className}>{value || placeholder}</span>;
    if (editing) return multiline ? <textarea autoFocus className={`w-full p-2 border-2 border-blue-400 rounded bg-blue-50 outline-none ${className}`} value={local} onChange={(e) => setLocal(e.target.value)} onBlur={() => { setEditing(false); onSave(local); }} /> : <input autoFocus className={`w-full p-1 border-2 border-blue-400 rounded bg-blue-50 outline-none ${className}`} value={local} onChange={(e) => setLocal(e.target.value)} onBlur={() => { setEditing(false); onSave(local); }} />;
    return <span onClick={() => setEditing(true)} className={`cursor-text transition-all p-1 rounded border-2 border-transparent hover:border-blue-100 hover:bg-blue-50 block ${className} ${!value ? 'text-slate-300 italic' : ''}`}>{isMath ? <LatexRenderer content={value || placeholder} /> : (value || placeholder)}</span>;
  };

  const totalPoints = worksheet.questions.reduce((sum, q) => sum + (q.points || 0), 0);

  return (
    <div className="relative antialiased pb-4 mt-8">
      {/* Control Bar */}
      <div className="absolute -top-12 left-0 right-0 flex justify-between items-center no-print px-4 py-2 bg-white border border-slate-100 rounded-xl shadow-sm z-[60]">
        <div className="flex gap-4 items-center">
          <button onClick={() => setIsBuilderMode(!isBuilderMode)} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${isBuilderMode ? 'bg-blue-600 text-white' : 'bg-slate-50 hover:bg-slate-100'}`}>
            {isBuilderMode ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            {isBuilderMode ? 'Commit Edits' : 'Architect Mode'}
          </button>
          <button onClick={handleExportPDF} disabled={isExporting} className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest bg-slate-900 text-white shadow-sm disabled:opacity-50">
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            Generate Final PDF
          </button>
        </div>
        <div className="text-[8px] font-black uppercase text-slate-300">Printer Optimized (Ink Saver Active)</div>
      </div>

      <div id="worksheet-content" className="max-w-[210mm] mx-auto min-h-[297mm] bg-white text-slate-900 overflow-hidden relative border border-slate-200 shadow-2xl">
        
        {/* Printer Friendly Header */}
        <div className="p-16 border-b-2 border-slate-900">
           <div className="flex justify-between items-start mb-12">
              <div className="space-y-4">
                 <div className="h-16 w-auto opacity-100 mb-6">
                    {worksheet.logoUrl ? (
                      <img src={worksheet.logoUrl} className="h-full w-auto object-contain" />
                    ) : (
                      <Landmark className="w-12 h-12" style={{ color: primaryColor }} />
                    )}
                 </div>
                 <h2 className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: primaryColor }}>{worksheet.institutionName || "Instructional Academy"}</h2>
              </div>
              <div className="text-right">
                 <div className="inline-flex flex-col items-end opacity-20 mb-4">
                    <QrCode className="w-12 h-12" />
                    <span className="text-[6px] font-black mt-1">REF: {worksheet.id}</span>
                 </div>
                 <div className="text-[9px] font-black uppercase tracking-widest opacity-40">Verification Hash: {worksheet.id?.slice(0, 8).toUpperCase()}</div>
              </div>
           </div>

           <div className="flex justify-between items-end gap-12">
              <div className="flex-1">
                 <div className="flex items-center gap-4 mb-3">
                    <span className="px-2 py-1 border border-slate-900 text-[8px] font-black uppercase tracking-widest">{worksheet.documentType}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-40">{worksheet.educationalLevel}</span>
                 </div>
                 <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">
                    <EditableField value={worksheet.title} onSave={(v: any) => handleUpdate({...worksheet, title: v})} />
                 </h1>
              </div>
              <div className="flex gap-10 text-right pb-1">
                 {!isK12 && (
                    <>
                       <div><p className="text-[7px] font-black uppercase tracking-widest opacity-40 mb-1">Module ID</p><p className="font-bold text-sm">{worksheet.courseCode || "UN-101"}</p></div>
                       <div><p className="text-[7px] font-black uppercase tracking-widest opacity-40 mb-1">Faculty</p><p className="font-bold text-sm">{worksheet.instructorName || "Lead"}</p></div>
                    </>
                 )}
                 {isK12 && (
                    <>
                       <div><p className="text-[7px] font-black uppercase tracking-widest opacity-40 mb-1">Grade</p><p className="font-bold text-sm uppercase">{worksheet.audienceCategory?.replace('_', ' ')}</p></div>
                       <div><p className="text-[7px] font-black uppercase tracking-widest opacity-40 mb-1">Subject</p><p className="font-bold text-sm uppercase">{worksheet.topic.split(' ')[0]}</p></div>
                    </>
                 )}
                 <div><p className="text-[7px] font-black uppercase tracking-widest opacity-40 mb-1">Weight</p><p className="font-black text-3xl" style={{ color: primaryColor }}>{totalPoints}</p></div>
              </div>
           </div>
        </div>

        {/* Content Body */}
        <div className="px-16 py-12 space-y-16">
           
           <div className="grid grid-cols-4 gap-12 border-b border-slate-100 pb-12">
              <div className="col-span-3">
                 <h3 className="text-[8px] font-black uppercase tracking-[0.2em] mb-4 text-slate-300">Mandate & Scope</h3>
                 <div className="text-sm leading-relaxed font-medium italic border-l-2 pl-6" style={{ borderColor: primaryColor }}>
                    <EditableField multiline value={worksheet.topic} onSave={(v: any) => handleUpdate({...worksheet, topic: v})} isMath={isMathMode} />
                 </div>
              </div>
              <div className="text-right flex flex-col justify-between">
                 <div>
                    <p className="text-[7px] font-black uppercase tracking-widest text-slate-300 mb-1">Session Duration</p>
                    <p className="text-xl font-black">{worksheet.duration || "Self-Paced"}</p>
                 </div>
                 <p className="text-[7px] font-black uppercase tracking-widest opacity-20">Secure Copy • Do Not Replicate</p>
              </div>
           </div>

           <div className="space-y-20">
              {worksheet.questions.map((q, idx) => (
                <div key={q.id} className={`group/q ${q.type === QuestionType.PAGE_BREAK ? 'py-12 border-y border-dashed border-slate-200 page-break-before' : ''}`}>
                   {q.type === QuestionType.PAGE_BREAK ? (
                      <div className="text-center opacity-10"><Scale className="w-8 h-8 mx-auto mb-2" /><span className="text-[8px] font-black uppercase tracking-[0.5em]">Instrument Break</span></div>
                   ) : (
                     <>
                        <div className="flex justify-between items-start mb-6">
                           <div className="flex gap-6 items-start flex-1">
                              <div className="w-10 h-10 border-2 border-slate-900 flex items-center justify-center font-black flex-shrink-0">
                                 <span className="text-lg">{idx + 1}</span>
                              </div>
                              <div className="flex-1 space-y-1">
                                 <div className="flex items-center gap-3">
                                    <span className="text-[7px] font-black uppercase tracking-widest opacity-30">{q.learningOutcome || "UNCLASSIFIED"}</span>
                                    {isBuilderMode && <button onClick={() => handleUpdate({...worksheet, questions: worksheet.questions.filter(qu => qu.id !== q.id)})} className="text-red-400 opacity-20 group-hover/q:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>}
                                 </div>
                                 <h3 className="text-xl font-bold text-slate-900 leading-tight">
                                    <EditableField multiline value={q.question} onSave={(v: any) => updateQuestion(q.id, {question: v})} isMath={true} />
                                 </h3>
                              </div>
                           </div>
                           <div className="ml-8 text-center min-w-[50px]">
                              <span className="text-[7px] font-black text-slate-300 uppercase block mb-1">PTS</span>
                              <input type="number" className="font-black text-slate-900 w-full text-center text-lg bg-transparent outline-none" value={q.points || 0} onChange={(e) => updateQuestion(q.id, { points: parseInt(e.target.value) || 0 })} />
                           </div>
                        </div>

                        <div className="ml-16">
                           {q.options && (
                              <div className="grid grid-cols-2 gap-4">
                                 {q.options.map((opt, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 border border-slate-100 bg-slate-50/50">
                                       <span className="w-6 h-6 flex items-center justify-center border border-slate-200 text-[8px] font-black text-slate-300">{String.fromCharCode(65 + i)}</span>
                                       <EditableField value={opt} onSave={(v: any) => { const n = [...(q.options||[])]; n[i]=v; updateQuestion(q.id, {options: n}); }} isMath={true} className="text-xs font-medium" />
                                    </div>
                                 ))}
                              </div>
                           )}
                           {(q.type === QuestionType.SHORT_ANSWER || q.type === QuestionType.ESSAY) && (
                              <div className="space-y-4 pt-4">
                                 <div className="h-[0.5px] bg-slate-200 w-full" />
                                 <div className="h-[0.5px] bg-slate-200 w-full opacity-50" />
                                 {q.type === QuestionType.ESSAY && <div className="h-[0.5px] bg-slate-200 w-full opacity-20" />}
                              </div>
                           )}
                        </div>
                     </>
                   )}
                </div>
              ))}
           </div>

           {/* Rubric Section */}
           {worksheet.rubric && worksheet.rubric.length > 0 && (
             <div className="mt-24 pt-12 border-t-2 border-slate-900 page-break-before">
                <div className="flex items-center gap-4 mb-8">
                   <Grid className="w-8 h-8" />
                   <h2 className="text-3xl font-black uppercase tracking-tighter">Grading Framework</h2>
                </div>
                <table className="w-full text-left border-collapse border border-slate-900">
                   <thead>
                      <tr className="bg-slate-50 text-[9px] font-black uppercase tracking-widest border-b border-slate-900">
                         <th className="p-4 border-r border-slate-900">Domain</th>
                         <th className="p-4 border-r border-slate-900 text-center">%</th>
                         <th className="p-4">Expectation</th>
                      </tr>
                   </thead>
                   <tbody>
                      {worksheet.rubric.map((item, i) => (
                        <tr key={i} className="border-t border-slate-200 text-xs">
                           <td className="p-4 font-black border-r border-slate-900 w-1/4 uppercase">{item.criterion}</td>
                           <td className="p-4 font-bold border-r border-slate-900 text-center w-16">{item.weight}%</td>
                           <td className="p-4 text-slate-600 leading-relaxed italic">{item.description}</td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
           )}

           <div className="mt-32 pt-8 border-t-2 border-slate-100 flex justify-between items-end opacity-20 text-[6px] font-black uppercase tracking-[0.4em]">
              <div>Official Instrument • {worksheet.institutionName}</div>
              <div className="text-center">Generated via Blueprint Pro<br/>Auth-ID: {worksheet.id}</div>
              <div className="text-right">Page 1 of 1</div>
           </div>
        </div>

        {/* Registry Key */}
        {showKey && (
          <div className="mt-24 p-16 bg-white border-t-4 border-slate-900 page-break-before">
             <div className="flex items-center gap-4 mb-12 pb-8 border-b border-slate-100">
                <ShieldCheck className="w-10 h-10" />
                <h2 className="text-5xl font-black uppercase tracking-tighter italic">Solution Registry</h2>
             </div>
             <div className="space-y-12">
                {worksheet.questions.filter(q => q.type !== QuestionType.PAGE_BREAK).map((q, idx) => (
                  <div key={`key-${q.id}`} className="flex gap-10 items-start border-l-2 border-slate-200 pl-10">
                     <span className="text-2xl font-black opacity-10 mt-1">{idx + 1}</span>
                     <div className="flex-1 space-y-6">
                        <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl">
                           <p className="text-[7px] font-black uppercase text-slate-400 mb-2">Model Answer</p>
                           <p className="text-xl font-black"><LatexRenderer content={q.correctAnswer} /></p>
                        </div>
                        {q.explanation && (
                           <div className="p-6">
                             <p className="text-[7px] font-black uppercase text-slate-400 mb-2">Pedagogical Analysis</p>
                             <p className="text-xs font-medium text-slate-500 italic leading-relaxed"><LatexRenderer content={q.explanation} /></p>
                           </div>
                        )}
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
