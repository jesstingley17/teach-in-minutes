
import React, { useState, useRef, useEffect } from 'react';
import { AppMode, Worksheet, ThemeType, QuestionType, DocumentType, AudienceCategory, LearnerProfile, CurriculumStandard, BrandingConfig } from './types';
import { generateWorksheet } from './services/geminiService';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { WorksheetView } from './components/WorksheetView';
import { 
  GraduationCap, Loader2, ArrowRight, ArrowLeft, 
  Plus, Sparkles, CloudUpload, FileText,
  BookOpen, LayoutGrid, ShieldCheck, Key, ExternalLink, AlertTriangle,
  Layers, Lock, XCircle, Database, UserCheck, Briefcase, ChevronRight,
  Settings, Globe, Palette, User, Building, Library, Layers3, Eye,
  Languages, BrainCircuit, Star, Zap, Construction, Target, Microscope, PenTool
} from 'lucide-react';

const DEFAULT_BRANDING: BrandingConfig = {
  institutionName: 'Institutional Academy',
  instructorName: 'Lead Educator',
  primaryColor: '#0f172a',
  customDomain: 'edu-portal',
  defaultTheme: ThemeType.GAMMA
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  const [mode, setMode] = useState<AppMode>(AppMode.ONBOARDING);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [worksheet, setWorksheet] = useState<Worksheet | null>(null);
  const [currentBulkSet, setCurrentBulkSet] = useState<Worksheet[]>([]);
  const [savedWorksheets, setSavedWorksheets] = useState<Worksheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMathMode, setIsMathMode] = useState(true);
  const [showTeacherKey, setShowTeacherKey] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(true);
  const [bulkCount, setBulkCount] = useState(3);
  
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  
  const [formData, setFormData] = useState({
    topic: '',
    lessonTitle: '',
    moduleTitle: '',
    audienceCategory: AudienceCategory.UNIVERSITY,
    educationalLevel: 'Degree Level',
    learnerProfile: LearnerProfile.GENERAL,
    curriculumStandard: CurriculumStandard.CUSTOM,
    difficulty: 'Standard Application',
    language: 'English',
    documentType: DocumentType.ASSIGNMENT,
    rawText: '',
    questionCounts: { [QuestionType.MCQ]: 5, [QuestionType.SHORT_ANSWER]: 3 } as Record<string, number>,
    fileData: null as { data: string; mimeType: string; name: string } | null,
    guidelineData: null as { data: string; mimeType: string; name: string } | null
  });

  const guidelineInputRef = useRef<HTMLInputElement>(null);
  const brandingLogoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        setHasApiKey(await window.aistudio.hasSelectedApiKey());
      } else {
        setHasApiKey(true); 
      }
    };
    checkApiKey();

    const savedBranding = localStorage.getItem('institutional_branding');
    if (savedBranding) setBranding(JSON.parse(savedBranding));

    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) { setUser(session.user); setIsGuest(false); }
        setAuthLoading(false);
      });
    } else {
      const localSession = localStorage.getItem('local_user_session');
      if (localSession) { setUser(JSON.parse(localSession)); }
      setAuthLoading(false);
    }
    
    if (localStorage.getItem('isGuest') === 'true') setIsGuest(true);
  }, []);

  useEffect(() => { if (user || isGuest) fetchUserContent(); }, [user, isGuest]);

  const fetchUserContent = async () => {
    const prefix = user?.email || 'guest';
    const local = JSON.parse(localStorage.getItem(`archive_${prefix}`) || '[]');
    setSavedWorksheets(local);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    // Hardcoded credentials for jtingley
    if (email === 'jtingley@anchorchartpro.com' && password === 'Password123') {
      const sessionUser = { email, id: 'jtingley-pro-session' };
      setUser(sessionUser);
      setIsGuest(false);
      localStorage.setItem('local_user_session', JSON.stringify(sessionUser));
      setMode(AppMode.ONBOARDING);
    } else {
      setAuthError("Invalid faculty credentials. Access denied.");
    }
  };

  const handleSaveBranding = () => {
    localStorage.setItem('institutional_branding', JSON.stringify(branding));
    setMode(AppMode.ONBOARDING);
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateWorksheet({ 
        ...formData, 
        rawText: `STUDENT PROFILE: ${formData.learnerProfile}. ${formData.rawText}`,
        fileData: formData.guidelineData || undefined,
        bulkCount: isBulkMode ? bulkCount : 1 
      });

      const results = Array.isArray(result) ? result : [result];
      const newSheets = results.map((ws, i) => ({
        ...ws,
        id: Math.random().toString(36).substr(2, 9),
        lessonTitle: formData.lessonTitle || 'Untitled Lesson',
        moduleTitle: formData.moduleTitle || 'Uncategorized Module',
        institutionName: branding.institutionName,
        instructorName: branding.instructorName,
        logoUrl: branding.logoUrl,
        savedAt: Date.now() + i,
        visualMetadata: { ...ws.visualMetadata, primaryColor: branding.primaryColor }
      }));

      const prefix = user?.email || 'guest';
      const local = JSON.parse(localStorage.getItem(`archive_${prefix}`) || '[]');
      localStorage.setItem(`archive_${prefix}`, JSON.stringify([...newSheets, ...local].slice(0, 50)));

      setSavedWorksheets(prev => [...newSheets, ...prev]);
      if (isBulkMode) {
        setCurrentBulkSet(newSheets);
        setMode(AppMode.BULK_REVIEW);
      } else {
        setWorksheet(newSheets[0]);
        setMode(AppMode.WORKSHEET);
      }
    } catch (e: any) { 
      alert("Materialization failed: " + e.message);
    } finally { setLoading(false); }
  };

  const ScaffoldingTile = ({ icon: Icon, label, value, active, onClick }: any) => (
    <button 
      onClick={() => onClick(value)}
      className={`relative p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center text-center gap-4 group ${
        active ? 'border-slate-900 bg-slate-900 text-white shadow-2xl scale-105' : 'border-slate-100 hover:border-slate-300 bg-white'
      }`}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${active ? 'bg-white/10' : 'bg-slate-50'}`}>
        <Icon className={`w-6 h-6 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'}`} />
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      {active && <div className="absolute top-4 right-4"><Sparkles className="w-4 h-4 text-yellow-400" /></div>}
    </button>
  );

  const IntentLevel = ({ label, desc, value, active, onClick }: any) => (
    <button 
      onClick={() => onClick(value)}
      className={`p-6 rounded-3xl border-2 text-left transition-all ${
        active ? 'border-slate-900 bg-slate-50' : 'border-slate-100 hover:bg-slate-50'
      }`}
    >
      <div className="flex justify-between items-center mb-2">
        <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
        {active && <div className="w-2 h-2 rounded-full bg-slate-900"></div>}
      </div>
      <p className="text-xs font-bold text-slate-600 leading-tight">{desc}</p>
    </button>
  );

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-slate-900 w-10 h-10" /></div>;

  if (!user && !isGuest) return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      <div className="hidden lg:flex flex-1 items-center justify-center p-20 bg-slate-900">
        <div className="max-w-lg text-center">
          <GraduationCap className="w-16 h-16 text-blue-500 mx-auto mb-8" />
          <h1 className="text-7xl font-black text-white uppercase italic mb-6">Blueprint<span className="text-blue-500 not-italic">Pro</span></h1>
          <p className="text-slate-400 text-xl font-medium">Professional grade assessment architect for all educational tiers.</p>
        </div>
      </div>
      <div className="w-full lg:w-[500px] bg-white p-12 flex flex-col justify-center">
        <form onSubmit={handleLogin} className="space-y-6">
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-8">Faculty Portal</h2>
          {authError && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100 animate-bounce">{authError}</div>}
          <input 
            required 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            placeholder="Email / Faculty ID" 
            className="w-full p-4 bg-slate-50 border-2 rounded-xl outline-none focus:border-slate-900 font-bold" 
          />
          <input 
            required 
            type="password" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Passkey" 
            className="w-full p-4 bg-slate-50 border-2 rounded-xl outline-none focus:border-slate-900 font-bold" 
          />
          <button className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all">Establish Session</button>
          <button type="button" onClick={() => { setIsGuest(true); localStorage.setItem('isGuest', 'true'); }} className="w-full py-4 bg-white border-2 text-slate-500 rounded-xl font-black uppercase tracking-widest text-[10px]">Guest Access</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-white font-sans text-slate-900">
      <aside className="w-72 border-r border-slate-100 hidden lg:flex flex-col fixed h-full z-20 no-print">
        <div className="p-8 border-b border-slate-50">
           <div className="flex items-center gap-3 mb-10 cursor-pointer" onClick={() => setMode(AppMode.ONBOARDING)}>
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-md"><GraduationCap className="w-6 h-6" /></div>
              <h1 className="font-black text-lg uppercase tracking-tight">Blueprint Pro</h1>
           </div>
           <button onClick={() => { setMode(AppMode.GENERATOR); setCurrentStep(1); }} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">
              <Plus className="w-4 h-4 inline mr-2" /> New Intake
           </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
           <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Library className="w-3.5 h-3.5" /> Assessment Archive</h3>
           <div className="space-y-1">
              {savedWorksheets.map(ws => (
                <div key={ws.id} className="p-3 rounded-xl border border-transparent hover:bg-slate-50 hover:border-slate-100 cursor-pointer group" onClick={() => { setWorksheet(ws); setMode(AppMode.WORKSHEET); }}>
                   <span className="text-[10px] font-black uppercase block truncate group-hover:text-blue-600">{ws.title}</span>
                   <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{ws.documentType} • {ws.moduleTitle}</span>
                </div>
              ))}
           </div>
        </div>
        <div className="p-6 border-t border-slate-50 space-y-3">
           <button onClick={() => setMode(AppMode.SETTINGS)} className={`w-full p-3 rounded-xl flex items-center gap-3 font-black text-[9px] uppercase tracking-widest transition-all ${mode === AppMode.SETTINGS ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
              <Settings className="w-4 h-4" /> Branding Portal
           </button>
           <button onClick={() => { setUser(null); setIsGuest(false); localStorage.removeItem('local_user_session'); localStorage.removeItem('isGuest'); }} className="w-full p-3 rounded-xl flex items-center gap-3 font-black text-[9px] uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors">
              <XCircle className="w-4 h-4" /> End Session
           </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-72 min-h-screen relative bg-white">
        <div className="p-8 lg:p-12 pb-32">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
               <div className="relative">
                 <Loader2 className="w-20 h-20 animate-spin text-slate-900" />
                 <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-pulse" />
               </div>
               <div className="max-w-sm">
                 <h2 className="text-4xl font-black uppercase tracking-tighter">Materializing Containers</h2>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">Connecting Module: {formData.moduleTitle} to your lesson architecture...</p>
               </div>
            </div>
          ) : mode === AppMode.SETTINGS ? (
            <div className="max-w-4xl mx-auto py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <header className="mb-12 text-center">
                  <h2 className="text-5xl font-black uppercase tracking-tighter mb-2">Identity Portal</h2>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Printer-Optimized Branding Configuration</p>
               </header>
               <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl p-12 space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                     <div className="space-y-6">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Basic Identity</h4>
                        <input placeholder="Institution / School Name" className="w-full p-4 bg-slate-50 border-2 rounded-2xl outline-none font-bold" value={branding.institutionName} onChange={e => setBranding({...branding, institutionName: e.target.value})} />
                        <input placeholder="Faculty Lead / Name" className="w-full p-4 bg-slate-50 border-2 rounded-2xl outline-none font-bold" value={branding.instructorName} onChange={e => setBranding({...branding, instructorName: e.target.value})} />
                     </div>
                     <div className="space-y-6">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logo & Visuals</h4>
                        <div onClick={() => brandingLogoRef.current?.click()} className="h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 overflow-hidden">
                           <input type="file" ref={brandingLogoRef} className="hidden" accept="image/*" onChange={e => {
                              const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setBranding({...branding, logoUrl: r.result as string}); r.readAsDataURL(f); }
                           }} />
                           {branding.logoUrl ? <img src={branding.logoUrl} className="h-full w-full object-contain p-4" /> : <CloudUpload className="text-slate-300 w-8 h-8" />}
                        </div>
                     </div>
                  </div>
                  <div className="pt-8 border-t flex justify-end gap-4">
                     <button onClick={() => setMode(AppMode.ONBOARDING)} className="px-8 py-3 font-black text-[10px] uppercase text-slate-400">Discard</button>
                     <button onClick={handleSaveBranding} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg">Save Identity</button>
                  </div>
               </div>
            </div>
          ) : mode === AppMode.ONBOARDING ? (
            <div className="max-w-4xl mx-auto py-12 animate-in fade-in duration-700">
               <div className="text-center mb-16">
                  <Library className="w-12 h-12 mx-auto mb-6 text-slate-900" />
                  <h2 className="text-5xl font-black uppercase tracking-tighter">Knowledge Intake</h2>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Onboard your Lesson Content / Syllabus first</p>
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
                        <h3 className="text-2xl font-black uppercase tracking-tight">Load Master Content</h3>
                        <p className="text-slate-400 font-bold text-xs mt-4 leading-relaxed uppercase">Seed the AI with your actual lecture notes or textbook chapters.</p>
                     </div>
                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-900 mt-12 flex items-center gap-2">Attach Content <ChevronRight className="w-3 h-3" /></span>
                  </div>
                  <div className="p-12 bg-slate-900 rounded-[3rem] flex flex-col justify-between cursor-pointer hover:bg-slate-800 transition-all" onClick={() => setMode(AppMode.GENERATOR)}>
                     <div>
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-8 text-white"><Zap className="w-6 h-6" /></div>
                        <h3 className="text-2xl font-black uppercase tracking-tight text-white">Direct Synthesis</h3>
                        <p className="text-white/40 font-bold text-xs mt-4 leading-relaxed uppercase">Generate assessments from scratch based on a topic description.</p>
                     </div>
                     <span className="text-[9px] font-black uppercase tracking-widest text-white/60 mt-12 flex items-center gap-2">Skip Attachment <ChevronRight className="w-3 h-3" /></span>
                  </div>
               </div>
            </div>
          ) : mode === AppMode.GENERATOR ? (
            <div className="max-w-5xl mx-auto py-4">
               <header className="mb-12">
                  <h2 className="text-6xl font-black uppercase tracking-tighter">Factory Module</h2>
                  {formData.guidelineData && <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 mt-4 flex items-center gap-2"><Library className="w-4 h-4" /> Anchored to: {formData.guidelineData.name}</p>}
               </header>

               <div className="bg-white border border-slate-100 rounded-[3rem] shadow-xl p-12 space-y-16">
                  {currentStep === 1 && (
                     <div className="space-y-12 animate-in slide-in-from-right duration-300">
                        <div className="space-y-3">
                           <label className="text-[10px] font-black uppercase text-slate-400 px-2 tracking-widest">Main Topic</label>
                           <input className="w-full p-6 bg-slate-50 border-2 rounded-2xl font-black text-2xl outline-none focus:border-slate-900" placeholder="e.g. Molecular Biology" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                           <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase text-slate-400 px-2">Module Name</label>
                              <input className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-bold" placeholder="Unit 4: DNA" value={formData.moduleTitle} onChange={e => setFormData({...formData, moduleTitle: e.target.value})} />
                           </div>
                           <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase text-slate-400 px-2">Lesson Name</label>
                              <input className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-bold" placeholder="Lesson 1: Replication" value={formData.lessonTitle} onChange={e => setFormData({...formData, lessonTitle: e.target.value})} />
                           </div>
                        </div>
                     </div>
                  )}

                  {currentStep === 2 && (
                     <div className="space-y-12 animate-in slide-in-from-right duration-300">
                        <div>
                           <label className="text-[10px] font-black uppercase text-slate-400 px-2 tracking-widest mb-6 block">Target Student Needs</label>
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                              <ScaffoldingTile icon={Languages} label="ESL / ELL" value={LearnerProfile.ESL_ELL} active={formData.learnerProfile === LearnerProfile.ESL_ELL} onClick={(v: any) => setFormData({...formData, learnerProfile: v})} />
                              <ScaffoldingTile icon={BrainCircuit} label="IEP / Spec Ed" value={LearnerProfile.SPECIAL_ED} active={formData.learnerProfile === LearnerProfile.SPECIAL_ED} onClick={(v: any) => setFormData({...formData, learnerProfile: v})} />
                              <ScaffoldingTile icon={Star} label="Gifted / Talented" value={LearnerProfile.GIFTED} active={formData.learnerProfile === LearnerProfile.GIFTED} onClick={(v: any) => setFormData({...formData, learnerProfile: v})} />
                              <ScaffoldingTile icon={Target} label="Standard Tier" value={LearnerProfile.GENERAL} active={formData.learnerProfile === LearnerProfile.GENERAL} onClick={(v: any) => setFormData({...formData, learnerProfile: v})} />
                           </div>
                        </div>

                        <div>
                           <label className="text-[10px] font-black uppercase text-slate-400 px-2 tracking-widest mb-6 block">Learning Depth</label>
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <IntentLevel label="Intro / Review" desc="Focus on definitions and basic recognition." value="Remembering" active={formData.difficulty === "Remembering"} onClick={(v: any) => setFormData({...formData, difficulty: v})} />
                              <IntentLevel label="Practical Skill" desc="Focus on solving problems and real scenarios." value="Standard Application" active={formData.difficulty === "Standard Application"} onClick={(v: any) => setFormData({...formData, difficulty: v})} />
                              <IntentLevel label="Advanced Mastery" desc="Focus on critical analysis and creation." value="Evaluating/Creating" active={formData.difficulty === "Evaluating/Creating"} onClick={(v: any) => setFormData({...formData, difficulty: v})} />
                           </div>
                        </div>
                     </div>
                  )}

                  {currentStep === 3 && (
                     <div className="space-y-12 animate-in slide-in-from-right duration-300">
                        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200">
                           <Construction className="w-16 h-16 text-slate-300 mb-6" />
                           <h3 className="text-3xl font-black uppercase tracking-tighter mb-4">Ready to Materialize</h3>
                           <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-12">Generating {bulkCount} containers linked to {formData.lessonTitle}</p>
                           
                           <button onClick={handleGenerate} className="px-20 py-8 bg-slate-900 text-white rounded-[2rem] font-black text-2xl uppercase tracking-tighter flex items-center gap-6 shadow-2xl hover:scale-105 active:scale-95 transition-all">
                              <Sparkles className="w-8 h-8 text-yellow-400" /> Start Bulk Synthesis
                           </button>
                        </div>
                     </div>
                  )}

                  <div className="pt-8 border-t flex justify-between items-center">
                     <button onClick={() => setCurrentStep(s => s - 1)} disabled={currentStep === 1} className="text-slate-400 font-black uppercase tracking-widest text-[10px] disabled:opacity-0"><ArrowLeft className="w-4 h-4 inline mr-2" /> Back</button>
                     <button onClick={() => { if (currentStep < 3) setCurrentStep(s => s + 1); }} disabled={currentStep === 3} className="px-12 py-4 border-2 border-slate-900 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all">Next Step</button>
                  </div>
               </div>
            </div>
          ) : mode === AppMode.BULK_REVIEW ? (
            <div className="max-w-6xl mx-auto py-12 animate-in fade-in duration-700">
               <header className="mb-16">
                  <h2 className="text-6xl font-black uppercase tracking-tighter">Materialization Complete</h2>
                  <div className="flex items-center gap-6 mt-4">
                     <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">{formData.moduleTitle}</span>
                     <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{formData.lessonTitle}</span>
                  </div>
               </header>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {currentBulkSet.map((ws, i) => (
                     <div key={ws.id} style={{ animationDelay: `${i * 200}ms` }} className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-10 flex flex-col justify-between hover:border-slate-900 hover:shadow-2xl transition-all group animate-in slide-in-from-bottom-8">
                        <div>
                           <div className="flex justify-between items-start mb-8">
                              <div className="w-12 h-12 border-2 border-slate-900 rounded-xl flex items-center justify-center font-black">
                                 {i + 1}
                              </div>
                              <span className="px-3 py-1 bg-slate-50 border border-slate-100 rounded text-[8px] font-black uppercase tracking-widest text-slate-400">{ws.documentType}</span>
                           </div>
                           <h3 className="text-2xl font-black uppercase tracking-tight mb-4 group-hover:text-blue-600 transition-colors">{ws.title}</h3>
                           <p className="text-slate-400 text-xs font-bold leading-relaxed mb-8 truncate">{ws.topic}</p>
                           <div className="space-y-2 mb-8">
                              <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400"><span>Items</span> <span>{ws.questions.length}</span></div>
                              <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400"><span>Weight</span> <span>{ws.questions.reduce((s, q) => s + (q.points || 0), 0)} PTS</span></div>
                           </div>
                        </div>
                        <button onClick={() => { setWorksheet(ws); setMode(AppMode.WORKSHEET); }} className="w-full py-4 bg-slate-50 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 group-hover:bg-slate-900 group-hover:text-white transition-all">
                           <Eye className="w-4 h-4" /> Open Container
                        </button>
                     </div>
                  ))}
               </div>
            </div>
          ) : worksheet && (
            <div className="animate-in fade-in duration-500">
               <WorksheetView worksheet={worksheet} theme={branding.defaultTheme} showKey={showTeacherKey} isMathMode={isMathMode} onUpdate={setWorksheet} />
               <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/90 p-3 rounded-full shadow-2xl border border-slate-100 z-[90] no-print backdrop-blur-md">
                  <button onClick={() => setShowTeacherKey(!showTeacherKey)} className={`px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${showTeacherKey ? 'bg-red-600 text-white' : 'bg-slate-50 border hover:bg-slate-100'}`}>
                    {showTeacherKey ? 'Hide Key' : 'Show Solution Key'}
                  </button>
                  <button onClick={() => { setMode(AppMode.ONBOARDING); setCurrentStep(1); }} className="px-8 py-3 bg-slate-900 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl"><Plus className="w-4 h-4 inline mr-2" /> New Suite</button>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
