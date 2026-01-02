
import React, { useState, useRef, useEffect } from 'react';
import { AppMode, Worksheet, ThemeType, QuestionType, DocumentType, AudienceCategory, LearnerProfile, CurriculumStandard, BrandingConfig, LayoutStyle, CognitiveDepth } from './types.ts';
import { generateWorksheet, analyzeCurriculum, LessonStructure } from './services/geminiService.ts';
import { uploadAsset } from './services/blobService.ts';
import { WorksheetView } from './components/WorksheetView.tsx';
import { QuizView } from './components/QuizView.tsx';
import { 
  GraduationCap, Loader2, Plus, Sparkles, CloudUpload, 
  BookOpen, XCircle, Library, Eye,
  Languages, BrainCircuit, Star, Zap, Construction, Target,
  Settings, Layers, ChevronRight, Layout, Palette, Trash2, ArrowLeft,
  Settings2, Sliders, ListChecks, Hash, Gauge, Microscope, Copy, Check, User, PlayCircle,
  Image as ImageIcon, Globe, Search, Brain
} from 'lucide-react';

const DEFAULT_BRANDING: BrandingConfig = {
  institutionName: 'Institutional Academy',
  instructorName: 'Lead Educator',
  primaryColor: '#0f172a',
  customDomain: 'edu-portal',
  defaultTheme: ThemeType.GAMMA
};

const App: React.FC = () => {
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [mode, setMode] = useState<AppMode>(AppMode.ONBOARDING);
  const [worksheet, setWorksheet] = useState<Worksheet | null>(null);
  const [currentBulkSet, setCurrentBulkSet] = useState<Worksheet[]>([]);
  const [savedWorksheets, setSavedWorksheets] = useState<Worksheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showTeacherKey, setShowTeacherKey] = useState(false);
  const [editingContainerIdx, setEditingContainerIdx] = useState<number | null>(null);
  
  const [branding, setBranding] = useState<BrandingConfig & { googleClientId?: string }>(DEFAULT_BRANDING);
  
  const [suiteIntents, setSuiteIntents] = useState<any[]>([
    { 
      id: Math.random().toString(),
      type: DocumentType.HOMEWORK, 
      profile: LearnerProfile.GENERAL, 
      layout: LayoutStyle.LAID_TEACH,
      depth: CognitiveDepth.UNDERSTANDING,
      questionCounts: { [QuestionType.MCQ]: 5, [QuestionType.SHORT_ANSWER]: 2 }
    }
  ]);

  const [formData, setFormData] = useState({
    topic: '',
    lessonTitle: '',
    moduleTitle: '',
    audienceCategory: AudienceCategory.UNIVERSITY,
    educationalLevel: 'Degree Level',
    language: 'English',
    rawText: '',
    guidelineData: null as any
  });

  const guidelineInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedBranding = localStorage.getItem('institutional_branding');
    if (savedBranding) setBranding(JSON.parse(savedBranding));

    let localUser = localStorage.getItem('local_user_profile');
    if (!localUser) {
      const newUser = { id: 'local-arch-' + Math.random().toString(36).substr(2, 4), name: 'Local Architect' };
      localStorage.setItem('local_user_profile', JSON.stringify(newUser));
      setUser(newUser);
    } else {
      setUser(JSON.parse(localUser));
    }
    
    setAuthLoading(false);
  }, []);

  useEffect(() => { 
    if (user) fetchUserContent(); 
  }, [user]);

  const fetchUserContent = async () => {
    const prefix = user?.id || 'local-arch';
    const local = JSON.parse(localStorage.getItem(`archive_${prefix}`) || '[]');
    setSavedWorksheets(local);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadAsset(file);
      const updatedBranding = { ...branding, logoUrl: url };
      setBranding(updatedBranding);
      localStorage.setItem('institutional_branding', JSON.stringify(updatedBranding));
    } catch (err) {
      console.error("Upload Error:", err);
      alert("Asset sync failed.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSmartMap = async () => {
    if (!formData.guidelineData && !formData.rawText) {
      alert("Please upload a source file first to scan for lessons.");
      return;
    }
    setIsScanning(true);
    try {
      const lessons = await analyzeCurriculum({ 
        text: formData.rawText, 
        file: formData.guidelineData 
      });

      if (lessons.length === 0) {
        alert("Could not detect a clear lesson structure. Try manually adding nodes.");
        return;
      }

      // Create one node per lesson detected
      const newIntents = lessons.map((lesson, idx) => ({
        id: Math.random().toString(),
        type: DocumentType.QUIZ, // Defaulting to quiz as requested, user can change
        profile: LearnerProfile.GENERAL,
        layout: LayoutStyle.LAID_TEACH,
        depth: CognitiveDepth.APPLICATION,
        questionCounts: { [QuestionType.MCQ]: 5, [QuestionType.SHORT_ANSWER]: 2 },
        specificInstructions: `Focus specifically on Lesson ${idx + 1}: ${lesson.title}. Concept summary: ${lesson.summary}`
      }));

      setSuiteIntents(newIntents);
      setFormData({ ...formData, topic: formData.topic || "Curriculum Overview" });
    } catch (e) {
      alert("Scanning failed. Please check your source material.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleGenerate = async () => {
    if (!formData.topic) { alert("Specify a topic to proceed."); return; }
    setLoading(true);
    try {
      const results = await generateWorksheet({ 
        ...formData, 
        containerIntents: suiteIntents,
        fileData: formData.guidelineData || undefined 
      });

      const processed = results.map((ws, i) => ({
        ...ws,
        id: Math.random().toString(36).substr(2, 9),
        instructorName: branding.instructorName,
        institutionName: branding.institutionName,
        logoUrl: branding.logoUrl,
        savedAt: Date.now() + i
      }));

      const prefix = user?.id || 'local-arch';
      const local = JSON.parse(localStorage.getItem(`archive_${prefix}`) || '[]');
      const updatedArchive = [...processed, ...local].slice(0, 50);
      localStorage.setItem(`archive_${prefix}`, JSON.stringify(updatedArchive));

      setSavedWorksheets(updatedArchive);
      setCurrentBulkSet(processed);
      setMode(AppMode.BULK_REVIEW);
    } catch (e: any) { 
      alert(e.message || "Synthesis engine encountered an error.");
    } finally { setLoading(false); }
  };

  const addContainer = () => setSuiteIntents([...suiteIntents, { 
    id: Math.random().toString(),
    type: DocumentType.QUIZ, 
    profile: LearnerProfile.GENERAL, 
    layout: LayoutStyle.CLASSIC,
    depth: CognitiveDepth.APPLICATION,
    questionCounts: { [QuestionType.MCQ]: 5 }
  }]);

  const applyTemplate = (type: 'assessment_pack' | 'differentiation_pack' | 'one_per_lesson') => {
    if (type === 'one_per_lesson') {
      handleSmartMap();
      return;
    }
    if (type === 'assessment_pack') {
      setSuiteIntents([
        { id: '1', type: DocumentType.HOMEWORK, profile: LearnerProfile.GENERAL, layout: LayoutStyle.LAID_TEACH, depth: CognitiveDepth.UNDERSTANDING, questionCounts: { [QuestionType.MCQ]: 5, [QuestionType.SHORT_ANSWER]: 2 } },
        { id: '2', type: DocumentType.QUIZ, profile: LearnerProfile.GENERAL, layout: LayoutStyle.CLASSIC, depth: CognitiveDepth.APPLICATION, questionCounts: { [QuestionType.MCQ]: 10 } },
        { id: '3', type: DocumentType.EXAM, profile: LearnerProfile.GENERAL, layout: LayoutStyle.ARCHITECT, depth: CognitiveDepth.EVALUATION, questionCounts: { [QuestionType.MCQ]: 10, [QuestionType.ESSAY]: 1 } }
      ]);
    } else if (type === 'differentiation_pack') {
      setSuiteIntents([
        { id: '1', type: DocumentType.ASSIGNMENT, profile: LearnerProfile.GENERAL, layout: LayoutStyle.LAID_TEACH, depth: CognitiveDepth.APPLICATION, questionCounts: { [QuestionType.SHORT_ANSWER]: 5 } },
        { id: '2', type: DocumentType.ASSIGNMENT, profile: LearnerProfile.ESL_ELL, layout: LayoutStyle.MODULAR, depth: CognitiveDepth.UNDERSTANDING, questionCounts: { [QuestionType.MCQ]: 5, [QuestionType.VOCABULARY]: 3 } },
        { id: '3', type: DocumentType.ASSIGNMENT, profile: LearnerProfile.GIFTED, layout: LayoutStyle.ARCHITECT, depth: CognitiveDepth.CREATION, questionCounts: { [QuestionType.ESSAY]: 2 } }
      ]);
    }
  };

  const updateIntent = (idx: number, updates: any) => {
    const n = [...suiteIntents];
    n[idx] = { ...n[idx], ...updates };
    setSuiteIntents(n);
  };

  const updateQuestionCount = (containerIdx: number, type: QuestionType, count: number) => {
    const n = [...suiteIntents];
    n[containerIdx].questionCounts = { ...n[containerIdx].questionCounts, [type]: count };
    setSuiteIntents(n);
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-12 h-12 animate-spin text-slate-300" />
    </div>
  );

  return (
    <div className="min-h-screen flex bg-white font-sans text-slate-900">
      <aside className="w-72 border-r border-slate-100 hidden lg:flex flex-col fixed h-full z-20 no-print bg-white">
        <div className="p-8 border-b border-slate-50">
           <div className="flex items-center gap-3 mb-10 cursor-pointer" onClick={() => setMode(AppMode.ONBOARDING)}>
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white"><GraduationCap className="w-6 h-6" /></div>
              <h1 className="font-black text-lg uppercase tracking-tight">Blueprint Pro</h1>
           </div>
           <button onClick={() => { setMode(AppMode.GENERATOR); setSuiteIntents([{ id: Math.random().toString(), type: DocumentType.HOMEWORK, profile: LearnerProfile.GENERAL, layout: LayoutStyle.LAID_TEACH, depth: CognitiveDepth.UNDERSTANDING, questionCounts: { [QuestionType.MCQ]: 5, [QuestionType.SHORT_ANSWER]: 2 } }]); }} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-transform">
              <Plus className="w-4 h-4 inline mr-2" /> New Workspace
           </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
           <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Library Archive</h3>
           <div className="space-y-1">
              {savedWorksheets.map(ws => (
                <div key={ws.id} className="p-3 rounded-xl hover:bg-slate-50 cursor-pointer group transition-colors" onClick={() => { setWorksheet(ws); setMode(AppMode.WORKSHEET); }}>
                   <span className="text-[10px] font-black uppercase block truncate group-hover:text-blue-600">{ws.title}</span>
                   <span className="text-[8px] font-bold text-slate-300 uppercase">{ws.documentType}</span>
                </div>
              ))}
              {savedWorksheets.length === 0 && (
                <div className="py-12 text-center opacity-30">
                  <Library className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-[8px] font-black uppercase">Archive Empty</p>
                </div>
              )}
           </div>
        </div>
        <div className="p-6 border-t border-slate-50 space-y-2">
           <div className="flex items-center gap-3 px-3 py-2 mb-2 bg-slate-50 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <span className="text-[9px] font-black uppercase text-slate-500">{user?.name}</span>
           </div>
           <button onClick={() => setMode(AppMode.SETTINGS)} className="w-full p-3 rounded-xl flex items-center gap-3 font-black text-[9px] uppercase text-slate-400 hover:text-slate-900 transition-colors">
              <Settings className="w-4 h-4" /> Branding Portal
           </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-72 min-h-screen relative bg-white">
        <div className="p-8 lg:p-12 pb-32">
          {loading || isScanning ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in zoom-in">
               <div className="relative">
                  <Loader2 className="w-20 h-20 animate-spin text-slate-900" />
                  <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-pulse" />
               </div>
               <div className="max-w-sm">
                 <h2 className="text-4xl font-black uppercase tracking-tighter italic">
                   {isScanning ? "Scanning Curriculum" : "Materializing Suite"}
                 </h2>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2 leading-relaxed">
                   {isScanning 
                     ? "Parsing uploaded source to identify individual lessons and modules..." 
                     : `Synthesizing pedagogical nodes for ${formData.topic}...`
                   }
                 </p>
               </div>
            </div>
          ) : mode === AppMode.ONBOARDING ? (
            <div className="max-w-4xl mx-auto py-12 animate-in fade-in duration-700">
               <div className="text-center mb-16">
                  <Library className="w-12 h-12 mx-auto mb-6 text-slate-900" />
                  <h2 className="text-5xl font-black uppercase tracking-tighter italic">Source Intake</h2>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Onboard Content for Automatic Unit Mapping</p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-12 border-2 border-slate-100 rounded-[3rem] hover:border-slate-900 transition-all cursor-pointer group flex flex-col justify-between" onClick={() => guidelineInputRef.current?.click()}>
                     <input type="file" ref={guidelineInputRef} className="hidden" accept=".pdf,image/*" onChange={e => {
                        const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => { 
                           setFormData({...formData, guidelineData: { data: (r.result as string).split(',')[1], mimeType: f.type, name: f.name }});
                           setMode(AppMode.GENERATOR);
                        }; r.readAsDataURL(f); }
                     }} />
                     <div>
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-slate-900 group-hover:text-white transition-all"><CloudUpload className="w-6 h-6" /></div>
                        <h3 className="text-3xl font-black uppercase tracking-tight italic">Content Aware</h3>
                        <p className="text-slate-400 font-bold text-xs mt-4 leading-relaxed uppercase">Upload your syllabus or textbook to auto-map lessons.</p>
                     </div>
                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-900 mt-12 flex items-center gap-2">Attach Source <ChevronRight className="w-3 h-3" /></span>
                  </div>
                  <div className="p-12 bg-slate-900 rounded-[3rem] flex flex-col justify-between cursor-pointer hover:bg-slate-800 transition-all" onClick={() => setMode(AppMode.GENERATOR)}>
                     <div>
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-8 text-white"><Zap className="w-6 h-6" /></div>
                        <h3 className="text-3xl font-black uppercase tracking-tight text-white italic">Blank Canvas</h3>
                        <p className="text-white/40 font-bold text-xs mt-4 leading-relaxed uppercase">Manually architect units from conceptual prompts.</p>
                     </div>
                     <span className="text-[9px] font-black uppercase tracking-widest text-white/60 mt-12 flex items-center gap-2">Direct Entry <ChevronRight className="w-3 h-3" /></span>
                  </div>
               </div>
            </div>
          ) : mode === AppMode.GENERATOR ? (
            <div className="max-w-6xl mx-auto py-4">
               <header className="mb-12 flex justify-between items-end">
                  <div>
                    <h2 className="text-6xl font-black uppercase tracking-tighter italic">Instrument Studio</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2 italic italic">Constructing unit-perfect assessment suites</p>
                  </div>
                  <button onClick={() => setMode(AppMode.ONBOARDING)} className="text-slate-300 hover:text-slate-900 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest transition-colors"><ArrowLeft className="w-4 h-4" /> Back to Library</button>
               </header>
               <div className="grid grid-cols-12 gap-12">
                  <div className="col-span-12 lg:col-span-4 space-y-8">
                     <div className="bg-slate-50 p-8 rounded-[2.5rem] space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Microscope className="w-3.5 h-3.5" /> Course Subject</h3>
                        <input className="w-full p-5 bg-white border-2 rounded-2xl font-black text-xl outline-none focus:border-slate-900" placeholder="e.g. Modern European History" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
                        
                        {(formData.guidelineData || formData.rawText) && (
                          <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-[2rem] space-y-4 animate-in slide-in-from-top-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-700 flex items-center gap-2">
                              <Brain className="w-4 h-4" /> Curriculum Intelligence
                            </h4>
                            <p className="text-[9px] font-bold text-blue-600 uppercase leading-relaxed">
                              Source detected. Click below to automatically map one node to every lesson found in your material.
                            </p>
                            <button 
                              onClick={() => applyTemplate('one_per_lesson')} 
                              className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-md"
                            >
                              <Search className="w-4 h-4" /> Scan & Auto-Map Suite
                            </button>
                          </div>
                        )}

                        <div className="space-y-4 pt-4 border-t">
                           <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Global Presets</label>
                           <div className="grid grid-cols-1 gap-3">
                              <button onClick={() => applyTemplate('assessment_pack')} className="w-full p-4 bg-white border-2 border-slate-100 hover:border-slate-900 rounded-2xl text-left transition-all group">
                                 <span className="text-[9px] font-black uppercase text-slate-900 block mb-1">Unit Pack</span>
                                 <span className="text-[8px] font-bold text-slate-400 uppercase italic">Homework + Quiz + Exam</span>
                              </button>
                              <button onClick={() => applyTemplate('differentiation_pack')} className="w-full p-4 bg-white border-2 border-slate-100 hover:border-slate-900 rounded-2xl text-left transition-all group">
                                 <span className="text-[9px] font-black uppercase text-slate-900 block mb-1">Diversity Suite</span>
                                 <span className="text-[8px] font-bold text-slate-400 uppercase italic">General + ESL + Advanced</span>
                              </button>
                           </div>
                        </div>
                     </div>
                  </div>
                  <div className="col-span-12 lg:col-span-8 space-y-6">
                     <div className="flex justify-between items-center px-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unit Workspace ({suiteIntents.length} Units)</h3>
                        <button onClick={addContainer} className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-full font-black text-[10px] uppercase tracking-widest transition-all shadow-md hover:scale-105 active:scale-95">
                           <Plus className="w-4 h-4" /> Manual Unit
                        </button>
                     </div>
                     <div className="space-y-4">
                        {suiteIntents.map((intent, i) => (
                           <div key={intent.id} className="group relative bg-white border-2 border-slate-100 rounded-[2rem] p-8 hover:border-slate-900 transition-all shadow-sm">
                              <div className="flex justify-between items-start mb-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-xs">{i + 1}</div>
                                    <h4 className="font-black text-lg uppercase tracking-tight italic">
                                      {intent.specificInstructions?.includes("Lesson") 
                                        ? intent.specificInstructions.split(":")[0] 
                                        : intent.type
                                      }
                                    </h4>
                                 </div>
                                 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => setEditingContainerIdx(i)} className="p-2 text-slate-400 hover:text-blue-600"><Settings2 className="w-4 h-4" /></button>
                                    <button onClick={() => setSuiteIntents(suiteIntents.filter((_, idx) => idx !== i))} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                 </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                 <div className="col-span-3">
                                   <p className="text-[9px] font-bold text-slate-400 uppercase italic truncate">
                                      {intent.specificInstructions || "Universal topic coverage..."}
                                   </p>
                                 </div>
                                 <div className="flex justify-end items-end">
                                    <button onClick={() => setEditingContainerIdx(i)} className="w-full p-2 bg-slate-100 text-slate-600 rounded-lg font-black text-[9px] uppercase hover:bg-slate-200">Refine unit</button>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                     <div className="pt-12 flex justify-center">
                        <button onClick={handleGenerate} className="px-20 py-8 bg-slate-900 text-white rounded-[2.5rem] font-black text-2xl uppercase tracking-tighter flex items-center gap-6 shadow-2xl hover:scale-[1.02] active:scale-95 transition-all">
                           <Sparkles className="w-8 h-8 text-yellow-400" /> Synthesis Suite
                        </button>
                     </div>
                  </div>
               </div>
               {editingContainerIdx !== null && (
                 <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-12 relative">
                       <button onClick={() => setEditingContainerIdx(null)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900"><XCircle className="w-8 h-8" /></button>
                       <h3 className="text-3xl font-black uppercase italic mb-8">Unit Architect</h3>
                       <div className="space-y-6">
                          <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Instructional Focus</label>
                            <textarea 
                              className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold text-xs"
                              value={suiteIntents[editingContainerIdx].specificInstructions || ''}
                              onChange={e => updateIntent(editingContainerIdx, { specificInstructions: e.target.value })}
                              placeholder="e.g. Focus on Chapter 4: Photosynthesis..."
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              {Object.values(QuestionType).map(type => (
                                <div key={type} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border">
                                    <span className="text-[10px] font-black uppercase text-slate-600">{type}</span>
                                    <div className="flex items-center gap-3">
                                      <button onClick={() => updateQuestionCount(editingContainerIdx, type, Math.max(0, (suiteIntents[editingContainerIdx].questionCounts[type] || 0) - 1))} className="w-6 h-6 flex border rounded">-</button>
                                      <span className="font-black text-xs">{suiteIntents[editingContainerIdx].questionCounts[type] || 0}</span>
                                      <button onClick={() => updateQuestionCount(editingContainerIdx, type, (suiteIntents[editingContainerIdx].questionCounts[type] || 0) + 1)} className="w-6 h-6 flex border rounded">+</button>
                                    </div>
                                </div>
                              ))}
                          </div>
                       </div>
                    </div>
                 </div>
               )}
            </div>
          ) : mode === AppMode.BULK_REVIEW ? (
            <div className="max-w-6xl mx-auto py-12 animate-in fade-in">
               <header className="mb-16 flex justify-between items-end">
                  <div>
                    <h2 className="text-6xl font-black uppercase tracking-tighter italic">Unit Archive</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Materialized {currentBulkSet.length} units for: {formData.topic}</p>
                  </div>
                  <button onClick={() => setMode(AppMode.GENERATOR)} className="px-8 py-3 bg-slate-100 rounded-2xl font-black text-[10px] uppercase">New Architect</button>
               </header>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {currentBulkSet.map((ws) => (
                     <div key={ws.id} className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-10 flex flex-col justify-between hover:border-slate-900 transition-all group shadow-sm">
                        <div>
                           <span className="px-3 py-1 bg-slate-50 border rounded text-[8px] font-black uppercase text-slate-400 block w-fit mb-4">{ws.documentType}</span>
                           <h3 className="text-2xl font-black uppercase italic mb-8 line-clamp-2">{ws.title}</h3>
                        </div>
                        <button onClick={() => { setWorksheet(ws); setMode(AppMode.WORKSHEET); }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">Inspect Unit</button>
                     </div>
                  ))}
               </div>
            </div>
          ) : mode === AppMode.SETTINGS ? (
            <div className="max-w-4xl mx-auto py-12">
               <header className="mb-12 border-b pb-8"><h2 className="text-5xl font-black uppercase italic italic">Identity Portal</h2></header>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                     <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Organization Identity</label><input className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold" value={branding.institutionName} onChange={e => { const n = {...branding, institutionName: e.target.value}; setBranding(n); localStorage.setItem('institutional_branding', JSON.stringify(n)); }} /></div>
                     <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Instructor Name</label><input className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold" value={branding.instructorName} onChange={e => { const n = {...branding, instructorName: e.target.value}; setBranding(n); localStorage.setItem('institutional_branding', JSON.stringify(n)); }} /></div>
                     <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Google Client ID</label><input className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold" value={branding.googleClientId || ''} placeholder="Client ID for cloud syncing" onChange={e => { const n = {...branding, googleClientId: e.target.value}; setBranding(n); localStorage.setItem('institutional_branding', JSON.stringify(n)); }} /></div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400">Logo Signature</label>
                        <button onClick={() => logoInputRef.current?.click()} className="w-full p-4 border-2 border-dashed rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2">
                          {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />} Institutional Asset
                        </button>
                        <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                     </div>
                  </div>
                  <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white flex flex-col items-center justify-center text-center"><Globe className="w-12 h-12 mb-6" /><h3 className="text-2xl font-black uppercase italic">Global Identity</h3><p className="text-white/40 text-[10px] font-bold uppercase mt-4">Settings persist across all instrument nodes.</p></div>
               </div>
            </div>
          ) : mode === AppMode.QUIZ && worksheet ? (
            <QuizView worksheet={worksheet} theme={branding.defaultTheme} onExit={() => setMode(AppMode.WORKSHEET)} isMathMode={true} />
          ) : worksheet && (
            <div className="animate-in fade-in">
               <WorksheetView worksheet={worksheet} theme={branding.defaultTheme} showKey={showTeacherKey} onUpdate={setWorksheet} onLaunchQuiz={() => setMode(AppMode.QUIZ)} onSaveSuccess={fetchUserContent} />
               <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/95 p-3 rounded-full shadow-2xl border border-slate-100 z-[90] no-print backdrop-blur-md">
                  <button onClick={() => setShowTeacherKey(!showTeacherKey)} className={`px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${showTeacherKey ? 'bg-red-600 text-white' : 'bg-slate-50 border hover:bg-slate-100'}`}>{showTeacherKey ? 'Hide Solutions' : 'Solution Registry'}</button>
                  <button onClick={() => setMode(AppMode.QUIZ)} className="px-8 py-3 bg-blue-600 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-blue-700 transition-all"><PlayCircle className="w-4 h-4" /> Interactive Quiz</button>
                  <button onClick={() => setMode(AppMode.GENERATOR)} className="px-8 py-3 bg-slate-900 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl">Architect Studio</button>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
