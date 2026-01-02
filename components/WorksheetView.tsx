
import React, { useState, useEffect, useRef } from 'react';
import { Worksheet, QuestionType, Question, LayoutStyle } from '../types.ts';
import { LatexRenderer } from './LatexRenderer.tsx';
import { SketchyBorderBox, DoodlePalette, HelenCharacter, DraggableLineRow, SymbolDrillRow } from './HandwritingElements.tsx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { authenticateGoogleDrive, uploadToGoogleDrive } from '../services/googleDriveService.ts';
// Fixed: Added missing 'Sparkles' import from lucide-react.
import { 
  Edit3, Check, Landmark, Printer, Loader2, ShieldCheck, PenTool, QrCode, BookOpen, Star,
  Settings, X, Monitor, Maximize, FileText, Type as TypeIcon, Hash, ChevronRight,
  Palette, MousePointer2, Briefcase, GraduationCap as CapIcon, PlayCircle, Trash2, PlusCircle,
  Save, Cloud, Scissors, ListOrdered, Braces, AlignLeft, Layout, Sparkles
} from 'lucide-react';

interface WorksheetViewProps {
  worksheet: Worksheet;
  theme: any;
  showKey?: boolean;
  onUpdate?: (worksheet: Worksheet) => void;
  onLaunchQuiz?: () => void;
  onSaveSuccess?: () => void;
}

interface PrintSettings {
  orientation: 'portrait' | 'landscape';
  scale: number;
  showPageNumbers: boolean;
  customFooter: string;
  showMetadata: boolean;
}

type HandwritingStyle = 'Classic' | 'Creative' | 'Modern' | 'Academic';

export const WorksheetView: React.FC<WorksheetViewProps> = ({ 
  worksheet: initialWorksheet, 
  showKey = false, 
  onUpdate,
  onLaunchQuiz,
  onSaveSuccess
}) => {
  const [worksheet, setWorksheet] = useState<Worksheet>(initialWorksheet);
  const [isBuilderMode, setIsBuilderMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [driveSuccess, setDriveSuccess] = useState(false);
  const [doodles, setDoodles] = useState<string[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<HandwritingStyle>('Classic');
  
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

  const getStyleClasses = () => {
    switch (selectedStyle) {
      case 'Creative': return 'font-handwriting-body text-slate-800 tracking-wide';
      case 'Modern': return 'font-sans tracking-tight text-slate-900 font-medium';
      case 'Academic': return 'font-academic-body text-slate-900 leading-relaxed';
      case 'Classic': default: return 'font-sans text-slate-800';
    }
  };

  const getHeaderFont = () => {
    switch (selectedStyle) {
      case 'Creative': return 'font-handwriting-header';
      case 'Academic': return 'font-academic-header';
      case 'Modern': return 'font-sans font-black italic';
      default: return 'font-sans font-black';
    }
  };

  const handleSaveDraft = () => {
    setIsSaving(true);
    setTimeout(() => {
      try {
        const localUser = JSON.parse(localStorage.getItem('local_user_profile') || '{"id":"local-arch"}');
        const prefix = localUser.id || 'local-arch';
        const archive = JSON.parse(localStorage.getItem(`archive_${prefix}`) || '[]');
        
        const existingIdx = archive.findIndex((ws: Worksheet) => ws.id === worksheet.id);
        let updatedArchive;
        if (existingIdx >= 0) {
          updatedArchive = [...archive];
          updatedArchive[existingIdx] = { ...worksheet, savedAt: Date.now() };
        } else {
          const newId = worksheet.id || Math.random().toString(36).substr(2, 9);
          updatedArchive = [{ ...worksheet, id: newId, savedAt: Date.now() }, ...archive];
        }
        
        localStorage.setItem(`archive_${prefix}`, JSON.stringify(updatedArchive.slice(0, 50)));
        setSaveSuccess(true);
        if (onSaveSuccess) onSaveSuccess();
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (err) {
        console.error("Save Draft Failed:", err);
        alert("Failed to save draft to local storage.");
      } finally {
        setIsSaving(false);
      }
    }, 600);
  };

  const generatePdfBlob = async (): Promise<Blob | null> => {
    const element = document.getElementById('worksheet-content');
    if (!element) return null;

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
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    if (printSettings.customFooter || printSettings.showPageNumbers) {
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      const pdfHeight = isPortrait ? 297 : 210;
      const footerY = pdfHeight - 10;
      if (printSettings.customFooter) pdf.text(printSettings.customFooter, 15, footerY);
      if (printSettings.showPageNumbers) pdf.text(`Architectural Node: ${worksheet.id?.slice(0, 6).toUpperCase()} | Page 1`, pdfWidth - 60, footerY);
    }

    return pdf.output('blob');
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    setIsPrintModalOpen(false);
    try {
      const blob = await generatePdfBlob();
      if (!blob) return;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${worksheet.title.replace(/\s+/g, '_')}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF Export failed", err);
      alert("Materialization failed. Check console for details.");
    } finally { 
      setIsExporting(false); 
    }
  };

  const handleUploadToDrive = async () => {
    setIsUploadingToDrive(true);
    try {
      const branding = JSON.parse(localStorage.getItem('institutional_branding') || '{}');
      const token = await authenticateGoogleDrive(branding.googleClientId);
      const blob = await generatePdfBlob();
      if (!blob) throw new Error("Could not generate worksheet artifact.");
      
      const filename = `${worksheet.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      await uploadToGoogleDrive(token, blob, filename);
      
      setDriveSuccess(true);
      setTimeout(() => setDriveSuccess(false), 4000);
    } catch (err: any) {
      console.error("Drive Integration Failure:", err);
      alert(err.message || "Failed to sync with Google Drive.");
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    handleUpdate({
      ...worksheet,
      questions: worksheet.questions.map(q => q.id === id ? { ...q, ...updates } : q)
    });
  };

  const addQuestion = (type: QuestionType) => {
    const newQ: Question = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      question: type === QuestionType.PAGE_BREAK ? "--- Page Break Segment ---" : `New ${type.replace('_', ' ')} Instruction`,
      correctAnswer: type === QuestionType.PAGE_BREAK ? "" : "Sample Solution",
      explanation: "",
      points: type === QuestionType.PAGE_BREAK ? 0 : 5,
      options: type === QuestionType.MCQ ? ["Option A", "Option B", "Option C"] : undefined
    };
    handleUpdate({
      ...worksheet,
      questions: [...worksheet.questions, newQ]
    });
  };

  const deleteQuestion = (id: string) => {
    handleUpdate({
      ...worksheet,
      questions: worksheet.questions.filter(q => q.id !== id)
    });
  };

  const deleteOption = (questionId: string, optionIndex: number) => {
    const question = worksheet.questions.find(q => q.id === questionId);
    if (!question || !question.options) return;
    const newOptions = question.options.filter((_, i) => i !== optionIndex);
    updateQuestion(questionId, { options: newOptions });
  };

  const addOption = (questionId: string) => {
    const question = worksheet.questions.find(q => q.id === questionId);
    if (!question) return;
    const newOptions = [...(question.options || []), "New Option"];
    updateQuestion(questionId, { options: newOptions });
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
      <div className="absolute -top-20 left-0 right-0 flex flex-col gap-3 no-print z-[60]">
        <div className="flex justify-between items-center px-4 py-2 bg-white border border-slate-100 rounded-xl shadow-sm">
          <div className="flex gap-4 items-center flex-wrap">
            <button onClick={() => setIsBuilderMode(!isBuilderMode)} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${isBuilderMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 hover:bg-slate-100'}`}>
              {isBuilderMode ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
              {isBuilderMode ? 'Commit Design' : 'Architect Mode'}
            </button>
            <button 
              onClick={handleSaveDraft} 
              disabled={isSaving}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all shadow-sm ${saveSuccess ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saveSuccess ? 'Archive Updated' : 'Save Draft'}
            </button>
            <button 
              onClick={handleUploadToDrive}
              disabled={isUploadingToDrive}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all shadow-sm ${driveSuccess ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}
            >
              {isUploadingToDrive ? <Loader2 className="w-4 h-4 animate-spin" /> : driveSuccess ? <Check className="w-4 h-4" /> : <Cloud className="w-4 h-4" />}
              {driveSuccess ? 'Synced to Drive' : 'Sync to Drive'}
            </button>
            <button onClick={() => setIsPrintModalOpen(true)} disabled={isExporting} className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest bg-slate-900 text-white shadow-sm disabled:opacity-50 hover:bg-slate-800">
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              Materialize PDF
            </button>
            {onLaunchQuiz && (
              <button onClick={onLaunchQuiz} className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all border border-blue-200">
                <PlayCircle className="w-4 h-4" /> Interactive Quiz
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-[8px] font-black uppercase text-slate-300">Style:</span>
            <div className="flex p-1 bg-slate-100 rounded-lg gap-1">
              {(['Classic', 'Creative', 'Modern', 'Academic'] as HandwritingStyle[]).map(style => (
                <button 
                  key={style}
                  onClick={() => setSelectedStyle(style)}
                  className={`px-3 py-1 rounded-md font-black text-[8px] uppercase tracking-widest transition-all ${selectedStyle === style ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        </div>
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
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">Final adjustments for physical media</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Monitor className="w-3.5 h-3.5" /> Orientation</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setPrintSettings({...printSettings, orientation: 'portrait'})} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest flex flex-col items-center gap-2 transition-all ${printSettings.orientation === 'portrait' ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : 'border-slate-100 hover:border-slate-200'}`}>Portrait</button>
                    <button onClick={() => setPrintSettings({...printSettings, orientation: 'landscape'})} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest flex flex-col items-center gap-2 transition-all ${printSettings.orientation === 'landscape' ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : 'border-slate-100 hover:border-slate-200'}`}>Landscape</button>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Maximize className="w-3.5 h-3.5" /> Resolution Scale</label>
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <input type="range" min="1" max="4" step="0.5" value={printSettings.scale} onChange={(e) => setPrintSettings({...printSettings, scale: parseFloat(e.target.value)})} className="flex-1 accent-slate-900"/>
                    <span className="font-black text-xs w-8">{printSettings.scale}x</span>
                  </div>
                </div>
              </div>
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> Footer Branding</label>
                  <input type="text" placeholder="e.g. Science Department • 2024" value={printSettings.customFooter} onChange={(e) => setPrintSettings({...printSettings, customFooter: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs focus:border-slate-900 outline-none transition-all"/>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Hash className="w-3.5 h-3.5" /> Metadata Toggles</label>
                  <div className="space-y-2">
                    <button onClick={() => setPrintSettings({...printSettings, showPageNumbers: !printSettings.showPageNumbers})} className="w-full p-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors">
                      <span className="text-[10px] font-bold uppercase text-slate-600">Page Numbering</span>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${printSettings.showPageNumbers ? 'bg-green-500' : 'bg-slate-300'}`}><div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${printSettings.showPageNumbers ? 'left-6' : 'left-1'}`} /></div>
                    </button>
                    <button onClick={() => setPrintSettings({...printSettings, showMetadata: !printSettings.showMetadata})} className="w-full p-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors">
                      <span className="text-[10px] font-bold uppercase text-slate-600">Node Signature</span>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${printSettings.showMetadata ? 'bg-green-500' : 'bg-slate-300'}`}><div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${printSettings.showMetadata ? 'left-6' : 'left-1'}`} /></div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-12">
              <button onClick={handleExportPDF} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl uppercase tracking-widest shadow-2xl hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-4"><Printer className="w-6 h-6" /> Materialize Suite</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Worksheet Container */}
      <div id="worksheet-content" className={`${printSettings.orientation === 'landscape' ? 'max-w-[297mm]' : 'max-w-[210mm]'} mx-auto min-h-[297mm] bg-white text-slate-900 overflow-hidden relative border border-slate-200 shadow-2xl transition-all duration-500 ${getStyleClasses()}`}>
        {/* Print Header */}
        <div className={`p-16 border-b-2 border-slate-900 bg-white ${selectedStyle === 'Creative' ? 'border-slate-800' : ''}`}>
           <div className="flex justify-between items-start mb-12">
              <div className="space-y-4">
                 <div className="h-16 w-auto mb-6">
                    {worksheet.logoUrl ? <img src={worksheet.logoUrl} className="h-full w-auto object-contain" /> : <Landmark className="w-12 h-12" style={{ color: primaryColor }} />}
                 </div>
                 <EditableField value={worksheet.institutionName || "Instructional Academy"} onSave={(v: string) => handleUpdate({...worksheet, institutionName: v})} className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: primaryColor }} />
              </div>
              <div className="text-right">
                 <QrCode className="w-10 h-10 ml-auto mb-4 opacity-20" />
                 <div className="text-[8px] font-black uppercase tracking-widest opacity-40">Node: {worksheet.id?.slice(0, 6).toUpperCase()}</div>
              </div>
           </div>
           <div className="flex justify-between items-end gap-12">
              <div className="flex-1">
                 <div className="flex items-center gap-4 mb-3">
                    <span className="px-2 py-1 border border-slate-900 text-[8px] font-black uppercase tracking-widest">{worksheet.documentType}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-40">{worksheet.educationalLevel}</span>
                 </div>
                 <h1 className={`text-5xl font-black uppercase tracking-tighter leading-none ${getHeaderFont()}`}><EditableField value={worksheet.title} onSave={(v: any) => handleUpdate({...worksheet, title: v})} /></h1>
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
                   <SketchyBorderBox className={`bg-white border border-slate-200 transform rotate-[-0.3deg] ${selectedStyle === 'Academic' ? 'rotate-0 border-slate-300' : ''}`}>
                      <div className="flex items-center gap-3 mb-6">
                         <BookOpen className="w-6 h-6" style={{ color: primaryColor }} />
                         <h2 className={`text-xl font-black uppercase tracking-tight italic border-b border-current ${getHeaderFont()}`}>Instructional Summary</h2>
                      </div>
                      <div className={`text-sm font-medium leading-relaxed ${selectedStyle === 'Academic' ? 'text-justify' : ''}`}>
                         <EditableField multiline value={worksheet.teachingContent || "Synthesizing content..."} onSave={(v: any) => handleUpdate({...worksheet, teachingContent: v})} />
                      </div>
                   </SketchyBorderBox>
                </div>
                <div className="col-span-12 md:col-span-8">
                  <div className={`bg-slate-50/50 p-8 rounded-3xl border-2 border-dashed border-slate-200 ${selectedStyle === 'Academic' ? 'border-solid rounded-none bg-slate-50' : ''}`}>
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
                <div className="col-span-12 md:col-span-4 flex justify-center items-center"><HelenCharacter /></div>
             </div>
           )}

           <div className="pt-12 border-t border-slate-100 space-y-16">
              <h2 className={`text-2xl font-black uppercase tracking-tight flex items-center gap-4 ${getHeaderFont()}`}><PenTool className="w-6 h-6" /> Assessment Manifest</h2>
              <div className="space-y-16">
                {worksheet.questions.map((q, idx) => {
                  if (q.type === QuestionType.PAGE_BREAK) {
                    return (
                      <div key={q.id} className="relative group/break no-print">
                         <div className="flex items-center gap-4 py-8 border-y-2 border-dashed border-slate-100 text-slate-300 font-black text-[10px] uppercase tracking-[0.5em] justify-center opacity-40 hover:opacity-100 transition-opacity">
                            <Scissors className="w-4 h-4" /> Material Segment Boundary
                         </div>
                         <div className="page-break-before" />
                         {isBuilderMode && (
                            <button onClick={() => deleteQuestion(q.id)} className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-red-300 hover:text-red-500 opacity-0 group-hover/break:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                         )}
                      </div>
                    );
                  }

                  return (
                    <div key={q.id} className="relative group/q">
                       <div className="flex justify-between items-start mb-6">
                          <div className="flex gap-6 items-start flex-1">
                             <div className={`w-10 h-10 border-2 border-slate-900 flex items-center justify-center font-black ${selectedStyle === 'Creative' ? 'rounded-full border-dashed rotate-6' : ''}`}><span className="text-lg">{idx + 1}</span></div>
                             <div className="flex-1">
                                <h3 className={`text-xl font-bold text-slate-900 leading-tight ${selectedStyle === 'Modern' ? 'tracking-tight' : ''}`}>
                                   <EditableField multiline value={q.question} onSave={(v: any) => updateQuestion(q.id, {question: v})} />
                                </h3>
                             </div>
                          </div>
                          <div className="ml-8 text-center min-w-[50px]">
                             <span className="text-[7px] font-black text-slate-300 uppercase block">PTS</span>
                             <input type="number" className="font-black text-slate-900 w-full text-center text-lg bg-transparent" value={q.points || 0} onChange={(e) => updateQuestion(q.id, { points: parseInt(e.target.value) || 0 })} />
                          </div>
                          {isBuilderMode && (
                             <button onClick={() => deleteQuestion(q.id)} className="ml-4 p-2 text-red-300 hover:text-red-500 opacity-0 group-hover/q:opacity-100 transition-all no-print"><Trash2 className="w-4 h-4" /></button>
                          )}
                       </div>

                       <div className="ml-16">
                          {q.options && (
                             <div className="space-y-4">
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {q.options.map((opt, i) => (
                                     <div key={i} className={`flex items-center gap-3 p-3 border border-slate-100 bg-slate-50/50 group/opt ${selectedStyle === 'Creative' ? 'rounded-2xl rotate-[0.5deg]' : ''}`}>
                                        <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center border border-slate-200 text-[8px] font-black text-slate-300">{String.fromCharCode(65 + i)}</span>
                                        <div className="flex-1"><EditableField value={opt} onSave={(v: any) => { const n = [...(q.options||[])]; n[i]=v; updateQuestion(q.id, {options: n}); }} className="text-xs font-medium" /></div>
                                        {isBuilderMode && (
                                          <button onClick={() => deleteOption(q.id, i)} className="p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover/opt:opacity-100 no-print" title="Delete Option"><Trash2 className="w-3.5 h-3.5" /></button>
                                        )}
                                     </div>
                                  ))}
                               </div>
                               {isBuilderMode && (
                                 <button onClick={() => addOption(questionId)} className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-100 rounded-xl text-[10px] font-black uppercase text-slate-300 hover:border-blue-300 hover:text-blue-500 transition-all no-print"><PlusCircle className="w-4 h-4" /> Add Option</button>
                               )}
                             </div>
                          )}

                          {q.type === QuestionType.CHARACTER_DRILL && (
                             <SymbolDrillRow symbols={q.question.charAt(0) || 'A'} />
                          )}
                          
                          {q.type === QuestionType.SYMBOL_DRILL && (
                             <SymbolDrillRow symbols={q.question} />
                          )}

                          {q.type === QuestionType.SENTENCE_DRILL && (
                             <DraggableLineRow text={q.question} showTraceButton />
                          )}

                          {q.type === QuestionType.CREATIVE_PROMPT && (
                             <div className="mt-4 border-2 border-dashed border-slate-100 rounded-[2rem] h-48 bg-slate-50/20" />
                          )}

                          {q.type === QuestionType.LAB_PROCEDURE && (
                             <div className="mt-4 space-y-4">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-300"><Scissors className="w-3 h-3" /> Experimental Setup Area</div>
                                <div className="grid grid-cols-2 gap-4">
                                   <div className="h-32 border border-slate-100 rounded-xl bg-slate-50/30" />
                                   <div className="h-32 border border-slate-100 rounded-xl bg-slate-50/30" />
                                </div>
                             </div>
                          )}

                          {(q.type === QuestionType.SHORT_ANSWER || q.type === QuestionType.ESSAY || q.type === QuestionType.VOCABULARY) && (
                             <div className="space-y-4 pt-4">
                                <div className={`h-[0.5px] bg-slate-200 w-full ${selectedStyle === 'Creative' ? 'border-b border-dashed bg-transparent h-1' : ''}`} />
                                <div className={`h-[0.5px] bg-slate-200 w-full opacity-50 ${selectedStyle === 'Creative' ? 'border-b border-dashed bg-transparent h-1' : ''}`} />
                                {q.type === QuestionType.ESSAY && <div className={`h-[0.5px] bg-slate-200 w-full opacity-20 ${selectedStyle === 'Creative' ? 'border-b border-dashed bg-transparent h-1' : ''}`} />}
                             </div>
                          )}
                       </div>
                    </div>
                  );
                })}
              </div>
              
              {isBuilderMode && (
                <div className="mt-16 no-print border-t-4 border-slate-50 pt-12 animate-in slide-in-from-bottom-4">
                   <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-3">
                      <Layout className="w-5 h-5" /> Append Architectural Nodes
                   </h4>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <button onClick={() => addQuestion(QuestionType.MCQ)} className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-slate-100 rounded-3xl hover:border-blue-500 hover:bg-blue-50 transition-all group">
                         <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-white group-hover:text-blue-600 transition-all"><ListOrdered className="w-6 h-6" /></div>
                         <span className="text-[9px] font-black uppercase">Standard MCQ</span>
                      </button>
                      <button onClick={() => addQuestion(QuestionType.SHORT_ANSWER)} className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-slate-100 rounded-3xl hover:border-blue-500 hover:bg-blue-50 transition-all group">
                         <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-white group-hover:text-blue-600 transition-all"><TypeIcon className="w-6 h-6" /></div>
                         <span className="text-[9px] font-black uppercase">Free Response</span>
                      </button>
                      <button onClick={() => addQuestion(QuestionType.SENTENCE_DRILL)} className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-slate-100 rounded-3xl hover:border-blue-500 hover:bg-blue-50 transition-all group">
                         <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-white group-hover:text-blue-600 transition-all"><AlignLeft className="w-6 h-6" /></div>
                         <span className="text-[9px] font-black uppercase">Sentence Drill</span>
                      </button>
                      <button onClick={() => addQuestion(QuestionType.SYMBOL_DRILL)} className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-slate-100 rounded-3xl hover:border-blue-500 hover:bg-blue-50 transition-all group">
                         <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-white group-hover:text-blue-600 transition-all"><Braces className="w-6 h-6" /></div>
                         <span className="text-[9px] font-black uppercase">Symbol Drill</span>
                      </button>
                      <button onClick={() => addQuestion(QuestionType.LAB_PROCEDURE)} className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-slate-100 rounded-3xl hover:border-blue-500 hover:bg-blue-50 transition-all group">
                         <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-white group-hover:text-blue-600 transition-all"><Settings className="w-6 h-6" /></div>
                         <span className="text-[9px] font-black uppercase">Lab Procedure</span>
                      </button>
                      <button onClick={() => addQuestion(QuestionType.CREATIVE_PROMPT)} className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-slate-100 rounded-3xl hover:border-blue-500 hover:bg-blue-50 transition-all group">
                         <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-white group-hover:text-blue-600 transition-all"><Sparkles className="w-6 h-6" /></div>
                         <span className="text-[9px] font-black uppercase">Creative Prompt</span>
                      </button>
                      <button onClick={() => addQuestion(QuestionType.CHARACTER_DRILL)} className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-slate-100 rounded-3xl hover:border-blue-500 hover:bg-blue-50 transition-all group">
                         <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-white group-hover:text-blue-600 transition-all"><PenTool className="w-6 h-6" /></div>
                         <span className="text-[9px] font-black uppercase">Letter Drill</span>
                      </button>
                      <button onClick={() => addQuestion(QuestionType.PAGE_BREAK)} className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-slate-100 rounded-3xl hover:border-blue-500 hover:bg-blue-50 transition-all group">
                         <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-white group-hover:text-blue-600 transition-all"><Scissors className="w-6 h-6" /></div>
                         <span className="text-[9px] font-black uppercase">Page Break</span>
                      </button>
                   </div>
                </div>
              )}
           </div>
           {doodles.map((d, i) => (
             <img key={i} src={d} className="absolute pointer-events-none opacity-10 mix-blend-multiply w-32 h-32" style={{ top: `${15 + i*20}%`, left: i%2===0 ? '3%' : '85%' }} />
           ))}
           <div className="mt-32 pt-8 border-t-2 border-slate-100 flex justify-between items-end opacity-20 text-[6px] font-black uppercase tracking-[0.4em]">
              <div>{worksheet.institutionName} • Suite Node {worksheet.id?.slice(-4).toUpperCase()}</div>
              <div className="text-right">Validation: OK</div>
           </div>
        </div>

        {showKey && (
          <div className="mt-24 p-16 bg-white border-t-4 border-slate-900 page-break-before">
             <div className="flex items-center gap-4 mb-12 pb-8 border-b border-slate-100">
                <ShieldCheck className="w-10 h-10" /><h2 className={`text-5xl font-black uppercase tracking-tighter italic ${getHeaderFont()}`}>Key Registry</h2>
             </div>
             <div className="space-y-12">
                {worksheet.questions.filter(q => q.type !== QuestionType.PAGE_BREAK).map((q, idx) => (
                  <div key={`key-${q.id}`} className="flex gap-10 items-start border-l-2 border-slate-200 pl-10">
                     <span className="text-2xl font-black opacity-10 mt-1">{idx + 1}</span>
                     <div className="flex-1 space-y-4">
                        <div className={`p-6 bg-slate-50 border border-slate-100 rounded-xl ${selectedStyle === 'Creative' ? 'rounded-[2rem] border-dashed bg-white' : ''}`}>
                           <p className="text-[7px] font-black uppercase text-slate-400 mb-2">Verified Solution</p>
                           <p className="text-xl font-black"><EditableField value={q.correctAnswer} onSave={(v: any) => updateQuestion(q.id, {correctAnswer: v})} /></p>
                        </div>
                        {q.explanation && (
                           <div className="pt-2">
                             <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Instructional Commentary</p>
                             <p className="text-xs font-medium text-slate-500 italic"><EditableField multiline value={q.explanation} onSave={(v: any) => updateQuestion(q.id, {explanation: v})} /></p>
                           </div>
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
