
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
  Image as ImageIcon, Globe, Search, Brain, ListOrdered, FileText, Key, Info, Activity, Wifi, WifiOff,
  Terminal, ShieldAlert, RefreshCw, Server
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
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [isVerifyingKey, setIsVerifyingKey] = useState(false);
  const [showConnectionManager, setShowConnectionManager] = useState(false);

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

  /**
   * REFINED AI CONNECTIVITY CHECK
   * Detects both injected process.env keys and platform helpers.
   */
  const checkAIConnectivity = async () => {
    setIsVerifyingKey(true);
    
    // 1. Check for standard environment key
    const rawKey = (window as any).process?.env?.API_KEY || process.env.API_KEY;
    const hasEnvKey = !!rawKey && rawKey !== 'undefined' && rawKey !== 'null' && rawKey.trim().length > 0;
    
    // 2. Check for AI Studio platform key session
    let hasPlatformKey = false;
    try {
      // @ts-ignore
      if (window.aistudio?.hasSelectedApiKey) {
        // @ts-ignore
        hasPlatformKey = await window.aistudio.hasSelectedApiKey();
      }
    } catch (e) {
      console.warn("AI Studio key session check failed/skipped:", e);
    }

    setApiKeyMissing(!hasEnvKey && !hasPlatformKey);
    setIsVerifyingKey(false);
    return { hasEnvKey, hasPlatformKey };
  };

  useEffect(() => {
    checkAIConnectivity();

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

    // Dynamic re-sync heartbeat
    const interval = setInterval(checkAIConnectivity, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    const status = await checkAIConnectivity();
    if (!status.hasEnvKey && !status.hasPlatformKey) {
       // @ts-ignore
       if (window.aistudio?.openSelectKey) {
         try {
           // @ts-ignore
           await window.aistudio.openSelectKey();
           setApiKeyMissing(false);
           await checkAIConnectivity();
         } catch (e) {
           console.error("Manual selector failed:", e);
         }
       } else {
         alert("No API Key detected in environment. Please ensure 'API_KEY' is set in your project environment settings.");
       }
    } else {
      setApiKeyMissing(false);
      setShowConnectionManager(false);
    }
  };

  const handleConnectApiKey = async () => {
    setShowConnectionManager(true);
  };

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
      alert("Logo processing failed.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSmartMap = async () => {
    if (!formData.guidelineData && !formData.rawText) {
      alert("Source material required for curriculum mapping.");
      return;
    }
    setIsScanning(true);
    try {
      const lessons = await analyzeCurriculum({ 
        text: formData.rawText, 
        file: formData.guidelineData 
      });

      if (!lessons || lessons.length === 0) {
        throw new Error("No distinct units found in this document.");
      }

      const mappedIntents = lessons.map((lesson, idx) => ({
        id: Math.random().toString(),
        type: DocumentType.QUIZ, 
        profile: LearnerProfile.GENERAL,
        layout: LayoutStyle.LAID_TEACH,
        depth: CognitiveDepth.APPLICATION,
        questionCounts: { [QuestionType.MCQ]: 5, [QuestionType.SHORT_ANSWER]: 1 },
        specificInstructions: `UNIT ${idx + 1}: ${lesson.title}. Objective: ${lesson.summary}. Questions target: ${lesson.suggestedQuestions.join(', ')}.`
      }));

      setSuiteIntents(mappedIntents);
      if (!formData.topic) setFormData({ ...formData, topic: lessons[0].title });
    } catch (e: any) {
      console.error("Mapping Error:", e);
      if (e.message?.includes("Requested entity was not found") || e.message?.includes("API_KEY") || e.message?.includes("401")) {
        setApiKeyMissing(true);
        setShowConnectionManager(true);
      } else {
        alert(`Analysis Error: ${e.message}`);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleGenerate = async () => {
    if (!formData.topic) { alert("Please provide a subject domain topic."); return; }
    if (suiteIntents.length === 0) { alert("Pipeline is empty."); return; }
    
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
      if (e.message?.includes("Requested entity was not found") || e.message?.includes("API_KEY") || e.message?.includes("401")) {
        setApiKeyMissing(true);
        setShowConnectionManager(true);
      } else {
        alert("Suite synthesis failed. Ensure your AI connection is verified.");
      }
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
        <p className="font-black text-[10px] uppercase tracking-widest text-slate-400">Initializing Educational Architect</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-white font-sans text-slate-900">
      {/* Connection Manager Modal */}
      {showConnectionManager && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300 no-print">
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 relative border-t-8 border-slate-900 animate-in zoom-in duration-300">
              <button onClick={() => setShowConnectionManager(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900"><XCircle className="w-8 h-8" /></button>
              <header className="mb-10 text-center">
                 <div className={`w-16 h-16 rounded-3xl mx-auto mb-6 flex items-center justify-center ${apiKeyMissing ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                    {apiKeyMissing ? <WifiOff className="w-8 h-8" /> : <Wifi className="w-8 h-8" />}
                 </div>
                 <h2 className="text-4xl font-black uppercase tracking-tighter italic">AI Bridge Studio</h2>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">Manage Gemini 3 Pro Reasoning Core</p>
              </header>
              <div className="space-y-6">
                 <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <p className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-2"><Server className="w-3 h-3" /> Environment Registry</p>
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-slate-700 uppercase">process.env.API_KEY</span>
                       <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${apiKeyMissing ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                          {apiKeyMissing ? 'Missing' : 'Handshake Active'}
                       </span>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-1 gap-4">
                    <button onClick={handleManualSync} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95 transition-all shadow-xl">
                       <RefreshCw className={`w-4 h-4 ${isVerifyingKey ? 'animate-spin' : ''}`} /> Force Manual Handshake
                    </button>
                    {/* Only show "Select Platform Key" if we are in an environment that supports it */}
                    {/* @ts-ignore */}
                    {window.aistudio && (
                       <button onClick={async () => { 
                         // @ts-ignore
                         await window.aistudio.openSelectKey(); 
                         await checkAIConnectivity(); 
                       }} className="w-full py-5 border-2 border-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-4">
                          <Key className="w-4 h-4" /> Select Platform Secret
                       </button>
                    )}
                 </div>
                 
                 <div className="pt-6 border-t border-slate-100 text-center">
                    <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase">
                       The API Key must be configured in your environment variables. 
                       If it's already there, use 'Force Manual Handshake' to re-sync.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      )}

      <aside className="w-72 border-r border-slate-100 hidden lg:flex flex-col fixed h-full z-20 no-print bg-white">
        <div className="p-8 border-b border-slate-50">
           <div className="flex items-center gap-3 mb-10 cursor-pointer" onClick={() => setMode(AppMode.ONBOARDING)}>
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg"><GraduationCap className="w-6 h-6" /></div>
              <h1 className="font-black text-lg uppercase tracking-tight">Blueprint Pro</h1>
           </div>
           <button onClick={() => { setMode(AppMode.GENERATOR); setSuiteIntents([{ id: Math.random().toString(), type: DocumentType.HOMEWORK, profile: LearnerProfile.GENERAL, layout: LayoutStyle.LAID_TEACH, depth: CognitiveDepth.UNDERSTANDING, questionCounts: { [QuestionType.MCQ]: 5, [QuestionType.SHORT_ANSWER]: 2 } }]); }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-slate-800">
              <Plus className="w-4 h-4 inline mr-2" /> New Design Node
           </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
           <div className="flex justify-between items-center">
             <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Workspace Archive</h3>
             <span className="text-[8px] font-black bg-slate-100 px-2 py-0.5 rounded-full">{savedWorksheets.length}</span>
           </div>
           <div className="space-y-1">
              {savedWorksheets.map(ws => (
                <div key={ws.id} className="p-3 rounded-xl hover:bg-slate-50 cursor-pointer group transition-colors border border-transparent hover:border-slate-100" onClick={() => { setWorksheet(ws); setMode(AppMode.WORKSHEET); }}>
                   <span className="text-[10px] font-black uppercase block truncate group-hover:text-blue-600">{ws.title}</span>
                   <span className="text-[8px] font-bold text-slate-300 uppercase">{ws.documentType} • {ws.educationalLevel}</span>
                </div>
              ))}
              {savedWorksheets.length === 0 && (
                <div className="py-12 text-center opacity-30">
                  <Library className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-[8px] font-black uppercase">No Nodes Materialized</p>
                </div>
              )}
           </div>
        </div>
        
        {/* Connection Status Bar - Always Visible */}
        <div className="px-6 py-4 border-t border-slate-50">
           <button 
             onClick={handleConnectApiKey}
             className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left group ${apiKeyMissing ? 'bg-red-50 border-red-100 hover:bg-red-100' : 'bg-green-50 border-green-100 hover:bg-green-100'}`}
           >
              <div className="relative">
                 {apiKeyMissing ? (
                   <WifiOff className="w-4 h-4 text-red-500" />
                 ) : (
                   <>
                     <Wifi className="w-4 h-4 text-green-500" />
                     <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                   </>
                 )}
              </div>
              <div className="flex-1">
                 <p className={`text-[8px] font-black uppercase tracking-widest ${apiKeyMissing ? 'text-red-600' : 'text-green-600'}`}>
                   {isVerifyingKey ? 'Synchronizing...' : apiKeyMissing ? 'AI Engine: Offline' : 'AI Engine: Online'}
                 </p>
                 <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">
                   {apiKeyMissing ? 'Action Required' : 'Manual Bridge Active'}
                 </p>
              </div>
              {!apiKeyMissing && <Check className="w-3 h-3 text-green-400" />}
              {apiKeyMissing && <ChevronRight className="w-3 h-3 text-red-300 group-hover:translate-x-1 transition-transform" />}
           </button>
        </div>

        <div className="p-6 border-t border-slate-50 space-y-2">
           <div className="flex items-center gap-3 px-3 py-2 mb-2 bg-slate-50 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-slate-900" />
              </div>
              <span className="text-[9px] font-black uppercase text-slate-900">{user?.name}</span>
           </div>
           <button onClick={() => setMode(AppMode.SETTINGS)} className="w-full p-3 rounded-xl flex items-center gap-3 font-black text-[9px] uppercase text-slate-400 hover:text-slate-900 transition-colors">
              <Settings className="w-4 h-4" /> Branding Portal
           </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-72 min-h-screen relative bg-white">
        {/* Connection Failure Overlay for Generator */}
        {apiKeyMissing && mode === AppMode.GENERATOR && (
           <div className="absolute inset-0 bg-white/60 backdrop-blur-md z-40 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-24 h-24 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-xl animate-bounce">
                 <ShieldAlert className="w-12 h-12" />
              </div>
              <h2 className="text-5xl font-black uppercase tracking-tighter italic mb-4">AI Link Compromised</h2>
              <p className="max-w-md text-sm font-bold text-slate-500 uppercase leading-relaxed mb-10">
                 The reasoning core (Gemini 3 Pro) requires an active API_KEY handshake. 
                 Please configure your environment variables to resume materialization.
              </p>
              <button 
                onClick={handleConnectApiKey}
                className="px-12 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-4"
              >
                 <Key className="w-5 h-5" /> Activate Manual Connection
              </button>
           </div>
        )}

        {/* Mobile Header Bar */}
        <div className="lg:hidden p-4 border-b flex items-center justify-between no-print sticky top-0 bg-white z-50">
           <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              <span className="font-black uppercase text-xs">Blueprint Pro</span>
           </div>
           <button 
             onClick={handleConnectApiKey}
             className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${apiKeyMissing ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}
           >
              {apiKeyMissing ? 'AI Missing' : 'AI Connected'}
           </button>
        </div>

        <div className="p-8 lg:p-12 pb-32">
          {loading || isScanning ? (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8 animate-in fade-in zoom-in duration-500">
               <div className="relative">
                  <div className="absolute inset-0 bg-slate-900/5 blur-3xl rounded-full scale-150 animate-pulse"></div>
                  <Loader2 className="w-24 h-24 animate-spin text-slate-900 relative z-10" />
                  <Sparkles className="absolute -top-4 -right-4 w-12 h-12 text-yellow-400 animate-bounce" />
               </div>
               <div className="max-w-md">
                 <h2 className="text-5xl font-black uppercase tracking-tighter italic">
                   {isScanning ? "Mapping Nodes" : "Synthesizing Suite"}
                 </h2>
                 <div className="mt-6 flex flex-col gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Reasoning Core: Gemini 3 Pro Preview</p>
                    <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase">
                      {isScanning 
                        ? "Decomposing curricular source material into instructional lesson hierarchies..." 
                        : "Generating verified assessment items across all specified cognitive depths."
                      }
                    </p>
                 </div>
               </div>
            </div>
          ) : mode === AppMode.ONBOARDING ? (
            <div className="max-w-5xl mx-auto py-12 animate-in fade-in duration-1000">
               <div className="text-center mb-20">
                  <div className="w-20 h-20 bg-slate-900 text-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl relative">
                    <Brain className="w-10 h-10" />
                    <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-slate-900 p-1.5 rounded-xl shadow-lg"><Zap className="w-4 h-4" /></div>
                  </div>
                  <h2 className="text-7xl font-black uppercase tracking-tighter italic leading-none mb-4">Curriculum Intake</h2>
                  <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Materialize exhaustive homework, exams, and quizzes from any source</p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="p-16 border-4 border-slate-100 rounded-[4rem] hover:border-slate-900 transition-all cursor-pointer group flex flex-col justify-between bg-white shadow-sm" onClick={() => guidelineInputRef.current?.click()}>
                     <input type="file" ref={guidelineInputRef} className="hidden" accept=".pdf,image/*" onChange={e => {
                        const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => { 
                           setFormData({...formData, guidelineData: { data: (r.result as string).split(',')[1], mimeType: f.type, name: f.name }});
                           setMode(AppMode.GENERATOR);
                        }; r.readAsDataURL(f); }
                     }} />
                     <div>
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-10 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-inner"><CloudUpload className="w-10 h-10" /></div>
                        <h3 className="text-4xl font-black uppercase tracking-tight italic">Document Mapping</h3>
                        <p className="text-slate-400 font-bold text-sm mt-6 leading-relaxed uppercase">Drop a syllabus, textbook chapter, or lecture slides to auto-generate a 1:1 unit suite.</p>
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900 mt-16 flex items-center gap-4">Process Artifact <ChevronRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" /></span>
                  </div>
                  <div className="p-16 bg-slate-900 rounded-[4rem] flex flex-col justify-between cursor-pointer hover:bg-slate-800 transition-all shadow-2xl group" onClick={() => setMode(AppMode.GENERATOR)}>
                     <div>
                        <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mb-10 text-white group-hover:scale-110 transition-transform"><Terminal className="w-10 h-10" /></div>
                        <h3 className="text-4xl font-black uppercase tracking-tight text-white italic">Prompt Architect</h3>
                        <p className="text-white/40 font-bold text-sm mt-6 leading-relaxed uppercase">Specify your subject domain manually and build a custom pedagogical pipeline from scratch.</p>
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 mt-16 flex items-center gap-4">Manual Synthesis <ChevronRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" /></span>
                  </div>
               </div>
            </div>
          ) : mode === AppMode.GENERATOR ? (
            <div className="max-w-6xl mx-auto py-4">
               <header className="mb-16 flex justify-between items-end">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                       <Activity className="w-5 h-5 text-blue-500 animate-pulse" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Pipeline Active</span>
                    </div>
                    <h2 className="text-7xl font-black uppercase tracking-tighter italic leading-none">Suite Studio</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-4">Defining instructional constraints & node logic</p>
                  </div>
                  <button onClick={() => setMode(AppMode.ONBOARDING)} className="flex items-center gap-3 px-8 py-4 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest transition-all"><ArrowLeft className="w-4 h-4" /> Reset Workshop</button>
               </header>
               <div className="grid grid-cols-12 gap-16">
                  <div className="col-span-12 lg:col-span-4 space-y-10">
                     <div className="bg-slate-50 p-10 rounded-[3rem] space-y-8 shadow-sm">
                        <div className="space-y-4">
                           <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-3"><Microscope className="w-5 h-5" /> Subject Domain</h3>
                           <input 
                             className="w-full p-6 bg-white border-2 border-slate-100 rounded-3xl font-black text-2xl outline-none focus:border-slate-900 transition-all placeholder:text-slate-200" 
                             placeholder="e.g. Political Economy" 
                             value={formData.topic} 
                             onChange={e => setFormData({...formData, topic: e.target.value})} 
                           />
                        </div>
                        
                        {(formData.guidelineData || formData.rawText) && (
                          <div className="p-8 bg-blue-600 rounded-[2.5rem] space-y-6 shadow-xl animate-in slide-in-from-top-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100 flex items-center gap-3">
                              <Brain className="w-5 h-5" /> Curricular Analysis
                            </h4>
                            <p className="text-xs font-bold text-white uppercase leading-relaxed opacity-90">
                              Source artifacts detected. Auto-mapping will generate one unit node for every detected chapter or lesson.
                            </p>
                            <button 
                              onClick={() => applyTemplate('one_per_lesson')} 
                              className="w-full py-5 bg-white text-blue-600 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-lg"
                            >
                              <ListOrdered className="w-5 h-5" /> Materialize Units
                            </button>
                          </div>
                        )}

                        <div className="space-y-6 pt-8 border-t border-slate-200">
                           <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Global Architect Patterns</label>
                           <div className="grid grid-cols-1 gap-4">
                              <button onClick={() => applyTemplate('assessment_pack')} className="w-full p-6 bg-white border-2 border-slate-100 hover:border-slate-900 rounded-[2rem] text-left transition-all group shadow-sm">
                                 <span className="text-[10px] font-black uppercase text-slate-900 block mb-2 group-hover:text-blue-600">Standard Suite</span>
                                 <span className="text-[9px] font-bold text-slate-400 uppercase italic leading-relaxed">Homework + Formative Quiz + Final Assessment Exam</span>
                              </button>
                              <button onClick={() => applyTemplate('differentiation_pack')} className="w-full p-6 bg-white border-2 border-slate-100 hover:border-slate-900 rounded-[2rem] text-left transition-all group shadow-sm">
                                 <span className="text-[10px] font-black uppercase text-slate-900 block mb-2 group-hover:text-blue-600">Differentiation Pack</span>
                                 <span className="text-[9px] font-bold text-slate-400 uppercase italic leading-relaxed">Multi-tier scaffolding for diverse learner profiles.</span>
                              </button>
                           </div>
                        </div>
                     </div>
                  </div>
                  <div className="col-span-12 lg:col-span-8 space-y-8">
                     <div className="flex justify-between items-center px-6">
                        <div className="flex flex-col">
                           <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Node Pipeline</h3>
                           <span className="text-[9px] font-bold text-slate-300 uppercase mt-1">{suiteIntents.length} Units Targeted</span>
                        </div>
                        <button onClick={addContainer} className="flex items-center gap-3 px-8 py-3 bg-slate-900 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
                           <Plus className="w-4 h-4" /> Add Manual Unit
                        </button>
                     </div>
                     <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar p-2">
                        {suiteIntents.map((intent, i) => (
                           <div key={intent.id} className="group relative bg-white border-2 border-slate-100 rounded-[3.5rem] p-10 hover:border-slate-900 transition-all shadow-md">
                              <div className="flex justify-between items-start mb-6">
                                 <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 bg-slate-100 text-slate-900 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner group-hover:bg-slate-900 group-hover:text-white transition-colors">{i + 1}</div>
                                    <div className="flex flex-col">
                                       <h4 className="font-black text-2xl uppercase tracking-tighter italic">
                                         {intent.specificInstructions?.includes("UNIT") 
                                           ? intent.specificInstructions.split(":")[0].replace("UNIT", "LESSON")
                                           : intent.type
                                         }
                                       </h4>
                                       <div className="flex gap-4 mt-2">
                                          <span className="text-[8px] font-black uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full text-slate-500">{intent.layout} Style</span>
                                          <span className="text-[8px] font-black uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full text-slate-500">{intent.profile} Target</span>
                                       </div>
                                    </div>
                                 </div>
                                 <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => setEditingContainerIdx(i)} className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50"><Settings2 className="w-5 h-5" /></button>
                                    <button onClick={() => setSuiteIntents(suiteIntents.filter((_, idx) => idx !== i))} className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 className="w-5 h-5" /></button>
                                 </div>
                              </div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase italic truncate mb-8">
                                 {intent.specificInstructions || "General domain assessment coverage following pedagogical standards..."}
                              </p>
                              <div className="flex gap-3">
                                 {Object.entries(intent.questionCounts).map(([type, count]) => (
                                   // Fix: Cast 'count' to number to prevent 'unknown' comparison error.
                                   (count as number) > 0 && (
                                     <div key={type} className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                                        <Check className="w-3 h-3 text-blue-500" />
                                        <span className="text-[9px] font-black uppercase">{count}x {type}</span>
                                     </div>
                                   )
                                 ))}
                              </div>
                           </div>
                        ))}
                        {suiteIntents.length === 0 && (
                          <div className="py-24 text-center border-4 border-dashed rounded-[4rem] border-slate-100 bg-slate-50/50">
                             <Target className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                             <p className="text-sm font-black uppercase text-slate-300 tracking-[0.2em]">Materialization Pipeline Empty</p>
                          </div>
                        )}
                     </div>
                     {suiteIntents.length > 0 && (
                        <div className="pt-16 flex justify-center">
                           <button 
                             onClick={handleGenerate} 
                             className="px-24 py-10 bg-slate-900 text-white rounded-[4rem] font-black text-3xl uppercase tracking-tighter flex items-center gap-8 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] hover:scale-[1.02] active:scale-95 transition-all relative overflow-hidden group"
                           >
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                              <Sparkles className="w-10 h-10 text-yellow-400 group-hover:rotate-12 transition-transform" /> 
                              Synthesize Full Suite
                           </button>
                        </div>
                     )}
                  </div>
               </div>
            </div>
          ) : mode === AppMode.BULK_REVIEW ? (
            <div className="max-w-6xl mx-auto py-12 animate-in fade-in duration-700">
               <header className="mb-20 flex justify-between items-end">
                  <div>
                    <h2 className="text-7xl font-black uppercase tracking-tighter italic leading-none">Node Repository</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-6 italic">Materialized {currentBulkSet.length} units for domain: {formData.topic}</p>
                  </div>
                  <button onClick={() => setMode(AppMode.GENERATOR)} className="px-10 py-5 bg-slate-900 text-white rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all">Return to Pipeline</button>
               </header>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                  {currentBulkSet.map((ws) => (
                     <div key={ws.id} className="bg-white border-2 border-slate-100 rounded-[4rem] p-12 flex flex-col justify-between hover:border-slate-900 transition-all group shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full translate-x-12 translate-y-[-12px] opacity-20 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10">
                           <span className="px-4 py-2 bg-slate-100 border rounded-xl text-[9px] font-black uppercase text-slate-500 block w-fit mb-8">{ws.documentType}</span>
                           <h3 className="text-3xl font-black uppercase italic mb-10 line-clamp-4 leading-[1.1] tracking-tighter">{ws.title}</h3>
                        </div>
                        <button onClick={() => { setWorksheet(ws); setMode(AppMode.WORKSHEET); }} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3">
                           Inspect Design Node <ChevronRight className="w-4 h-4" />
                        </button>
                     </div>
                  ))}
               </div>
            </div>
          ) : mode === AppMode.SETTINGS ? (
            <div className="max-w-5xl mx-auto py-12 animate-in fade-in duration-500">
               <header className="mb-16 border-b pb-12 flex items-end justify-between">
                 <div>
                    <h2 className="text-6xl font-black uppercase italic tracking-tighter">Branding Portal</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-4">Global identity sync for materialized artifacts</p>
                 </div>
                 <button onClick={() => setMode(AppMode.ONBOARDING)} className="text-slate-300 hover:text-slate-900 transition-colors"><XCircle className="w-10 h-10" /></button>
               </header>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
                  <div className="space-y-8">
                     <div className="space-y-3"><label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Institution Title</label><input className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black focus:border-slate-900 outline-none transition-all" value={branding.institutionName} onChange={e => { const n = {...branding, institutionName: e.target.value}; setBranding(n); localStorage.setItem('institutional_branding', JSON.stringify(n)); }} /></div>
                     <div className="space-y-3"><label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Lead Instructor Signature</label><input className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black focus:border-slate-900 outline-none transition-all" value={branding.instructorName} onChange={e => { const n = {...branding, instructorName: e.target.value}; setBranding(n); localStorage.setItem('institutional_branding', JSON.stringify(n)); }} /></div>
                     <div className="space-y-3"><label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">OAuth Client ID (Drive Integration)</label><input className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold focus:border-slate-900 outline-none transition-all" value={branding.googleClientId || ''} placeholder="Client ID for G-Drive Sync" onChange={e => { const n = {...branding, googleClientId: e.target.value}; setBranding(n); localStorage.setItem('institutional_branding', JSON.stringify(n)); }} /></div>
                     <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Institutional Asset (Logo)</label>
                        <button onClick={() => logoInputRef.current?.click()} className="w-full p-6 border-2 border-dashed rounded-3xl font-black text-[11px] uppercase flex items-center justify-center gap-4 hover:border-slate-900 transition-all bg-slate-50 group shadow-inner">
                          {uploadingLogo ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImageIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />} Load New Asset
                        </button>
                        <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                     </div>
                  </div>
                  <div className="p-16 bg-slate-900 rounded-[5rem] text-white flex flex-col items-center justify-center text-center shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-blue-500/10 blur-[100px] rounded-full scale-150"></div>
                    <Globe className="w-24 h-24 mb-10 text-blue-400 relative z-10" />
                    <h3 className="text-4xl font-black uppercase italic relative z-10 mb-6">Global Identity Sync</h3>
                    <p className="text-white/40 text-[11px] font-bold uppercase mb-12 leading-relaxed tracking-widest relative z-10">Branding parameters will automatically propagate to all future synthesis nodes in this workspace.</p>
                    <button onClick={handleConnectApiKey} className={`relative z-10 flex items-center gap-4 px-10 py-5 rounded-[2rem] text-[12px] font-black uppercase tracking-widest transition-all ${apiKeyMissing ? 'bg-red-600 hover:bg-red-700 shadow-xl' : 'bg-white/10 hover:bg-white/20'}`}>
                      <Key className="w-5 h-5" /> {apiKeyMissing ? 'Connect AI Architect Engine' : 'Manage AI Connectivity'}
                    </button>
                    {apiKeyMissing && <p className="mt-8 text-[9px] font-black uppercase text-red-400 animate-pulse relative z-10 tracking-[0.2em]">Requires billing-enabled paid API key</p>}
                  </div>
               </div>
            </div>
          ) : mode === AppMode.QUIZ && worksheet ? (
            <QuizView worksheet={worksheet} theme={branding.defaultTheme} onExit={() => setMode(AppMode.WORKSHEET)} isMathMode={true} />
          ) : worksheet && (
            <div className="animate-in fade-in duration-500">
               <WorksheetView worksheet={worksheet} theme={branding.defaultTheme} showKey={showTeacherKey} onUpdate={setWorksheet} onLaunchQuiz={() => setMode(AppMode.QUIZ)} onSaveSuccess={fetchUserContent} />
               <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-white/95 p-5 rounded-[2.5rem] shadow-2xl border border-slate-100 z-[90] no-print backdrop-blur-xl">
                  <button onClick={() => setShowTeacherKey(!showTeacherKey)} className={`px-10 py-4 rounded-full font-black text-[11px] uppercase tracking-widest transition-all ${showTeacherKey ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-50 border hover:bg-slate-100 text-slate-500'}`}>{showTeacherKey ? 'Conceal Registry' : 'Solution Registry'}</button>
                  <button onClick={() => setMode(AppMode.QUIZ)} className="px-10 py-4 bg-blue-600 text-white rounded-full font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center gap-3 hover:bg-blue-700 transition-all hover:scale-105 active:scale-95"><PlayCircle className="w-5 h-5" /> Launch Practice</button>
                  <button onClick={() => setMode(AppMode.GENERATOR)} className="px-10 py-4 bg-slate-900 text-white rounded-full font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all">Node Studio</button>
               </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating On-Page Status Badge for Non-Sidebar Views (Mobile/Minimal) */}
      <div className="fixed top-4 right-4 z-[100] lg:hidden no-print">
         <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white shadow-md ${apiKeyMissing ? 'border-red-100' : 'border-green-100'}`}>
            <div className={`w-2 h-2 rounded-full ${apiKeyMissing ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></div>
            <span className="text-[9px] font-black uppercase text-slate-600">{apiKeyMissing ? 'Disconnected' : 'AI Engine Live'}</span>
         </div>
      </div>
    </div>
  );
};

export default App;
