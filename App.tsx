
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
  Image as ImageIcon, Globe, Search, Brain, ListOrdered, FileText
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
      alert("Institutional asset processing failed. Please try again.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSmartMap = async () => {
    if (!formData.guidelineData && !formData.rawText) {
      alert("Source material required. Please upload a file or paste text first.");
      return;
    }
    setIsScanning(true);
    try {
      const lessons = await analyzeCurriculum({ 
        text: formData.rawText, 
        file: formData.guidelineData 
      });

      if (lessons.length === 0) {
        throw new Error("No distinct units found.");
      }

      // Strictly map one unit per detected lesson
      const mappedIntents = lessons.map((lesson, idx) => ({
        id: Math.random().toString(),
        type: DocumentType.QUIZ, 
        profile: LearnerProfile.GENERAL,
        layout: LayoutStyle.LAID_TEACH,
        depth: CognitiveDepth.APPLICATION,
        questionCounts: { [QuestionType.MCQ]: 5, [QuestionType.SHORT_ANSWER]: 1 },
        specificInstructions: `UNIT ${idx + 1}: ${lesson.title}. Objective: ${lesson.summary}. Ensure questions target: ${lesson.suggestedQuestions.join(', ')}.`
      }));

      setSuiteIntents(mappedIntents);
      if (!formData.topic) setFormData({ ...formData, topic: "Automated Course Content" });
    } catch (e) {
      console.error("Scanning Error:", e);
      alert("Curriculum scanning encountered an issue. Please try providing more context or a clearer document structure.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleGenerate = async () => {
    if (!formData.topic) { alert("Please provide a subject topic."); return; }
    if (suiteIntents.length === 0) { alert("The generation pipeline is empty."); return; }
    
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
      const updatedArchive = [...processed, ...local].slice(0, 100);
      localStorage.setItem(`archive_${prefix}`, JSON.stringify(updatedArchive));

      setSavedWorksheets(updatedArchive);
      setCurrentBulkSet(processed);
      setMode(AppMode.BULK_REVIEW);
    } catch (e: any) { 
      console.error("Generation Error:", e);
      alert(e.message || "The synthesis engine failed to materialize your suite. Try simplifying the node requirements.");
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
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-slate-900 mx-auto" />
        <p className="font-black text-[10px] uppercase tracking-widest text-slate-400">Restoring Architect Profile</p>
      </div>
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
           <button onClick={() => { setMode(AppMode.GENERATOR); setSuiteIntents([{ id: Math.random().toString(), type: DocumentType.HOMEWORK, profile: LearnerProfile.GENERAL, layout: LayoutStyle.LAID_TEACH, depth: CognitiveDepth.UNDERSTANDING, questionCounts: { [QuestionType.MCQ]: 5, [QuestionType.SHORT_ANSWER]: 2 } }]); }} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-transform hover:bg-slate-800">
              <Plus className="w-4 h-4 inline mr-2" /> New Suite Node
           </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
           <div className="flex justify-between items-center">
             <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Library Archive</h3>
             <span className="text-[8px] font-black bg-slate-100 px-2 py-0.5 rounded-full">{savedWorksheets.length}</span>
           </div>
           <div className="space-y-1">
              {savedWorksheets.map(ws => (
                <div key={ws.id} className="p-3 rounded-xl hover:bg-slate-50 cursor-pointer group transition-colors border border-transparent hover:border-slate-100" onClick={() => { setWorksheet(ws); setMode(AppMode.WORKSHEET); }}>
                   <span className="text-[10px] font-black uppercase block truncate group-hover:text-blue-600">{ws.title}</span>
                   <span className="text-[8px] font-bold text-slate-300 uppercase">{ws.documentType}</span>
                </div>
              ))}
              {savedWorksheets.length === 0 && (
                <div className="py-12 text-center opacity-30">
                  <Library className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-[8px] font-black uppercase">Repository Clear</p>
                </div>
              )}
           </div>
        </div>
        <div className="p-6 border-t border-slate-50 space-y-2">
           <div className="flex items-center gap-3 px-3 py-2 mb-2 bg-slate-50 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-slate-900" />
              </div>
              <span className="text-[9px] font-black uppercase text-slate-900">{user?.name}</span>
           </div>
           <button onClick={() => setMode(AppMode.SETTINGS)} className="w-full p-3 rounded-xl flex items-center gap-3 font-black text-[9px] uppercase text-slate-400 hover:text-slate-900 transition-colors">
              <Settings className="w-4 h-4" /> Identity Settings
           </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-72 min-h-screen relative bg-white">
        <div className="p-8 lg:p-12 pb-32">
          {loading || isScanning ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in zoom-in duration-500">
               <div className="relative">
                  <Loader2 className="w-20 h-20 animate-spin text-slate-900" />
                  <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-pulse" />
               </div>
               <div className="max-w-sm">
                 <h2 className="text-4xl font-black uppercase tracking-tighter italic">
                   {isScanning ? "Mapping Curriculum" : "Synthesizing Suite"}
                 </h2>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2 leading-relaxed">
                   {isScanning 
                     ? "Breaking source material into distinct instructional lessons..." 
                     : `Materializing ${suiteIntents.length} custom units for the subject of ${formData.topic || 'the curriculum'}.`
                   }
                 </p>
               </div>
            </div>
          ) : mode === AppMode.ONBOARDING ? (
            <div className="max-w-4xl mx-auto py-12 animate-in fade-in duration-1000">
               <div className="text-center mb-16">
                  <div className="w-16 h-16 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h2 className="text-5xl font-black uppercase tracking-tighter italic">Intellectual Intake</h2>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Provide raw content for automatic lesson distribution</p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-12 border-2 border-slate-100 rounded-[3rem] hover:border-slate-900 transition-all cursor-pointer group flex flex-col justify-between bg-slate-50/50" onClick={() => guidelineInputRef.current?.click()}>
                     <input type="file" ref={guidelineInputRef} className="hidden" accept=".pdf,image/*" onChange={e => {
                        const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => { 
                           setFormData({...formData, guidelineData: { data: (r.result as string).split(',')[1], mimeType: f.type, name: f.name }});
                           setMode(AppMode.GENERATOR);
                        }; r.readAsDataURL(f); }
                     }} />
                     <div>
                        <div className="w-14 h-14 bg-white shadow-md rounded-2xl flex items-center justify-center mb-8 group-hover:bg-slate-900 group-hover:text-white transition-all"><CloudUpload className="w-6 h-6" /></div>
                        <h3 className="text-3xl font-black uppercase tracking-tight italic">Source Mapping</h3>
                        <p className="text-slate-400 font-bold text-xs mt-4 leading-relaxed uppercase">Ingest syllabi or chapters for 1:1 unit generation.</p>
                     </div>
                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-900 mt-12 flex items-center gap-2">Load Artifact <ChevronRight className="w-3 h-3" /></span>
                  </div>
                  <div className="p-12 bg-slate-900 rounded-[3rem] flex flex-col justify-between cursor-pointer hover:bg-slate-800 transition-all shadow-2xl" onClick={() => setMode(AppMode.GENERATOR)}>
                     <div>
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-8 text-white"><Zap className="w-6 h-6" /></div>
                        <h3 className="text-3xl font-black uppercase tracking-tight text-white italic">Direct Architect</h3>
                        <p className="text-white/40 font-bold text-xs mt-4 leading-relaxed uppercase">Bypass analysis and build your suite from scratch.</p>
                     </div>
                     <span className="text-[9px] font-black uppercase tracking-widest text-white/60 mt-12 flex items-center gap-2">Manual Entry <ChevronRight className="w-3 h-3" /></span>
                  </div>
               </div>
            </div>
          ) : mode === AppMode.GENERATOR ? (
            <div className="max-w-6xl mx-auto py-4">
               <header className="mb-12 flex justify-between items-end">
                  <div>
                    <h2 className="text-6xl font-black uppercase tracking-tighter italic">Suite Studio</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2 italic">Architecting instructional unit pipelines</p>
                  </div>
                  <button onClick={() => setMode(AppMode.ONBOARDING)} className="text-slate-300 hover:text-slate-900 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest transition-colors"><ArrowLeft className="w-4 h-4" /> Reset Workshop</button>
               </header>
               <div className="grid grid-cols-12 gap-12">
                  <div className="col-span-12 lg:col-span-4 space-y-8">
                     <div className="bg-slate-50 p-8 rounded-[2.5rem] space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Microscope className="w-3.5 h-3.5" /> Subject Domain</h3>
                        <input className="w-full p-5 bg-white border-2 rounded-2xl font-black text-xl outline-none focus:border-slate-900" placeholder="e.g. Political Economy" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
                        
                        {(formData.guidelineData || formData.rawText) && (
                          <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-[2rem] space-y-4 animate-in slide-in-from-top-4 shadow-sm">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-700 flex items-center gap-2">
                              <Brain className="w-4 h-4" /> Intelligence Layer
                            </h4>
                            <p className="text-[9px] font-bold text-blue-600 uppercase leading-relaxed">
                              Source content detected. Auto-map will materialize one unit node for every detected lesson.
                            </p>
                            <button 
                              onClick={() => applyTemplate('one_per_lesson')} 
                              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg active:scale-95"
                            >
                              <ListOrdered className="w-4 h-4" /> Auto-Map: 1 per Lesson
                            </button>
                          </div>
                        )}

                        <div className="space-y-4 pt-4 border-t">
                           <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Global Templates</label>
                           <div className="grid grid-cols-1 gap-3">
                              <button onClick={() => applyTemplate('assessment_pack')} className="w-full p-4 bg-white border-2 border-slate-100 hover:border-slate-900 rounded-2xl text-left transition-all">
                                 <span className="text-[9px] font-black uppercase text-slate-900 block mb-1">Standard Pack</span>
                                 <span className="text-[8px] font-bold text-slate-400 uppercase italic">HW + Quiz + Formal Exam</span>
                              </button>
                              <button onClick={() => applyTemplate('differentiation_pack')} className="w-full p-4 bg-white border-2 border-slate-100 hover:border-slate-900 rounded-2xl text-left transition-all">
                                 <span className="text-[9px] font-black uppercase text-slate-900 block mb-1">Diversity Suite</span>
                                 <span className="text-[8px] font-bold text-slate-400 uppercase italic">Multi-Tier Scaffolding</span>
                              </button>
                           </div>
                        </div>
                     </div>
                  </div>
                  <div className="col-span-12 lg:col-span-8 space-y-6">
                     <div className="flex justify-between items-center px-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Node Pipeline ({suiteIntents.length} Units)</h3>
                        <button onClick={addContainer} className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-md hover:scale-105 active:scale-95">
                           <Plus className="w-4 h-4" /> Add Manual Unit
                        </button>
                     </div>
                     <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar p-2">
                        {suiteIntents.map((intent, i) => (
                           <div key={intent.id} className="group relative bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 hover:border-slate-900 transition-all shadow-sm">
                              <div className="flex justify-between items-start mb-4">
                                 <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 bg-slate-100 text-slate-900 rounded-lg flex items-center justify-center font-black text-xs shadow-sm">{i + 1}</div>
                                    <h4 className="font-black text-lg uppercase tracking-tight italic">
                                      {intent.specificInstructions?.includes("UNIT") 
                                        ? intent.specificInstructions.split(":")[0].replace("UNIT", "LESSON")
                                        : intent.type
                                      }
                                    </h4>
                                 </div>
                                 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => setEditingContainerIdx(i)} className="p-2 text-slate-400 hover:text-blue-600"><Settings2 className="w-4 h-4" /></button>
                                    <button onClick={() => setSuiteIntents(suiteIntents.filter((_, idx) => idx !== i))} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                 </div>
                              </div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase italic truncate mb-6">
                                 {intent.specificInstructions || "General domain assessment coverage..."}
                              </p>
                              <div className="flex gap-3">
                                 <div className="px-3 py-1 bg-slate-50 rounded-full text-[8px] font-black uppercase text-slate-400 border">{intent.profile}</div>
                                 <div className="px-3 py-1 bg-slate-50 rounded-full text-[8px] font-black uppercase text-slate-400 border">{intent.depth}</div>
                              </div>
                           </div>
                        ))}
                        {suiteIntents.length === 0 && (
                          <div className="py-20 text-center border-2 border-dashed rounded-[3rem] border-slate-100 bg-slate-50/50">
                             <Target className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                             <p className="text-xs font-black uppercase text-slate-300">Pipeline Empty</p>
                          </div>
                        )}
                     </div>
                     {suiteIntents.length > 0 && (
                        <div className="pt-12 flex justify-center">
                           <button onClick={handleGenerate} className="px-20 py-8 bg-slate-900 text-white rounded-[3rem] font-black text-2xl uppercase tracking-tighter flex items-center gap-6 shadow-2xl hover:scale-[1.02] active:scale-95 transition-all">
                              <Sparkles className="w-8 h-8 text-yellow-400" /> Synthesis Master Suite
                           </button>
                        </div>
                     )}
                  </div>
               </div>
               {editingContainerIdx !== null && (
                 <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-white w-full max-w-xl rounded-[3.5rem] shadow-2xl p-12 relative animate-in zoom-in duration-300">
                       <button onClick={() => setEditingContainerIdx(null)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900"><XCircle className="w-8 h-8" /></button>
                       <h3 className="text-3xl font-black uppercase italic mb-8">Unit Architect</h3>
                       <div className="space-y-6">
                          <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Pedagogical Guardrails</label>
                            <textarea 
                              className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-bold text-xs min-h-[120px] focus:border-slate-900 outline-none transition-all"
                              value={suiteIntents[editingContainerIdx].specificInstructions || ''}
                              onChange={e => updateIntent(editingContainerIdx, { specificInstructions: e.target.value })}
                              placeholder="e.g. Prioritize thermodynamic laws..."
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              {Object.values(QuestionType).map(type => (
                                <div key={type} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <span className="text-[10px] font-black uppercase text-slate-600">{type}</span>
                                    <div className="flex items-center gap-3">
                                      <button onClick={() => updateQuestionCount(editingContainerIdx, type, Math.max(0, (suiteIntents[editingContainerIdx].questionCounts[type] || 0) - 1))} className="w-8 h-8 flex border rounded-xl items-center justify-center hover:bg-white">-</button>
                                      <span className="font-black text-xs min-w-[1.5rem] text-center">{suiteIntents[editingContainerIdx].questionCounts[type] || 0}</span>
                                      <button onClick={() => updateQuestionCount(editingContainerIdx, type, (suiteIntents[editingContainerIdx].questionCounts[type] || 0) + 1)} className="w-8 h-8 flex border rounded-xl items-center justify-center hover:bg-white">+</button>
                                    </div>
                                </div>
                              ))}
                          </div>
                       </div>
                       <button onClick={() => setEditingContainerIdx(null)} className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Apply Parameters</button>
                    </div>
                 </div>
               )}
            </div>
          ) : mode === AppMode.BULK_REVIEW ? (
            <div className="max-w-6xl mx-auto py-12 animate-in fade-in duration-700">
               <header className="mb-16 flex justify-between items-end">
                  <div>
                    <h2 className="text-6xl font-black uppercase tracking-tighter italic">Unit Repository</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Materialized {currentBulkSet.length} units for domain: {formData.topic}</p>
                  </div>
                  <button onClick={() => setMode(AppMode.GENERATOR)} className="px-8 py-3 bg-slate-100 rounded-2xl font-black text-[10px] uppercase shadow-sm hover:bg-slate-200 transition-colors">Return to Studio</button>
               </header>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {currentBulkSet.map((ws) => (
                     <div key={ws.id} className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 flex flex-col justify-between hover:border-slate-900 transition-all group shadow-sm">
                        <div>
                           <span className="px-3 py-1 bg-slate-50 border rounded-lg text-[8px] font-black uppercase text-slate-400 block w-fit mb-4">{ws.documentType}</span>
                           <h3 className="text-2xl font-black uppercase italic mb-8 line-clamp-3 leading-tight">{ws.title}</h3>
                        </div>
                        <button onClick={() => { setWorksheet(ws); setMode(AppMode.WORKSHEET); }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">Inspect Node</button>
                     </div>
                  ))}
               </div>
            </div>
          ) : mode === AppMode.SETTINGS ? (
            <div className="max-w-4xl mx-auto py-12 animate-in fade-in duration-500">
               <header className="mb-12 border-b pb-8 flex items-end justify-between">
                 <h2 className="text-5xl font-black uppercase italic">Identity</h2>
                 <button onClick={() => setMode(AppMode.ONBOARDING)} className="text-slate-400 hover:text-slate-900"><XCircle className="w-8 h-8" /></button>
               </header>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                     <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Organization Identity</label><input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-slate-900 outline-none transition-all" value={branding.institutionName} onChange={e => { const n = {...branding, institutionName: e.target.value}; setBranding(n); localStorage.setItem('institutional_branding', JSON.stringify(n)); }} /></div>
                     <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Instructor Signature</label><input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-slate-900 outline-none transition-all" value={branding.instructorName} onChange={e => { const n = {...branding, instructorName: e.target.value}; setBranding(n); localStorage.setItem('institutional_branding', JSON.stringify(n)); }} /></div>
                     <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Google Cloud Client ID</label><input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-slate-900 outline-none transition-all" value={branding.googleClientId || ''} placeholder="Client ID for G-Drive Sync" onChange={e => { const n = {...branding, googleClientId: e.target.value}; setBranding(n); localStorage.setItem('institutional_branding', JSON.stringify(n)); }} /></div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Logo Resource</label>
                        <button onClick={() => logoInputRef.current?.click()} className="w-full p-4 border-2 border-dashed rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:border-slate-900 transition-colors bg-slate-50">
                          {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />} Select Institutional Asset
                        </button>
                        <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                     </div>
                  </div>
                  <div className="p-12 bg-slate-900 rounded-[3rem] text-white flex flex-col items-center justify-center text-center shadow-2xl"><Globe className="w-16 h-16 mb-8 text-blue-400" /><h3 className="text-2xl font-black uppercase italic">Global Identity Sync</h3><p className="text-white/40 text-[10px] font-bold uppercase mt-4 leading-relaxed">Changes to identity portal will automatically propagate to every unit materialized in your workspace archive.</p></div>
               </div>
            </div>
          ) : mode === AppMode.QUIZ && worksheet ? (
            <QuizView worksheet={worksheet} theme={branding.defaultTheme} onExit={() => setMode(AppMode.WORKSHEET)} isMathMode={true} />
          ) : worksheet && (
            <div className="animate-in fade-in duration-500">
               <WorksheetView worksheet={worksheet} theme={branding.defaultTheme} showKey={showTeacherKey} onUpdate={setWorksheet} onLaunchQuiz={() => setMode(AppMode.QUIZ)} onSaveSuccess={fetchUserContent} />
               <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/95 p-4 rounded-full shadow-2xl border border-slate-100 z-[90] no-print backdrop-blur-md">
                  <button onClick={() => setShowTeacherKey(!showTeacherKey)} className={`px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${showTeacherKey ? 'bg-red-600 text-white' : 'bg-slate-50 border hover:bg-slate-100'}`}>{showTeacherKey ? 'Hide Registry' : 'Solution Registry'}</button>
                  <button onClick={() => setMode(AppMode.QUIZ)} className="px-8 py-3 bg-blue-600 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-blue-700 transition-all"><PlayCircle className="w-4 h-4" /> Practice Quiz</button>
                  <button onClick={() => setMode(AppMode.GENERATOR)} className="px-8 py-3 bg-slate-900 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-800">Architect Mode</button>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
