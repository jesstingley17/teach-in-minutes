
import React, { useState, useEffect, useRef } from 'react';
import { Worksheet, QuestionType, Question, LayoutStyle } from '../types.ts';
import { LatexRenderer } from './LatexRenderer.tsx';
import { SketchyBorderBox, DoodlePalette, HelenCharacter } from './HandwritingElements.tsx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  Edit3, Check, Landmark, Printer, Loader2, ShieldCheck, PenTool, QrCode, BookOpen, Star,
  Settings, X, Monitor, Maximize, FileText, Type as TypeIcon, Hash, ChevronRight
} from 'lucide-react';

interface WorksheetViewProps {
  worksheet: Worksheet;
  theme: any;
  showKey?: boolean;
  onUpdate?: (worksheet: Worksheet) => void;
}

interface PrintSettings {
  orientation: 'portrait' | 'landscape';
  scale: number;
  showPageNumbers: boolean;
  customFooter: string;
  showMetadata: boolean;
}

export const WorksheetView: React.FC<WorksheetViewProps> = ({ 
  worksheet: initialWorksheet, 
  showKey = false, 
  onUpdate
}) => {
  const [worksheet, setWorksheet] = useState<Worksheet>(initialWorksheet);
  const [isBuilderMode, setIsBuilderMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [doodles, setDoodles] = useState<string[]>([]);
  
  // Print Settings State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    orientation: 'portrait',
    scale: 2,
    showPageNumbers: true,
    customFooter: '',
    showMetadata: true
  });

  useEffect(() => { setWorksheet(initialWorksheet); }, [initialWorksheet]);

  const handleUpdate = (newWs: Worksheet) => {
    setWorksheet(newWs);
    if (onUpdate) onUpdate(newWs);
  };

  const primaryColor = worksheet.visualMetadata?.primaryColor || '#0f172a';
  const layoutStyle = worksheet.visualMetadata?.layoutStyle || LayoutStyle.CLASSIC;

  const handleExportPDF = async () => {
    setIsExporting(true);
    setIsPrintModalOpen(false);
    
    try {
      const element = document.getElementById('worksheet-content');
      if (!element) return;

      const canvas = await html2canvas(element, { 
        scale: printSettings.scale, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const isPortrait = printSettings.orientation === 'portrait';
      
      const pdf = new jsPDF({ 
        orientation: isPortrait ? 'portrait' : 'landscape', 
        unit: 'mm', 
        format: 'a4' 
      });

      const pdfWidth = isPortrait ? 210 : 297;
      const pdfHeight = isPortrait ? 297 : 210;
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      if (printSettings.customFooter || printSettings.showPageNumbers) {
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        const footerY = pdfHeight - 10;
        
        if (printSettings.customFooter) {
          pdf.text(printSettings.customFooter, 15, footerY);
        }
        
        if (printSettings.showPageNumbers) {
          pdf.text(`Architectural Node: ${worksheet.id?.slice(0, 6).toUpperCase()} | Page 1`, pdfWidth - 60, footerY);
        }
      }

      pdf.save(`${worksheet.title.replace(/\s+/g, '_')}_${printSettings.orientation}.pdf`);
    } catch (err) {
      console.error("PDF Export failed", err);
      alert("Materialization failed. Check console for details.");
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

  const EditableField = ({ value, onSave, className, multiline = false, placeholder = "", isMath = true }: any) => {
    const [local, setLocal] = useState(value);
    const [editing, setEditing] = useState(false);
    useEffect(() => setLocal(value), [value]);
    
    if (!isBuilderMode) {
      return isMath ? <LatexRenderer content={value || placeholder} className={className} /> : <span className={className}>{value || placeholder}</span>;
    }

    if (editing) {
      return multiline ? (
        <textarea autoFocus className={`w-full p-2 border-2 border-blue-400 rounded bg-blue-50 outline-none ${className}`} value={local} onChange={(e) => setLocal(e.target.value)} onBlur={() => { setEditing(false); onSave(local); }} />
      ) : (
        <input autoFocus className={`w-full p-1 border-2 border-blue-400 rounded bg-blue-50 outline-none ${className}`} value={local} onChange={(e) => setLocal(e.target.value)} onBlur={() => { setEditing(false); onSave(local); }} />
      );
    }

    return (
      <span onClick={() => setEditing(true)} className={`cursor-text p-1 rounded border-2 border-transparent hover:border-blue-100 hover:bg-blue-50 block ${className} ${!value ? 'text-slate-300 italic' : ''}`}>
        {isMath ? <LatexRenderer content={value || placeholder} /> : (value || placeholder)}
      </span>
    );
  };

  return (
    <div className="relative antialiased pb-4 mt-8 bg-slate-50 min-h-screen">
      {/* Top Action Bar */}
      <div className="absolute -top-12 left-0 right-0 flex justify-between items-center no-print px-4 py-2 bg-white border border-slate-100 rounded-xl shadow-sm z-[60]">
        <div className="flex gap-4 items-center">
          <button onClick={() => setIsBuilderMode(!isBuilderMode)} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${isBuilderMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 hover:bg-slate-100'}`}>
            {isBuilderMode ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            {isBuilderMode ? 'Commit Synthesis' : 'Enter Architect Mode'}
          </button>
          <button onClick={() => setIsPrintModalOpen(true)} disabled={isExporting} className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest bg-slate-900 text-white shadow-sm disabled:opacity-50 hover:bg-slate-800">
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            Materialize PDF
          </button>
        </div>
        <div className="text-[8px] font-black uppercase text-slate-300">Layout: {layoutStyle} • Profile: {worksheet.learnerProfile}</div>
      </div>

      {/* Print Settings Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 no-print">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-12 relative animate-in zoom-in duration-300">
            <button onClick={() => setIsPrintModalOpen(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 transition-colors"><X className="w-8 h-8" /></button>
            
            <header className="mb-10">
              <h3 className="text-4xl font-black uppercase tracking-tighter italic flex items-center gap-4">
                <Settings className="w-8 h-8 text-blue-500" /> Output Config
              </h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">Final parameter adjustments for physical media</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Monitor className="w-3.5 h-3.5" /> Orientation
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setPrintSettings({...printSettings, orientation: 'portrait'})}
                      className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest flex flex-col items-center gap-2 transition-all ${printSettings.orientation === 'portrait' ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                      Portrait
                    </button>
                    <button 
                      onClick={() => setPrintSettings({...printSettings, orientation: 'landscape'})}
                      className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest flex flex-col items-center gap-2 transition-all ${printSettings.orientation === 'landscape' ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                      Landscape
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Maximize className="w-3.5 h-3.5" /> Resolution Scale
                  </label>
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <input 
                      type="range" min="1" max="4" step="0.5" 
                      value={printSettings.scale} 
                      onChange={(e) => setPrintSettings({...printSettings, scale: parseFloat(e.target.value)})}
                      className="flex-1 accent-slate-900"
                    />
                    <span className="font-black text-xs w-8">{printSettings.scale}x</span>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" /> Footer Branding
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. Science Department • 2024" 
                    value={printSettings.customFooter}
                    onChange={(e) => setPrintSettings({...printSettings, customFooter: e.target.value})}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs focus:border-slate-900 outline-none transition-all"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5" /> Metadata Toggles
                  </label>
                  <div className="space-y-2">
                    <button 
                      onClick={() => setPrintSettings({...printSettings, showPageNumbers: !printSettings.showPageNumbers})}
                      className="w-full p-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      <span className="text-[10px] font-bold uppercase text-slate-600">Page Numbering</span>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${printSettings.showPageNumbers ? 'bg-green-500' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${printSettings.showPageNumbers ? 'left-6' : 'left-1'}`} />
                      </div>
                    </button>
                    <button 
                      onClick={() => setPrintSettings({...printSettings, showMetadata: !printSettings.showMetadata})}
                      className="w-full p-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      <span className="text-[10px] font-bold uppercase text-slate-600">Node Signature</span>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${printSettings.showMetadata ? 'bg-green-500' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${printSettings.showMetadata ? 'left-6' : 'left-1'}`} />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12">
              <button 
                onClick={handleExportPDF}
                className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl uppercase tracking-widest shadow-2xl hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-4"
              >
                <Printer className="w-6 h-6" /> Materialize Suite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Worksheet Container */}
      <div id="worksheet-content" className={`${printSettings.orientation === 'landscape' ? 'max-w-[297mm]' : 'max-w-[210mm]'} mx-auto min-h-[297mm] bg-white text-slate-900 overflow-hidden relative border border-slate-200 shadow-2xl transition-all duration-500`}>
        
        {/* Print Header */}
        <div className="p-16 border-b-2 border-slate-900 bg-white">
           <div className="flex justify-between items-start mb-12">
              <div className="space-y-4">
                 <div className="h-16 w-auto mb-6">
                    {worksheet.logoUrl ? <img src={worksheet.logoUrl} className="h-full w-auto object-contain" /> : <Landmark className="w-12 h-12" style={{ color: primaryColor }} />}
                 </div>
                 <EditableField value={worksheet.institutionName || "Instructional Academy"} onSave={(v: string) => handleUpdate({...worksheet, institutionName: v})} className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: primaryColor }} />
              </div>
              <div className="text-right">
                 <QrCode className="w-10 h-10 ml-auto mb-4 opacity-20" />
                 <div className="text-[8px] font-black uppercase tracking-widest opacity-40">Architectural Node: {worksheet.id?.slice(0, 6).toUpperCase()}</div>
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
              <div className="text-right">
                 <p className="text-[7px] font-black uppercase tracking-widest opacity-40 mb-1">Total Points</p>
                 <p className="font-black text-3xl" style={{ color: primaryColor }}>{worksheet.questions.reduce((s,q) => s+(q.points||0), 0)}</p>
              </div>
           </div>
        </div>

        {/* Content Body */}
        <div className="px-16 py-12 space-y-12 bg-white">
           {layoutStyle === LayoutStyle.LAID_TEACH && (
             <div className="grid grid-cols-12 gap-8 animate-in slide-in-from-top-4">
                <div className="col-span-12">
                   <SketchyBorderBox className="bg-white border border-slate-200 transform rotate-[-0.3deg]">
                      <div className="flex items-center gap-3 mb-6">
                         <BookOpen className="w-6 h-6" style={{ color: primaryColor }} />
                         <h2 className="text-xl font-black uppercase tracking-tight italic border-b border-current">Instructional Summary</h2>
                      </div>
                      <div className="text-sm font-medium leading-relaxed">
                         <EditableField multiline value={worksheet.teachingContent || "Synthesizing content..."} onSave={(v: any) => handleUpdate({...worksheet, teachingContent: v})} />
                      </div>
                   </SketchyBorderBox>
                </div>
                <div className="col-span-12 md:col-span-8">
                  <div className="bg-slate-50/50 p-8 rounded-3xl border-2 border-dashed border-slate-200">
                     <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-4"><Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> Key Takeaways</h3>
                     <ul className="space-y-3">
                        {(worksheet.keyTakeaways || ["..."]).map((takeaway, i) => (
                          <li key={i} className="flex items-start gap-3">
                             <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: primaryColor }} />
                             <EditableField value={takeaway} onSave={(v: any) => { const n = [...(worksheet.keyTakeaways || [])]; n[i] = v; handleUpdate({...worksheet, keyTakeaways: n}); }} className="text-xs font-bold text-slate-700" />
                          </li>
                        ))}
                     </ul>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-4 flex justify-center items-center">
                   <HelenCharacter />
                </div>
             </div>
           )}

           <div className="pt-12 border-t border-slate-100 space-y-16">
              <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-4">
                 <PenTool className="w-6 h-6" /> Assessment Manifest
              </h2>
              <div className="space-y-16">
                {worksheet.questions.map((q, idx) => (
                  <div key={q.id}>
                     <div className="flex justify-between items-start mb-6">
                        <div className="flex gap-6 items-start flex-1">
                           <div className="w-10 h-10 border-2 border-slate-900 flex items-center justify-center font-black">
                              <span className="text-lg">{idx + 1}</span>
                           </div>
                           <div className="flex-1">
                              <h3 className="text-xl font-bold text-slate-900 leading-tight">
                                 <EditableField multiline value={q.question} onSave={(v: any) => updateQuestion(q.id, {question: v})} />
                              </h3>
                           </div>
                        </div>
                        <div className="ml-8 text-center min-w-[50px]">
                           <span className="text-[7px] font-black text-slate-300 uppercase block">PTS</span>
                           <input type="number" className="font-black text-slate-900 w-full text-center text-lg bg-transparent" value={q.points || 0} onChange={(e) => updateQuestion(q.id, { points: parseInt(e.target.value) || 0 })} />
                        </div>
                     </div>

                     <div className="ml-16">
                        {q.options && (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {q.options.map((opt, i) => (
                                 <div key={i} className="flex items-center gap-3 p-3 border border-slate-100 bg-slate-50/50">
                                    <span className="w-6 h-6 flex items-center justify-center border border-slate-200 text-[8px] font-black text-slate-300">{String.fromCharCode(65 + i)}</span>
                                    <EditableField value={opt} onSave={(v: any) => { const n = [...(q.options||[])]; n[i]=v; updateQuestion(q.id, {options: n}); }} className="text-xs font-medium" />
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
                  </div>
                ))}
              </div>
           </div>

           {/* Doodles Rendering */}
           {doodles.map((d, i) => (
             <img key={i} src={d} className="absolute pointer-events-none opacity-10 mix-blend-multiply w-32 h-32" style={{ top: `${15 + i*20}%`, left: i%2===0 ? '3%' : '85%' }} />
           ))}

           <div className="mt-32 pt-8 border-t-2 border-slate-100 flex justify-between items-end opacity-20 text-[6px] font-black uppercase tracking-[0.4em]">
              <div>{worksheet.institutionName} • Suite Node {worksheet.id?.slice(-4).toUpperCase()}</div>
              <div className="text-right">Architectural Validation: OK</div>
           </div>
        </div>

        {showKey && (
          <div className="mt-24 p-16 bg-white border-t-4 border-slate-900 page-break-before">
             <div className="flex items-center gap-4 mb-12 pb-8 border-b border-slate-100">
                <ShieldCheck className="w-10 h-10" />
                <h2 className="text-5xl font-black uppercase tracking-tighter italic">Key Registry</h2>
             </div>
             <div className="space-y-12">
                {worksheet.questions.map((q, idx) => (
                  <div key={`key-${q.id}`} className="flex gap-10 items-start border-l-2 border-slate-200 pl-10">
                     <span className="text-2xl font-black opacity-10 mt-1">{idx + 1}</span>
                     <div className="flex-1 space-y-4">
                        <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl">
                           <p className="text-[7px] font-black uppercase text-slate-400 mb-2">Verified Solution</p>
                           <p className="text-xl font-black"><LatexRenderer content={q.correctAnswer} /></p>
                        </div>
                        {q.explanation && (
                           <p className="text-xs font-medium text-slate-500 italic"><LatexRenderer content={q.explanation} /></p>
                        )}
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>
      <DoodlePalette topic={worksheet.topic} gradeLevel={worksheet.educationalLevel} onDoodleSelect={(d) => setDoodles([...doodles, d])} />
    </div>
  );
};
