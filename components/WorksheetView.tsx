
import React, { useState, useEffect, useRef } from 'react';
import { Worksheet, QuestionType, ThemeType, Question } from '../types';
import { LatexRenderer } from './LatexRenderer';
import { generateSpeech } from '../services/geminiService';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  Trash2, Edit3, Check, Landmark, Printer, Loader2, Volume2, ShieldCheck, GraduationCap, Grid, Info, Scale, PenTool, QrCode
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

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById('worksheet-content');
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      pdf.save(`${worksheet.title.replace(/\s+/g, '_')}_Institutional.pdf`);
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
    return <span onClick={() => setEditing(true)} className={`cursor-text transition-all p-1 rounded border-2 border-transparent hover:border-blue-200 hover:bg-blue-50 block ${className} ${!value ? 'text-slate-300 italic' : ''}`}>{isMath ? <LatexRenderer content={value || placeholder} /> : (value || placeholder)}</span>;
  };

  const totalPoints = worksheet.questions.reduce((sum, q) => sum + (q.points || 0), 0);

  return (
    <div className="relative group/ws antialiased pb-4 mt-16">
      <div className="absolute -top-16 left-0 right-0 flex justify-between items-center no-print px-6 py-3 bg-white border border-slate-200 shadow-sm z-[60] rounded-2xl">
        <div className="flex gap-4 items-center">
          <button onClick={() => setIsBuilderMode(!isBuilderMode)} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold transition-all ${isBuilderMode ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {isBuilderMode ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            {isBuilderMode ? 'Save Edits' : 'Edit Assessment'}
          </button>
          <div className="flex items-center gap-2 border-l pl-4 border-slate-100">
            <select value={currentTheme} onChange={(e) => setCurrentTheme(e.target.value as ThemeType)} className="bg-transparent border-none text-[9px] font-black uppercase tracking-widest text-slate-900 focus:ring-0 cursor-pointer">
              <option value={ThemeType.GAMMA}>Gamma Institutional</option>
              <option value={ThemeType.ACADEMIC}>Oxford Traditional</option>
              <option value={ThemeType.MODERN}>Professional Modern</option>
            </select>
          </div>
          <button onClick={handleExportPDF} disabled={isExporting} className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold bg-slate-900 text-white shadow-sm disabled:opacity-50">
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            <span className="text-[9px] uppercase tracking-widest font-black">Generate Final PDF</span>
          </button>
        </div>
      </div>

      <div id="worksheet-content" className={`max-w-[210mm] mx-auto shadow-2xl min-h-[297mm] relative transition-all duration-300 bg-white border border-slate-100`}>
        
        {/* Institutional Header */}
        <div className="relative h-[110mm] w-full overflow-hidden bg-slate-950 flex flex-col justify-end p-16 text-white" style={{ borderBottom: `8px solid ${primaryColor}` }}>
           {worksheet.visualMetadata?.coverImageUrl ? (
             <img src={worksheet.visualMetadata.coverImageUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-soft-light" />
           ) : (
             <div className="absolute inset-0 bg-slate-900" style={{ background: `linear-gradient(to br, ${primaryColor}, #020617)` }} />
           )}
           <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
           
           <div className="absolute top-12 left-12 h-20 w-auto opacity-80">
              {worksheet.logoUrl ? (
                <img src={worksheet.logoUrl} className="h-full w-auto object-contain filter brightness-0 invert" />
              ) : (
                <Landmark className="w-16 h-16 text-white/50" />
              )}
           </div>

           <div className="absolute top-12 right-12 flex flex-col items-end opacity-40">
              <QrCode className="w-16 h-16 mb-2" />
              <p className="text-[6px] font-black uppercase tracking-[0.4em]">Auth Verifier: {worksheet.id}</p>
           </div>
           
           <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4">
                 <div className="px-3 py-1 bg-white/10 backdrop-blur-lg border border-white/20 rounded text-[9px] font-black uppercase tracking-[0.2em]">{worksheet.documentType}</div>
                 <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50">{worksheet.educationalLevel}</div>
              </div>
              <h1 className="text-6xl font-black tracking-tighter leading-none max-w-4xl uppercase">
                 <EditableField value={worksheet.title} onSave={(v: any) => handleUpdate({...worksheet, title: v})} />
              </h1>
              <div className="flex gap-12 pt-8 border-t border-white/10">
                 <div><p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1 text-white">Course Code</p><p className="font-bold text-lg uppercase tracking-tighter">{worksheet.courseCode || "UNIV-401"}</p></div>
                 <div><p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1 text-white">Department Head</p><p className="font-bold text-lg">{worksheet.instructorName || "Faculty Lead"}</p></div>
                 <div className="ml-auto text-right"><p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1 text-white">Weighting</p><p className="font-black text-4xl" style={{ color: primaryColor }}>{totalPoints} <span className="text-xs uppercase opacity-30">PTS</span></p></div>
              </div>
           </div>
        </div>

        <div className={`px-20 py-16 relative z-10 mt-[-10mm] bg-white rounded-t-[3rem] shadow-[-10px_-10px_30px_rgba(0,0,0,0.05)]`}>
           
           {/* Section 1: Pedagogical Context */}
           <div className="mb-20 grid grid-cols-4 gap-12">
              <div className="col-span-3">
                 <div className="flex items-center gap-2 mb-4">
                    <Info className="w-4 h-4 text-slate-400" />
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Assessment Mandate & Instructions</p>
                 </div>
                 <div className="p-8 border-l-4 bg-slate-50 rounded-r-3xl text-sm leading-relaxed text-slate-800" style={{ borderLeftColor: primaryColor }}>
                    <EditableField multiline value={worksheet.topic} onSave={(v: any) => handleUpdate({...worksheet, topic: v})} isMath={isMathMode} />
                 </div>
              </div>
              <div className="text-right">
                 <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Allowed Duration</p>
                 <p className="text-2xl font-black text-slate-900">{worksheet.duration || "Self-Paced"}</p>
                 <div className="mt-8">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Institution</p>
                    <p className="text-[10px] font-black uppercase tracking-widest truncate" style={{ color: primaryColor }}>{worksheet.institutionName || "Blueprint University"}</p>
                 </div>
              </div>
           </div>

           {/* Section 2: Evaluation Items */}
           <div className="space-y-24">
              {worksheet.questions.map((q, idx) => (
                <div key={q.id} className={`group/q ${q.type === QuestionType.PAGE_BREAK ? 'py-20 border-y border-dashed border-slate-200' : ''}`}>
                   {q.type === QuestionType.PAGE_BREAK ? (
                      <div className="text-center opacity-20"><Scale className="w-8 h-8 mx-auto mb-2" /><span className="text-[9px] font-black uppercase tracking-[0.5em]">Module Separation</span></div>
                   ) : (
                     <>
                        <div className="flex justify-between items-start mb-10">
                           <div className="flex gap-8 items-start flex-1">
                              <div className="w-14 h-14 border-2 flex flex-col items-center justify-center font-black rounded-xl flex-shrink-0" style={{ borderColor: primaryColor, color: primaryColor }}>
                                 <span className="text-[8px] opacity-50 uppercase mb-[-4px]">ITEM</span>
                                 <span className="text-xl">{idx + 1}</span>
                              </div>
                              <div className="flex-1 space-y-2">
                                 <div className="flex items-center gap-3">
                                    <span className="px-2 py-0.5 bg-slate-100 rounded text-[7px] font-black uppercase tracking-widest text-slate-500 border border-slate-200">{q.learningOutcome || "BLOOM-TAXONOMY-ID"}</span>
                                    {isBuilderMode && <button onClick={() => handleUpdate({...worksheet, questions: worksheet.questions.filter(qu => qu.id !== q.id)})} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
                                 </div>
                                 <h3 className="text-2xl font-bold text-slate-900 leading-tight">
                                    <EditableField multiline value={q.question} onSave={(v: any) => updateQuestion(q.id, {question: v})} isMath={true} />
                                 </h3>
                              </div>
                           </div>
                           <div className="ml-10 text-center px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg min-w-[80px]">
                              <span className="text-[7px] font-black text-slate-400 uppercase block mb-1">Marks</span>
                              <input type="number" className="font-black text-slate-900 w-full text-center text-xl bg-transparent outline-none" value={q.points || 0} onChange={(e) => updateQuestion(q.id, { points: parseInt(e.target.value) || 0 })} />
                           </div>
                        </div>

                        <div className="ml-24">
                           {q.options && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 {q.options.map((opt, i) => (
                                    <div key={i} className="flex items-center gap-4 p-5 border border-slate-100 rounded-2xl bg-white shadow-sm hover:border-slate-300 transition-all cursor-pointer">
                                       <span className="w-8 h-8 flex items-center justify-center border border-slate-200 text-[10px] font-black text-slate-400 rounded-lg">{String.fromCharCode(65 + i)}</span>
                                       <EditableField value={opt} onSave={(v: any) => { const n = [...(q.options||[])]; n[i]=v; updateQuestion(q.id, {options: n}); }} isMath={true} className="text-sm font-medium" />
                                    </div>
                                 ))}
                              </div>
                           )}
                           {(q.type === QuestionType.SHORT_ANSWER || q.type === QuestionType.ESSAY) && (
                              <div className="space-y-4 pt-4">
                                 <div className="h-px bg-slate-200 w-full" />
                                 <div className="h-px bg-slate-200 w-full opacity-50" />
                                 {q.type === QuestionType.ESSAY && <div className="h-px bg-slate-200 w-full opacity-20" />}
                              </div>
                           )}
                        </div>
                     </>
                   )}
                </div>
              ))}
           </div>

           {/* Section 3: Assessment Rubric */}
           {worksheet.rubric && worksheet.rubric.length > 0 && (
             <div className="mt-32 pt-20 border-t-4 border-slate-900 page-break-before">
                <div className="flex items-center gap-4 mb-12">
                   <Grid className="w-10 h-10 text-slate-900" />
                   <div>
                      <h2 className="text-4xl font-black uppercase tracking-tighter">Evaluation Criterion Framework</h2>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Institutional Standards for High-Rigor Performance Mapping</p>
                   </div>
                </div>
                <div className="border border-slate-900 overflow-hidden shadow-sm">
                   <table className="w-full text-left border-collapse">
                      <thead>
                         <tr className="bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest">
                            <th className="p-6 border-r border-slate-800">Criterion Domain</th>
                            <th className="p-6 border-r border-slate-800 text-center">Weight</th>
                            <th className="p-6">Proficiency Expectations</th>
                         </tr>
                      </thead>
                      <tbody>
                         {worksheet.rubric.map((item, i) => (
                           <tr key={i} className="border-t border-slate-200 text-sm hover:bg-slate-50 transition-colors">
                              <td className="p-6 font-black border-r border-slate-100 w-1/4 uppercase tracking-tight">{item.criterion}</td>
                              <td className="p-6 font-bold border-r border-slate-100 text-center w-20">{item.weight}%</td>
                              <td className="p-6 text-slate-600 leading-relaxed italic">{item.description}</td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
           )}

           <div className="mt-40 pt-16 border-t-2 border-slate-100 flex justify-between items-end opacity-20 text-[7px] font-black uppercase tracking-[0.4em]">
              <div className="flex items-center gap-2"><ShieldCheck className="w-3 h-3" /> Integrity Protected Instrument</div>
              <div className="text-center">Official Archive ID: {worksheet.id}<br/>Printed {new Date().toLocaleDateString()}</div>
              <div className="flex items-center gap-2">
                 {worksheet.logoUrl && <img src={worksheet.logoUrl} className="h-4 w-auto grayscale" />}
                 <GraduationCap className="w-3 h-3" /> Accredited Syllabus Mapping
              </div>
           </div>
        </div>

        {/* Official Marking Registry (Key) */}
        {showKey && (
          <div className="mt-20 p-20 bg-slate-900 text-white relative z-10 page-break-before">
             <div className="flex items-center gap-6 mb-20 border-b border-white/10 pb-12">
                <ShieldCheck className="w-16 h-16 text-white" />
                <h2 className="text-7xl font-black uppercase tracking-tighter italic">Solution Registry</h2>
             </div>
             <div className="space-y-16">
                {worksheet.questions.filter(q => q.type !== QuestionType.PAGE_BREAK).map((q, idx) => (
                  <div key={`key-${q.id}`} className="flex gap-12 items-start border-l-2 border-white/20 pl-12 transition-all hover:border-white/60">
                     <span className="text-4xl font-black opacity-20 mt-1">{idx + 1}</span>
                     <div className="flex-1 space-y-8">
                        <div className="p-10 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm">
                           <p className="text-[8px] font-black uppercase text-white/40 mb-4 tracking-widest">Pedagogical Solution</p>
                           <p className="text-3xl font-black"><LatexRenderer content={q.correctAnswer} /></p>
                        </div>
                        {q.explanation && (
                           <div className="p-10 bg-white/5 border border-white/10 rounded-3xl">
                             <p className="text-[8px] font-black uppercase text-white/40 mb-4 tracking-widest">Rationale & Analysis</p>
                             <p className="text-sm font-medium text-white/60 leading-relaxed italic"><LatexRenderer content={q.explanation} /></p>
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
