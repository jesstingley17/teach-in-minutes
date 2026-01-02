
import React, { useState, useRef, useEffect } from 'react';
import { AppMode, Worksheet, ThemeType, QuestionType, DocumentType, AudienceCategory, LearnerProfile } from './types';
import { generateWorksheet, analyzeSourceMaterial } from './services/geminiService';
import { WorksheetView } from './components/WorksheetView';
import { QuizView } from './components/QuizView';
import { MarkerHighlight } from './components/HandwritingElements';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  FileText, PlayCircle, GraduationCap, 
  Loader2, Upload, ArrowRight, ArrowLeft, 
  CheckCircle2, Save, Plus, 
  Minus, Wand2, Printer, 
  Globe, FileStack, Sigma, 
  Baby, School, Building2, UserCircle, 
  Zap, Brain, Languages, Users
} from 'lucide-react';

const CATEGORIES = [
  { id: AudienceCategory.EARLY_YEARS, label: 'Early Years', icon: Baby, sub: ['Pre-K', 'Kindergarten'] },
  { id: AudienceCategory.PRIMARY, label: 'Primary', icon: School, sub: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'] },
  { id: AudienceCategory.MIDDLE_SCHOOL, label: 'Middle', icon: School, sub: ['Grade 6', 'Grade 7', 'Grade 8'] },
  { id: AudienceCategory.HIGH_SCHOOL, label: 'High School', icon: GraduationCap, sub: ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'] },
  { id: AudienceCategory.UNIVERSITY, label: 'Higher Ed', icon: Building2, sub: ['Undergrad (Intro)', 'Undergrad (Advanced)', 'Postgrad', 'PhD Research'] },
  { id: AudienceCategory.PROFESSIONAL, label: 'Professional', icon: UserCircle, sub: ['Corporate Training', 'Certification', 'Technical Spec'] }
];

const PROFILES = [
  { id: LearnerProfile.GENERAL, label: 'General Ed', icon: Users, color: 'text-slate-500' },
  { id: LearnerProfile.SPECIAL_ED, label: 'IEP / SpEd', icon: Brain, color: 'text-purple-500' },
  { id: LearnerProfile.GIFTED, label: 'Gifted/Talented', icon: Zap, color: 'text-yellow-500' },
  { id: LearnerProfile.ESL_ELL, label: 'ESL / ELL', icon: Languages, color: 'text-blue-500' }
];

const WorksheetSkeleton: React.FC = () => (
  <div className="w-full max-w-4xl mx-auto bg-white p-[15mm] shadow-2xl min-h-[297mm] relative border border-slate-100">
    <div className="animate-pulse space-y-12">
      <div className="flex justify-between items-start">
        <div className="space-y-4 flex-1">
          <div className="h-10 bg-slate-200 rounded w-3/4"></div>
          <div className="h-4 bg-slate-100 rounded w-1/2"></div>
        </div>
        <div className="h-24 w-24 bg-slate-100 rounded"></div>
      </div>
      <div className="h-20 bg-slate-50 rounded-lg"></div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-4">
          <div className="flex gap-4">
            <div className="h-8 w-8 bg-slate-200"></div>
            <div className="h-6 bg-slate-100 rounded flex-1"></div>
          </div>
          <div className="ml-12 h-20 bg-slate-50 border-b border-dashed border-slate-200"></div>
        </div>
      ))}
    </div>
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[2px]">
      <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-4 border-slate-900 flex flex-col items-center space-y-6">
        <Loader2 className="w-16 h-16 text-slate-900 animate-spin" />
        <div className="text-center">
          <p className="font-black text-3xl text-slate-900 uppercase tracking-tighter">Drafting Academic Material</p>
          <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-2">AI is structuring your assessment...</p>
        </div>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.GENERATOR);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [worksheet, setWorksheet] = useState<Worksheet | null>(null);
  const [savedWorksheets, setSavedWorksheets] = useState<Worksheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTeacherKey, setShowTeacherKey] = useState(false);
  const [isMathMode, setIsMathMode] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [formData, setFormData] = useState({
    topic: '',
    customTitle: '',
    audienceCategory: AudienceCategory.HIGH_SCHOOL,
    educationalLevel: 'Grade 10',
    learnerProfile: LearnerProfile.GENERAL,
    difficulty: 'Medium',
    language: 'English',
    documentType: DocumentType.EXAM,
    rawText: '',
    questionCounts: {
      [QuestionType.MCQ]: 3,
      [QuestionType.TF]: 2,
      [QuestionType.SHORT_ANSWER]: 2,
    }
  });

  const [fileData, setFileData] = useState<{ data: string; mimeType: string; name: string; preview?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('tm_v3_saved');
    if (saved) setSavedWorksheets(JSON.parse(saved));
  }, []);

  const handleSave = (wsToSave: Worksheet) => {
    const newSaved = [wsToSave, ...savedWorksheets.filter(w => w.id !== wsToSave.id)].slice(0, 20);
    localStorage.setItem('tm_v3_saved', JSON.stringify(newSaved));
    setSavedWorksheets(newSaved);
  };

  const handleGenerate = async () => {
    if (!formData.topic.trim()) return alert("Please specify a topic.");
    setLoading(true);
    try {
      const result = await generateWorksheet({
        ...formData,
        questionCounts: formData.questionCounts as Record<string, number>,
        isMathMode
      });
      setWorksheet({ ...result, id: Date.now().toString(), savedAt: Date.now() });
      setMode(AppMode.WORKSHEET);
    } catch (e) {
      alert("Generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64String = result.split(',')[1];
        setFileData({ data: base64String, mimeType: file.type, name: file.name, preview: file.type.startsWith('image/') ? result : undefined });
        setIsAnalyzing(true);
        analyzeSourceMaterial({ data: base64String, mimeType: file.type }, formData.rawText).then(res => {
          if (res) setFormData(p => ({...p, customTitle: res.suggestedTitle, topic: res.suggestedTopicScope}));
          setIsAnalyzing(false);
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const updateCount = (type: string, delta: number) => {
    setFormData(p => ({
      ...p,
      questionCounts: { ...p.questionCounts, [type]: Math.max(0, (p.questionCounts as any)[type] + delta) }
    }));
  };

  const activeCategory = CATEGORIES.find(c => c.id === formData.audienceCategory);

  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-80 bg-white border-r border-slate-200 hidden lg:flex flex-col fixed h-full z-20 no-print">
        <div className="p-8 border-b border-slate-100">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xl rotate-3">
                 <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                 <h1 className="font-black text-xl tracking-tighter leading-none">TEACH IN MINUTES</h1>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Academic V3.0</span>
              </div>
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
           <nav className="space-y-2">
              <button onClick={() => { setMode(AppMode.GENERATOR); setCurrentStep(1); }} className={`w-full flex items-center gap-3 p-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${mode === AppMode.GENERATOR ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
                 <Plus className="w-4 h-4" /> New Session
              </button>
              <button onClick={() => worksheet && setMode(AppMode.WORKSHEET)} disabled={!worksheet} className={`w-full flex items-center gap-3 p-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${mode === AppMode.WORKSHEET ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 disabled:opacity-30'}`}>
                 <FileText className="w-4 h-4" /> Active Editor
              </button>
           </nav>

           <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-4">Saved Library</h3>
              <div className="space-y-3">
                 {savedWorksheets.map(sw => (
                    <div key={sw.id} onClick={() => { setWorksheet(sw); setMode(AppMode.WORKSHEET); }} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-md cursor-pointer transition-all group">
                       <div className="font-black text-[11px] uppercase truncate text-slate-700">{sw.title}</div>
                       <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase">{sw.documentType} • {sw.topic.slice(0, 20)}...</div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </aside>

      <main className="flex-1 lg:ml-80 min-h-screen">
        <div className="max-w-6xl mx-auto p-8">
           {loading ? <WorksheetSkeleton /> : (
             <>
               {mode === AppMode.GENERATOR && (
                 <div className="max-w-4xl mx-auto py-12">
                   <header className="text-center mb-16">
                      <h2 className="text-6xl font-black tracking-tighter text-slate-900 mb-4 uppercase">
                        Generate <MarkerHighlight>Excellence</MarkerHighlight>
                      </h2>
                      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">AI-Powered Academic Content Studio</p>
                      
                      <div className="flex justify-center gap-4 mt-12">
                         {[1, 2, 3].map(s => (
                           <div key={s} className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all border-2 ${currentStep === s ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-110' : currentStep > s ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-200 text-slate-300'}`}>
                              {currentStep > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                           </div>
                         ))}
                      </div>
                   </header>

                   <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col min-h-[600px]">
                      <div className="p-12 flex-1">
                        {currentStep === 1 && (
                          <div className="animate-in slide-in-from-right duration-500 space-y-12">
                             <section>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 block">1. Select Learner Developmental Stage</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                   {CATEGORIES.map(cat => (
                                     <button 
                                       key={cat.id}
                                       onClick={() => setFormData({ ...formData, audienceCategory: cat.id, educationalLevel: cat.sub[0] })}
                                       className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 group ${formData.audienceCategory === cat.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-slate-50 border-slate-100 hover:border-slate-300 text-slate-600'}`}
                                     >
                                        <cat.icon className={`w-8 h-8 ${formData.audienceCategory === cat.id ? 'text-white' : 'text-slate-400'}`} />
                                        <span className="font-black text-[10px] uppercase tracking-widest">{cat.label}</span>
                                     </button>
                                   ))}
                                </div>
                             </section>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <section className="animate-in fade-in duration-700">
                                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 block">2. Exact Level / Grade</label>
                                   <select 
                                     className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-700 outline-none focus:border-slate-900"
                                     value={formData.educationalLevel}
                                     onChange={(e) => setFormData({...formData, educationalLevel: e.target.value})}
                                   >
                                      {activeCategory?.sub.map(s => <option key={s} value={s}>{s}</option>)}
                                   </select>
                                </section>

                                <section>
                                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 block">3. Document Settings</label>
                                   <div className="space-y-4">
                                      <div className="flex gap-4">
                                         <select className="flex-1 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xs text-slate-700 outline-none" value={formData.documentType} onChange={e => setFormData({...formData, documentType: e.target.value as DocumentType})}>
                                            {Object.values(DocumentType).map(t => <option key={t} value={t}>{t}</option>)}
                                         </select>
                                         <select className="flex-1 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xs text-slate-700 outline-none" value={formData.language} onChange={e => setFormData({...formData, language: e.target.value})}>
                                            <option>English</option><option>Spanish</option><option>French</option><option>German</option>
                                         </select>
                                      </div>
                                   </div>
                                </section>
                             </div>

                             <section>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 block">4. Learner Profile & Context</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                   {PROFILES.map(prof => (
                                      <button 
                                        key={prof.id}
                                        onClick={() => setFormData({ ...formData, learnerProfile: prof.id })}
                                        className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${formData.learnerProfile === prof.id ? 'bg-white border-slate-900 ring-4 ring-slate-100' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}
                                      >
                                         <prof.icon className={`w-5 h-5 ${prof.color}`} />
                                         <span className="font-black text-[9px] uppercase tracking-widest text-slate-700">{prof.label}</span>
                                      </button>
                                   ))}
                                </div>
                             </section>

                             <div className="p-4 bg-blue-50/50 border-2 border-blue-100 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                   <Sigma className="w-5 h-5 text-blue-600" />
                                   <span className="font-black text-[10px] uppercase tracking-widest text-blue-900">Enable Math Mode (LaTeX Rendering)</span>
                                </div>
                                <button onClick={() => setIsMathMode(!isMathMode)} className={`w-14 h-8 rounded-full transition-all relative ${isMathMode ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                   <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${isMathMode ? 'left-7' : 'left-1'}`} />
                                </button>
                             </div>
                          </div>
                        )}

                        {currentStep === 2 && (
                          <div className="animate-in slide-in-from-right duration-500 h-full flex flex-col gap-8">
                             <div className="flex gap-4 p-2 bg-slate-100 rounded-2xl">
                                <button onClick={() => fileInputRef.current?.click()} className="flex-1 p-6 bg-white rounded-xl shadow-sm border border-slate-200 text-center hover:border-slate-400 transition-all flex flex-col items-center">
                                   <Upload className="w-8 h-8 text-blue-500 mb-2" />
                                   <span className="font-black text-[10px] uppercase tracking-widest">Upload Source</span>
                                   <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
                                </button>
                             </div>
                             <div className="relative">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Direct Material Input</label>
                                <textarea 
                                  className="w-full h-40 p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-medium text-slate-700 focus:bg-white focus:border-slate-900 outline-none resize-none transition-all"
                                  placeholder="Paste lecture notes, text segments, or prompts..."
                                  value={formData.rawText}
                                  onChange={e => setFormData({...formData, rawText: e.target.value})}
                                />
                                {isAnalyzing && <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-[2rem] backdrop-blur-sm"><Loader2 className="w-8 h-8 animate-spin text-slate-900" /></div>}
                             </div>
                          </div>
                        )}

                        {currentStep === 3 && (
                          <div className="animate-in slide-in-from-right duration-500 h-full flex flex-col gap-8">
                             <div className="space-y-6">
                                <div>
                                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Content Focus & Count</label>
                                   <div className="grid grid-cols-2 gap-4">
                                      {Object.entries(formData.questionCounts).map(([type, count]) => (
                                         <div key={type} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                            <span className="font-black text-[10px] uppercase tracking-tighter text-slate-600">{type.replace('_', ' ')}</span>
                                            <div className="flex items-center gap-3">
                                               <button onClick={() => updateCount(type, -1)} className="p-1 text-slate-300 hover:text-slate-600"><Minus className="w-4 h-4" /></button>
                                               <span className="font-black text-sm w-4 text-center">{count}</span>
                                               <button onClick={() => updateCount(type, 1)} className="p-1 text-slate-300 hover:text-slate-600"><Plus className="w-4 h-4" /></button>
                                            </div>
                                         </div>
                                      ))}
                                   </div>
                                </div>
                                
                                <button onClick={handleGenerate} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl uppercase tracking-widest hover:bg-slate-800 transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-4 mt-8">
                                   <Wand2 className="w-6 h-6 text-yellow-400" /> Construct Assessment
                                </button>
                             </div>
                          </div>
                        )}
                      </div>

                      <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                         <button onClick={() => setCurrentStep(p => p - 1)} disabled={currentStep === 1} className="flex items-center gap-2 px-6 py-3 text-slate-400 font-black uppercase tracking-widest text-[10px] disabled:opacity-0">
                            <ArrowLeft className="w-4 h-4" /> Back
                         </button>
                         <button onClick={() => setCurrentStep(p => p + 1)} disabled={currentStep === 3} className="flex items-center gap-2 px-10 py-4 bg-white border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-sm hover:border-slate-900 active:scale-95 transition-all">
                            Next Step <ArrowRight className="w-4 h-4" />
                         </button>
                      </div>
                   </div>
                 </div>
               )}

               {mode === AppMode.WORKSHEET && worksheet && (
                 <div className="py-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <WorksheetView worksheet={worksheet} theme={ThemeType.ACADEMIC} showKey={showTeacherKey} isMathMode={isMathMode} onUpdate={(newWs) => setWorksheet(newWs)} />
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/80 backdrop-blur-md p-3 rounded-3xl shadow-2xl border border-slate-200 z-50 no-print">
                       <button onClick={() => setShowTeacherKey(!showTeacherKey)} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all ${showTeacherKey ? 'bg-red-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                          {showTeacherKey ? 'Hide Key' : 'Show Key'}
                       </button>
                       <button onClick={() => setMode(AppMode.QUIZ)} className="px-6 py-3 bg-purple-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg">
                          <PlayCircle className="w-4 h-4" /> Start Practice
                       </button>
                       <button onClick={async () => {
                          const element = document.getElementById('worksheet-content');
                          if (!element) return;
                          setLoading(true);
                          const canvas = await html2canvas(element, { scale: 3, useCORS: true });
                          const pdf = new jsPDF('p', 'mm', 'a4');
                          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
                          pdf.save(`${worksheet.title}.pdf`);
                          setLoading(false);
                       }} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                          <Printer className="w-4 h-4" /> Export PDF
                       </button>
                       <button onClick={() => handleSave(worksheet)} className="px-6 py-3 bg-yellow-400 text-yellow-900 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                          <Save className="w-4 h-4" /> Save
                       </button>
                    </div>
                 </div>
               )}

               {mode === AppMode.QUIZ && worksheet && (
                  <QuizView worksheet={worksheet} theme={ThemeType.ACADEMIC} onExit={() => setMode(AppMode.WORKSHEET)} isMathMode={isMathMode} />
               )}
             </>
           )}
        </div>
      </main>
    </div>
  );
};

export default App;
