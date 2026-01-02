
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
  Settings, Globe, Palette, User, Building
} from 'lucide-react';

const DEFAULT_BRANDING: BrandingConfig = {
  institutionName: 'Blueprint University',
  instructorName: 'Faculty Dean',
  primaryColor: '#2563eb',
  customDomain: 'blueprint.edu',
  defaultTheme: ThemeType.GAMMA
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<{message: string, isWarning?: boolean} | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  const [mode, setMode] = useState<AppMode>(AppMode.ONBOARDING);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [worksheet, setWorksheet] = useState<Worksheet | null>(null);
  const [currentBulkSet, setCurrentBulkSet] = useState<Worksheet[]>([]);
  const [savedWorksheets, setSavedWorksheets] = useState<Worksheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMathMode, setIsMathMode] = useState(true);
  const [showTeacherKey, setShowTeacherKey] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
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
    difficulty: 'Evaluating/Creating (Advanced)',
    language: 'English',
    documentType: DocumentType.ASSIGNMENT,
    rawText: '',
    questionCounts: { [QuestionType.MCQ]: 5, [QuestionType.SHORT_ANSWER]: 3 } as Record<string, number>,
    fileData: null as { data: string; mimeType: string; name: string } | null,
    guidelineData: null as { data: string; mimeType: string; name: string } | null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const guidelineInputRef = useRef<HTMLInputElement>(null);
  const brandingLogoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        setHasApiKey(true); 
      }
    };
    checkApiKey();

    const savedBranding = localStorage.getItem('institutional_branding');
    if (savedBranding) setBranding(JSON.parse(savedBranding));

    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) { setUser(session.user); setIsGuest(false); setMode(AppMode.ONBOARDING); }
        setAuthLoading(false);
      });
    } else {
      const localSession = localStorage.getItem('local_user_session');
      if (localSession) {
        setUser(JSON.parse(localSession));
        setMode(AppMode.ONBOARDING);
      }
      setAuthLoading(false);
    }
    
    const guestStatus = localStorage.getItem('isGuest');
    if (guestStatus === 'true') {
      setIsGuest(true);
      setMode(AppMode.ONBOARDING);
    }
  }, []);

  useEffect(() => { if (user || isGuest) fetchUserContent(); }, [user, isGuest]);

  const fetchUserContent = async () => {
    if (user && isSupabaseConfigured) {
      const { data: ws } = await supabase.from('worksheets').select('*').order('savedAt', { ascending: false });
      if (ws) setSavedWorksheets(ws);
    } else {
      const prefix = user?.email || 'guest';
      const local = JSON.parse(localStorage.getItem(`archive_${prefix}`) || '[]');
      setSavedWorksheets(local);
    }
  };

  const handleSaveBranding = () => {
    localStorage.setItem('institutional_branding', JSON.stringify(branding));
    setMode(AppMode.ONBOARDING);
  };

  const handleOpenKeySelector = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      setHasApiKey(true); 
    }
  };

  const handleGenerate = async () => {
    if (!hasApiKey) {
      setAuthError({ message: "Academic License (API Key) Required. Please click 'Activate License' below.", isWarning: true });
      return;
    }

    setLoading(true);
    setAuthError(null);
    try {
      const contextText = formData.guidelineData 
        ? `COURSE GUIDELINES ATTACHED. ADHERE TO SYLLABUS CONSTRAINTS: ${formData.rawText}`
        : formData.rawText;

      const result = await generateWorksheet({ 
        ...formData, 
        rawText: contextText,
        fileData: formData.fileData || formData.guidelineData || undefined,
        useGrounding: false, 
        isMathMode, 
        bulkCount: isBulkMode ? bulkCount : 1 
      });

      const results = Array.isArray(result) ? result : [result];
      
      const newSheets = results.map(ws => ({
        ...ws,
        id: Math.random().toString(36).substr(2, 9),
        lessonTitle: formData.lessonTitle,
        moduleTitle: formData.moduleTitle,
        institutionName: branding.institutionName,
        instructorName: branding.instructorName,
        logoUrl: branding.logoUrl,
        savedAt: Date.now(),
        userId: user?.id || 'local',
        visualMetadata: { ...ws.visualMetadata, primaryColor: branding.primaryColor }
      }));

      if (user && isSupabaseConfigured) {
        await supabase.from('worksheets').insert(newSheets);
      } else {
        const prefix = user?.email || 'guest';
        const local = JSON.parse(localStorage.getItem(`archive_${prefix}`) || '[]');
        const updated = [...newSheets, ...local].slice(0, 50);
        localStorage.setItem(`archive_${prefix}`, JSON.stringify(updated));
      }

      setSavedWorksheets(prev => [...newSheets, ...prev]);
      
      if (isBulkMode && newSheets.length > 1) {
        setCurrentBulkSet(newSheets);
        setMode(AppMode.BULK_REVIEW);
      } else {
        setWorksheet(newSheets[0]);
        setMode(AppMode.WORKSHEET);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) { 
      const errorMsg = e.message || "";
      if (errorMsg.includes("Requested entity was not found") || errorMsg.includes("API_KEY_EXPIRED") || errorMsg.includes("Invalid API key")) {
        setHasApiKey(false);
        setAuthError({ message: "Gemini API License invalid. Please re-select a paid project key via the 'Activate License' button." });
      } else {
        alert("Generation failed: " + e.message);
      }
    } finally { setLoading(false); }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);

    if (!isSupabaseConfigured) {
      const localUser = { email, id: 'local_' + email, isLocal: true };
      setUser(localUser);
      localStorage.setItem('local_user_session', JSON.stringify(localUser));
      setMode(AppMode.ONBOARDING);
      setAuthLoading(false);
      setLoading(false);
      return;
    }

    const { data, error } = isSignUp ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError({ message: error.message });
    else if (data.user) { setUser(data.user); setMode(AppMode.ONBOARDING); }
    setLoading(false);
  };

  const signOut = () => {
    if (isSupabaseConfigured) supabase.auth.signOut();
    setUser(null);
    setIsGuest(false);
    localStorage.removeItem('local_user_session');
    localStorage.removeItem('isGuest');
    setSavedWorksheets([]);
  };

  if (authLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
      <Loader2 className="animate-spin text-blue-500 w-12 h-12 mb-6" />
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Establishing Secure Session</p>
    </div>
  );

  if (!user && !isGuest) return (
    <div className="min-h-screen flex bg-slate-950 font-sans overflow-hidden">
      <div className="hidden lg:flex flex-1 items-center justify-center p-20 bg-slate-900 relative">
        <div className="absolute top-12 left-12 flex items-center gap-2 text-slate-500">
           <Database className="w-4 h-4" />
           <span className="text-[9px] font-black uppercase tracking-widest">{isSupabaseConfigured ? 'Enterprise Cloud Active' : 'Local Persistence Active'}</span>
        </div>
        <div className="relative z-10 max-w-lg text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white mb-10 mx-auto shadow-2xl shadow-blue-500/20"><GraduationCap className="w-12 h-12" /></div>
          <h1 className="text-8xl font-black text-white tracking-tighter mb-6 leading-none uppercase italic">Blueprint<br/><span className="text-blue-500 not-italic">Pro</span></h1>
          <p className="text-xl text-slate-400 font-medium leading-relaxed">The high-rigor assessment engine for universities and elite schools.</p>
        </div>
      </div>
      <div className="w-full lg:w-[600px] bg-white flex flex-col items-center justify-center p-12 relative">
        <form onSubmit={handleAuth} className="w-full max-w-sm space-y-6">
          <div className="text-center mb-10">
            <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter mb-2 underline decoration-8 decoration-blue-500 underline-offset-8">Faculty Portal</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Institutional Credential Login</p>
          </div>
          {authError && (
            <div className={`p-5 rounded-2xl text-xs font-bold border flex gap-3 items-center bg-red-50 border-red-100 text-red-700`}>
              <ShieldCheck className="w-5 h-5 shrink-0" /> <span className="flex-1">{authError.message}</span>
            </div>
          )}
          <div className="space-y-3">
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Faculty ID / Email" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-900 outline-none font-bold text-slate-900 transition-all" />
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Passkey" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-900 outline-none font-bold text-slate-900 transition-all" />
          </div>
          <button className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95 disabled:opacity-50">Access Resources</button>
          <button type="button" onClick={() => { setIsGuest(true); localStorage.setItem('isGuest', 'true'); }} className="w-full py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:border-slate-900 hover:text-slate-900 transition-all flex items-center justify-center gap-3">Guest Access</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans antialiased overflow-x-hidden">
      <aside className="w-80 bg-white border-r border-slate-200 hidden lg:flex flex-col fixed h-full z-20 no-print">
        <div className="p-8 border-b border-slate-100">
           <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg cursor-pointer" onClick={() => setMode(AppMode.ONBOARDING)}><GraduationCap className="w-6 h-6" /></div>
              <div><h1 className="font-black text-xl tracking-tighter leading-none uppercase text-slate-900">Blueprint Pro</h1><span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Generator Engine</span></div>
           </div>
           <button onClick={() => { setMode(AppMode.GENERATOR); setCurrentStep(1); }} className="w-full flex items-center justify-center gap-3 p-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md hover:scale-[1.02] transition-transform">
              <Plus className="w-4 h-4" /> Start New Intake
           </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-6 px-1 flex items-center gap-2"><FileText className="w-3 h-3" /> Recent Archive</h3>
           <div className="space-y-1">
              {savedWorksheets.map(ws => (
                <div key={ws.id} className="p-4 rounded-2xl border border-transparent hover:bg-slate-100 hover:border-slate-200 cursor-pointer transition-all group" onClick={() => { setWorksheet(ws); setMode(AppMode.WORKSHEET); }}>
                   <span className="text-[11px] font-black uppercase text-slate-900 block truncate group-hover:text-blue-600 transition-colors">{ws.title}</span>
                   <span className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">{ws.documentType} • {ws.lessonTitle || 'Standard'}</span>
                </div>
              ))}
           </div>
        </div>
        <div className="p-6 border-t border-slate-100 space-y-4">
           <button onClick={() => setMode(AppMode.SETTINGS)} className={`w-full p-4 rounded-2xl flex items-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all ${mode === AppMode.SETTINGS ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
              <Settings className="w-4 h-4" /> Identity Portal
           </button>
           <div className="p-3 bg-slate-900 rounded-xl text-white flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                 <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center font-black text-[10px] uppercase tracking-widest truncate">{user?.email?.[0] || 'G'}</div>
                 <span className="text-[9px] font-black uppercase tracking-widest truncate">{user?.email || 'Guest Session'}</span>
              </div>
              <button onClick={signOut} className="text-slate-400 hover:text-white transition-colors"><XCircle className="w-4 h-4" /></button>
           </div>
        </div>
      </aside>

      <main className="flex-1 lg:ml-80 min-h-screen relative">
        <div className="p-8 lg:p-12 pb-32">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-10 text-center">
               <div className="relative">
                  <div className="absolute inset-0 bg-blue-100 rounded-full blur-3xl animate-pulse"></div>
                  <Loader2 className="w-24 h-24 animate-spin text-blue-600 relative z-10" />
               </div>
               <div className="space-y-4">
                 <h2 className="text-5xl font-black uppercase tracking-tighter text-slate-900 leading-none">Architecting Pedagogy</h2>
                 <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Institutional Rigor in Progress...</p>
               </div>
            </div>
          ) : mode === AppMode.SETTINGS ? (
            <div className="max-w-4xl mx-auto py-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
               <header className="mb-16 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-blue-100">
                     <Settings className="w-3.5 h-3.5" /> Core Configuration
                  </div>
                  <h2 className="text-6xl font-black uppercase tracking-tighter text-slate-900 leading-none mb-4">Identity Portal</h2>
                  <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">Customize your institutional presence and pedagogical defaults</p>
               </header>

               <div className="bg-white rounded-[4rem] border-2 border-slate-100 shadow-2xl overflow-hidden p-16 space-y-12">
                  <section className="space-y-8">
                     <h3 className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-400"><Building className="w-4 h-4" /> Institutional Profile</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 block px-2">Institution Name</label>
                           <input className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:border-blue-600 transition-all" value={branding.institutionName} onChange={e => setBranding({...branding, institutionName: e.target.value})} />
                        </div>
                        <div className="space-y-4">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 block px-2">Faculty Representative</label>
                           <input className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:border-blue-600 transition-all" value={branding.instructorName} onChange={e => setBranding({...branding, instructorName: e.target.value})} />
                        </div>
                     </div>
                  </section>

                  <section className="space-y-8">
                     <h3 className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-400"><Palette className="w-4 h-4" /> Visual Identity</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 block px-2">Institutional Logo</label>
                           <div onClick={() => brandingLogoRef.current?.click()} className="h-48 border-4 border-dashed border-slate-100 bg-slate-50 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:border-blue-600 hover:bg-blue-50 transition-all group overflow-hidden">
                              <input type="file" ref={brandingLogoRef} className="hidden" accept="image/*" onChange={e => {
                                 const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setBranding({...branding, logoUrl: r.result as string}); r.readAsDataURL(f); }
                              }} />
                              {branding.logoUrl ? (
                                 <img src={branding.logoUrl} className="w-full h-full object-contain p-8" />
                              ) : (
                                 <>
                                    <CloudUpload className="w-10 h-10 text-slate-300 group-hover:text-blue-600 transition-colors mb-4" />
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Upload Official Shield</span>
                                 </>
                              )}
                           </div>
                        </div>
                        <div className="space-y-8">
                           <div className="space-y-4">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 block px-2">Institutional Color Accent</label>
                              <div className="flex gap-4 items-center">
                                 <input type="color" className="w-16 h-16 rounded-2xl border-none cursor-pointer p-0 bg-transparent" value={branding.primaryColor} onChange={e => setBranding({...branding, primaryColor: e.target.value})} />
                                 <div className="flex-1 p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-mono text-xs font-black text-slate-500 uppercase">{branding.primaryColor}</div>
                              </div>
                           </div>
                           <div className="space-y-4">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 block px-2">Primary Assessment Theme</label>
                              <select className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 outline-none cursor-pointer appearance-none" value={branding.defaultTheme} onChange={e => setBranding({...branding, defaultTheme: e.target.value as ThemeType})}>
                                 {Object.values(ThemeType).map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                           </div>
                        </div>
                     </div>
                  </section>

                  <section className="space-y-8">
                     <h3 className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-400"><Globe className="w-4 h-4" /> Network & Deployment</h3>
                     <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 block px-2">Custom Subdomain (Simulation)</label>
                        <div className="flex items-center">
                           <div className="p-5 bg-slate-100 border-2 border-r-0 border-slate-200 rounded-l-2xl font-black text-xs text-slate-400 uppercase tracking-widest">https://</div>
                           <input className="flex-1 p-5 bg-slate-50 border-2 border-slate-100 rounded-none font-bold text-slate-900 outline-none focus:border-blue-600 transition-all" placeholder="your-school" value={branding.customDomain?.split('.')[0]} onChange={e => setBranding({...branding, customDomain: `${e.target.value}.blueprint.edu`})} />
                           <div className="p-5 bg-slate-100 border-2 border-l-0 border-slate-200 rounded-r-2xl font-black text-xs text-slate-400 uppercase tracking-widest">.blueprint.edu</div>
                        </div>
                     </div>
                  </section>

                  <div className="pt-12 border-t border-slate-100 flex justify-end gap-6">
                     <button onClick={() => setMode(AppMode.ONBOARDING)} className="px-10 py-4 font-black uppercase tracking-widest text-[10px] text-slate-400 hover:text-slate-900 transition-colors">Discard</button>
                     <button onClick={handleSaveBranding} className="px-14 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[12px] hover:bg-blue-700 shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Synchronize Portal</button>
                  </div>
               </div>
            </div>
          ) : mode === AppMode.ONBOARDING ? (
            <div className="max-w-4xl mx-auto py-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
               <div className="text-center mb-16 space-y-4">
                  <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-white mx-auto shadow-2xl mb-8"><Briefcase className="w-10 h-10" /></div>
                  <h2 className="text-6xl font-black uppercase tracking-tighter text-slate-900 leading-none">Course Environment Setup</h2>
                  <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">Establish the pedagogical framework for your session</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white p-12 rounded-[4rem] border-2 border-slate-100 shadow-xl hover:shadow-2xl hover:border-blue-600 transition-all group flex flex-col justify-between cursor-pointer" onClick={() => guidelineInputRef.current?.click()}>
                     <input type="file" ref={guidelineInputRef} className="hidden" accept=".pdf,image/*" onChange={e => {
                        const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => { 
                           setFormData({...formData, guidelineData: { data: (r.result as string).split(',')[1], mimeType: f.type, name: f.name }});
                           setMode(AppMode.GENERATOR);
                        }; r.readAsDataURL(f); }
                     }} />
                     <div>
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-blue-600 group-hover:text-white transition-all"><CloudUpload className="w-8 h-8" /></div>
                        <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 mb-4">Attach Guidelines</h3>
                        <p className="text-slate-500 font-bold text-sm leading-relaxed mb-8 italic">Upload a Syllabus, Module Guide, or Grading Criteria to pre-populate assessment logic.</p>
                     </div>
                     <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600">Select Document <ChevronRight className="w-4 h-4" /></div>
                  </div>

                  <div className="bg-slate-900 p-12 rounded-[4rem] border-2 border-transparent shadow-xl hover:shadow-2xl hover:bg-slate-800 transition-all group flex flex-col justify-between cursor-pointer" onClick={() => setMode(AppMode.GENERATOR)}>
                     <div>
                        <div className="w-16 h-16 bg-slate-800 text-white rounded-2xl flex items-center justify-center mb-8 group-hover:bg-white group-hover:text-slate-900 transition-all"><ArrowRight className="w-8 h-8" /></div>
                        <h3 className="text-3xl font-black uppercase tracking-tighter text-white mb-4">Direct Intake</h3>
                        <p className="text-slate-400 font-bold text-sm leading-relaxed mb-8 italic">Proceed directly to the assessment architect to build from scratch without a syllabus.</p>
                     </div>
                     <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/50">Skip to Generator <ChevronRight className="w-4 h-4" /></div>
                  </div>
               </div>

               <div className="mt-16 p-8 bg-blue-50 border-2 border-blue-100 rounded-[2.5rem] flex items-center gap-6">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg shrink-0"><ShieldCheck className="w-6 h-6" /></div>
                  <div>
                     <p className="text-xs font-black uppercase tracking-widest text-blue-900 mb-1">Pedagogical Guardrail Active</p>
                     <p className="text-[10px] font-bold text-blue-700 leading-relaxed uppercase opacity-80">Guidelines uploaded here will act as the 'Contextual Master' for all variants produced in this session.</p>
                  </div>
               </div>
            </div>
          ) : mode === AppMode.GENERATOR ? (
            <div className="max-w-4xl mx-auto py-4 animate-in fade-in duration-500">
               <header className="text-center mb-12">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-blue-100">
                     <ShieldCheck className="w-3.5 h-3.5" /> High Performance Institutional Mode
                  </div>
                  <h2 className="text-7xl font-black tracking-tighter text-slate-900 mb-4 uppercase leading-none">Intake Module</h2>
                  {formData.guidelineData && (
                     <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 flex items-center justify-center gap-2 mb-8"><FileText className="w-4 h-4" /> Anchored to: {formData.guidelineData.name}</p>
                  )}
                  <div className="flex justify-center gap-6 mt-12">
                     {[1, 2, 3].map(s => (
                       <div key={s} className={`w-14 h-14 rounded-3xl flex items-center justify-center font-black transition-all border-4 shadow-sm ${currentStep === s ? 'bg-slate-900 border-slate-900 text-white scale-110' : 'bg-white border-slate-100 text-slate-300'}`}>{s}</div>
                     ))}
                  </div>
               </header>

               <div className="bg-white rounded-[4rem] shadow-2xl border-2 border-slate-100 overflow-hidden flex flex-col min-h-[600px] relative">
                  <div className="p-16 flex-1">
                    {currentStep === 1 && (
                      <div className="animate-in slide-in-from-right duration-300 space-y-10">
                         <div className="space-y-4">
                            <label className="text-[12px] font-black uppercase tracking-widest text-slate-900 block px-2">Assessment Identity</label>
                            <input className="w-full p-8 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] font-black text-2xl text-slate-900 outline-none focus:border-slate-900 transition-all placeholder:text-slate-300 shadow-inner" placeholder="e.g. Advanced Microeconomics Midterm" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
                         </div>
                         <div className="grid grid-cols-2 gap-8">
                            <input className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-slate-900 outline-none" placeholder="Unit Descriptor" value={formData.lessonTitle} onChange={e => setFormData({...formData, lessonTitle: e.target.value})} />
                            <input className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-slate-900 outline-none" placeholder="Module Ref" value={formData.moduleTitle} onChange={e => setFormData({...formData, moduleTitle: e.target.value})} />
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-4">
                              <label className="text-[12px] font-black uppercase tracking-widest text-slate-900 block px-2">Assessment Source Material</label>
                              <div onClick={() => fileInputRef.current?.click()} className={`h-48 border-4 border-dashed rounded-[3rem] transition-all flex flex-col items-center justify-center cursor-pointer ${formData.fileData ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}>
                                 <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={e => {
                                   const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setFormData({...formData, fileData: { data: (r.result as string).split(',')[1], mimeType: f.type, name: f.name }}); r.readAsDataURL(f); }
                                 }} />
                                 <CloudUpload className={`w-12 h-12 mb-4 ${formData.fileData ? 'text-blue-500' : 'text-slate-300'}`} />
                                 <span className="text-[10px] font-black uppercase text-slate-900">{formData.fileData?.name || 'Attach Supporting Assets'}</span>
                              </div>
                           </div>
                           <div className="space-y-4">
                              <label className="text-[12px] font-black uppercase tracking-widest text-slate-900 block px-2">Rigorous Constraints</label>
                              <textarea className="w-full h-48 p-8 bg-slate-50 border-2 border-slate-100 rounded-[3rem] font-bold text-slate-900 outline-none resize-none focus:border-slate-900 transition-all shadow-inner" placeholder="Enter specific session constraints..." value={formData.rawText} onChange={e => setFormData({...formData, rawText: e.target.value})} />
                           </div>
                         </div>
                      </div>
                    )}
                    {currentStep === 2 && (
                       <div className="animate-in slide-in-from-right duration-300 space-y-12 h-full flex flex-col justify-center">
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.values(CurriculumStandard).map(std => (
                              <button key={std} onClick={() => setFormData({...formData, curriculumStandard: std})} className={`p-5 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm ${formData.curriculumStandard === std ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-105' : 'bg-white text-slate-900 border-slate-100 hover:border-slate-900'}`}>{std.replace('_', ' ')}</button>
                            ))}
                         </div>
                         <div className="grid grid-cols-2 gap-10">
                            <div className="space-y-4">
                               <label className="text-[12px] font-black uppercase tracking-widest text-slate-900 block px-2">Cohort Grade</label>
                               <select className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-slate-900 outline-none cursor-pointer appearance-none" value={formData.audienceCategory} onChange={e => setFormData({...formData, audienceCategory: e.target.value as AudienceCategory})}>
                                  {Object.values(AudienceCategory).map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                               </select>
                            </div>
                            <div className="space-y-4">
                               <label className="text-[12px] font-black uppercase tracking-widest text-slate-900 block px-2">Taxonomy Level</label>
                               <select className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-slate-900 outline-none cursor-pointer appearance-none" value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})}>
                                  <option>Remembering/Understanding</option><option>Applying/Analyzing</option><option>Evaluating/Creating (Advanced)</option><option>Postgraduate Specialization</option>
                               </select>
                            </div>
                         </div>
                       </div>
                    )}
                    {currentStep === 3 && (
                       <div className="animate-in slide-in-from-right duration-300 h-full flex flex-col justify-center gap-12">
                          <button onClick={handleGenerate} className="w-full py-12 bg-blue-600 text-white rounded-[3rem] font-black text-4xl uppercase tracking-tighter hover:bg-blue-700 transition-all flex items-center justify-center gap-8 shadow-2xl hover:scale-[1.02] active:scale-95 group">
                             <GraduationCap className="w-10 h-10 group-hover:scale-110 transition-transform" />
                             Initiate Synthesis
                          </button>
                       </div>
                    )}
                  </div>
                  <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                     <button onClick={() => setCurrentStep(s => s - 1)} disabled={currentStep === 1} className="text-slate-900 font-black uppercase tracking-widest text-[11px] disabled:opacity-0 flex items-center gap-3 hover:translate-x-[-4px] transition-transform"><ArrowLeft className="w-6 h-6" /> Return</button>
                     <button onClick={() => { if (currentStep < 3) setCurrentStep(s => s + 1); }} disabled={currentStep === 3} className="px-14 py-4 bg-white border-2 border-slate-900 text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[12px] hover:bg-slate-900 hover:text-white transition-all">Proceed</button>
                  </div>
               </div>
            </div>
          ) : worksheet && (
            <div className="animate-in fade-in duration-500">
               <WorksheetView worksheet={worksheet} theme={branding.defaultTheme} showKey={showTeacherKey} isMathMode={isMathMode} onUpdate={setWorksheet} />
               <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/95 p-4 rounded-full shadow-2xl border-2 border-slate-200 z-[90] no-print backdrop-blur-xl">
                  <button onClick={() => setShowTeacherKey(!showTeacherKey)} className={`px-10 py-4 rounded-full font-black text-[12px] uppercase tracking-widest transition-all shadow-lg flex items-center gap-3 ${showTeacherKey ? 'bg-red-600 text-white' : 'bg-slate-50 text-slate-900 border border-slate-200 hover:bg-slate-100'}`}>
                    {showTeacherKey ? 'Conceal Solution Key' : 'Reveal Solution Key'}
                  </button>
                  <button onClick={() => { setMode(AppMode.ONBOARDING); setCurrentStep(1); }} className="px-10 py-4 bg-slate-950 text-white rounded-full font-black text-[12px] uppercase tracking-widest flex items-center gap-3 hover:bg-black transition-all shadow-xl"><Plus className="w-4 h-4" /> New Intake</button>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
