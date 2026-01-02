
import React, { useState, useRef, useEffect } from 'react';
import { AppMode, Worksheet, ThemeType, QuestionType, DocumentType, AudienceCategory, LearnerProfile, CurriculumStandard } from './types';
import { generateWorksheet } from './services/geminiService';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { WorksheetView } from './components/WorksheetView';
import { 
  GraduationCap, Loader2, ArrowRight, ArrowLeft, 
  Plus, Sparkles, CloudUpload, FileText,
  BookOpen, LayoutGrid, ShieldCheck, Key, ExternalLink, AlertTriangle,
  Layers
} from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<{message: string, isWarning?: boolean} | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  const [mode, setMode] = useState<AppMode>(AppMode.GENERATOR);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [worksheet, setWorksheet] = useState<Worksheet | null>(null);
  const [currentBulkSet, setCurrentBulkSet] = useState<Worksheet[]>([]);
  const [savedWorksheets, setSavedWorksheets] = useState<Worksheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMathMode, setIsMathMode] = useState(true);
  const [showTeacherKey, setShowTeacherKey] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkCount, setBulkCount] = useState(3);
  
  const [formData, setFormData] = useState({
    topic: '',
    lessonTitle: '',
    moduleTitle: '',
    audienceCategory: AudienceCategory.UNIVERSITY,
    educationalLevel: 'Degree Level',
    learnerProfile: LearnerProfile.GENERAL,
    curriculumStandard: CurriculumStandard.CUSTOM,
    difficulty: 'Challenging',
    language: 'English',
    documentType: DocumentType.ASSIGNMENT,
    rawText: '',
    questionCounts: { [QuestionType.MCQ]: 5, [QuestionType.SHORT_ANSWER]: 3 } as Record<string, number>,
    fileData: null as { data: string; mimeType: string; name: string } | null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        // Fallback for non-AI Studio environments if needed
        setHasApiKey(true); 
      }
    };
    checkApiKey();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setUser(session.user); setIsGuest(false); }
      setAuthLoading(false);
    });
    const guestStatus = localStorage.getItem('isGuest');
    if (guestStatus === 'true') setIsGuest(true);
  }, []);

  useEffect(() => { if (user || isGuest) fetchUserContent(); }, [user, isGuest]);

  const fetchUserContent = async () => {
    if (user && isSupabaseConfigured && !user.isMock) {
      const { data: ws } = await supabase.from('worksheets').select('*').order('savedAt', { ascending: false });
      if (ws) setSavedWorksheets(ws);
    } else {
      const local = JSON.parse(localStorage.getItem('local_archive') || '[]');
      setSavedWorksheets(local);
    }
  };

  const handleOpenKeySelector = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      setHasApiKey(true); // Assume success per guidelines
    }
  };

  const handleGenerate = async () => {
    if (!hasApiKey) {
      setAuthError({ message: "Academic License (API Key) Required. Please click 'Select API Key' below.", isWarning: true });
      return;
    }

    setLoading(true);
    setAuthError(null);
    try {
      const result = await generateWorksheet({ ...formData, useGrounding: false, isMathMode, bulkCount: isBulkMode ? bulkCount : 1 });
      const results = Array.isArray(result) ? result : [result];
      
      const newSheets = results.map(ws => ({
        ...ws,
        id: Math.random().toString(36).substr(2, 9),
        lessonTitle: formData.lessonTitle,
        moduleTitle: formData.moduleTitle,
        savedAt: Date.now(),
        userId: user?.id
      }));

      if (user && isSupabaseConfigured && !user.isMock) {
        await supabase.from('worksheets').insert(newSheets);
      } else {
        const local = JSON.parse(localStorage.getItem('local_archive') || '[]');
        const updated = [...newSheets, ...local].slice(0, 50);
        localStorage.setItem('local_archive', JSON.stringify(updated));
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
      if (e.message === "API_KEY_EXPIRED") {
        setHasApiKey(false);
        setAuthError({ message: "API Key invalid or expired. Please re-select a paid project key." });
      } else {
        alert("Generation failed: " + e.message);
      }
    } finally { setLoading(false); }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = isSignUp ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError({ message: error.message });
    else if (data.user) setUser(data.user);
    setLoading(false);
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-blue-500" /></div>;

  if (!user && !isGuest) return (
    <div className="min-h-screen flex bg-slate-950 font-sans overflow-hidden">
      <div className="hidden lg:flex flex-1 items-center justify-center p-20 bg-slate-900 relative">
        <div className="relative z-10 max-w-lg text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white mb-10 mx-auto shadow-2xl shadow-blue-500/20"><GraduationCap className="w-12 h-12" /></div>
          <h1 className="text-8xl font-black text-white tracking-tighter mb-6 leading-none uppercase">Blueprint<br/><span className="text-blue-500">Pro</span></h1>
          <p className="text-xl text-slate-400 font-medium leading-relaxed">The high-rigor assessment engine for universities and elite schools.</p>
          
          <div className="mt-12 p-6 bg-slate-800/50 border border-slate-700 rounded-[2.5rem] inline-block text-left">
             <div className="flex items-center gap-3 mb-3">
                <ShieldCheck className="w-5 h-5 text-green-400" />
                <span className="text-xs font-black uppercase text-white tracking-widest">Compliance standards</span>
             </div>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider max-w-xs leading-relaxed">Enterprise Security • Academic Integrity • Advanced Pedagogy • Data Privacy</p>
          </div>
        </div>
      </div>
      <div className="w-full lg:w-[600px] bg-white flex flex-col items-center justify-center p-12 relative">
        <div className="absolute top-12 right-12 flex items-center gap-2">
           <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">
              Billing Docs <ExternalLink className="w-3 h-3" />
           </a>
        </div>

        <form onSubmit={handleAuth} className="w-full max-w-sm space-y-6">
          <div className="text-center mb-10">
            <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter mb-2 underline decoration-8 decoration-blue-500 underline-offset-8">Institutional Portal</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Access Enterprise Resources</p>
          </div>

          {authError && (
            <div className={`p-5 rounded-2xl text-xs font-bold border flex gap-3 items-center ${authError.isWarning ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-red-50 border-red-100 text-red-700'}`}>
              {authError.isWarning ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <ShieldCheck className="w-5 h-5 shrink-0" />}
              {authError.message}
            </div>
          )}

          <div className="space-y-3">
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email / Faculty ID" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-900 outline-none font-bold text-slate-900" />
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Secure Password" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-900 outline-none font-bold text-slate-900" />
          </div>

          <button className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95">{loading ? <Loader2 className="animate-spin mx-auto" /> : 'Enter Portal'}</button>
          
          <div className="relative py-4">
             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
             <div className="relative flex justify-center"><span className="bg-white px-4 text-[9px] font-black uppercase text-slate-300 tracking-widest">Or Secure Entry</span></div>
          </div>

          <button type="button" onClick={() => { setIsGuest(true); localStorage.setItem('isGuest', 'true'); }} className="w-full py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:border-slate-900 hover:text-slate-900 transition-all flex items-center justify-center gap-3 active:scale-95">Guest Credential Access</button>
        </form>

        <div className="mt-16 w-full max-w-sm">
           <div className={`p-8 rounded-[2rem] border-2 transition-all ${hasApiKey ? 'bg-green-50 border-green-100' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2">
                    <Key className={`w-4 h-4 ${hasApiKey ? 'text-green-600' : 'text-slate-400'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Academic License</span>
                 </div>
                 <div className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
              </div>
              <p className="text-[10px] text-slate-500 font-bold mb-6 leading-relaxed">University-grade features require a valid API key from a paid GCP project.</p>
              <button onClick={handleOpenKeySelector} className="w-full py-3 bg-white border-2 border-slate-200 text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-slate-900 transition-all shadow-sm">
                 {hasApiKey ? 'Modify License' : 'Activate License'}
              </button>
           </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans antialiased overflow-x-hidden">
      {/* Sidebar and rest of App remain mostly same, adding license check to generate button */}
      <aside className="w-80 bg-white border-r border-slate-200 hidden lg:flex flex-col fixed h-full z-20 no-print">
        <div className="p-8 border-b border-slate-100">
           <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white"><GraduationCap className="w-6 h-6" /></div>
              <div><h1 className="font-black text-xl tracking-tighter leading-none uppercase text-slate-900">Blueprint Pro</h1><span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Generator Engine</span></div>
           </div>
           <button onClick={() => { setMode(AppMode.GENERATOR); setCurrentStep(1); setIsBulkMode(false); }} className="w-full flex items-center justify-center gap-3 p-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md hover:scale-[1.02] transition-transform">
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
        <div className="p-6 border-t border-slate-100">
           <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-3">
                 <div className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-green-500' : 'bg-red-500'}`}></div>
                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">License Status</span>
              </div>
              <button onClick={handleOpenKeySelector} className="text-[9px] font-black uppercase text-blue-600 hover:underline">Manage</button>
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
                 <h2 className="text-5xl font-black uppercase tracking-tighter text-slate-900 leading-none">
                    {isBulkMode ? `Parallel Process: ${bulkCount} Variants` : "Architecting Pedagogy"}
                 </h2>
                 <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Institutional Rigor in Progress...</p>
                 <div className="flex justify-center gap-2 mt-8">
                    <span className="px-3 py-1 bg-slate-100 rounded text-[8px] font-black uppercase text-slate-400">Standard Check</span>
                    <span className="px-3 py-1 bg-slate-100 rounded text-[8px] font-black uppercase text-slate-400">Taxonomy Mapping</span>
                    <span className="px-3 py-1 bg-slate-100 rounded text-[8px] font-black uppercase text-slate-400">Visual Synthesis</span>
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
                  <div className="flex justify-center gap-6 mt-12">
                     {[1, 2, 3].map(s => (
                       <div key={s} className={`w-14 h-14 rounded-3xl flex items-center justify-center font-black transition-all border-4 shadow-sm ${currentStep === s ? 'bg-slate-900 border-slate-900 text-white scale-110' : 'bg-white border-slate-100 text-slate-300'}`}>{s}</div>
                     ))}
                  </div>
               </header>

               <div className="bg-white rounded-[4rem] shadow-2xl border-2 border-slate-100 overflow-hidden flex flex-col min-h-[600px] relative">
                  {authError && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[60] w-full max-w-lg px-8">
                       <div className="p-4 bg-amber-50 border-2 border-amber-200 text-amber-900 rounded-3xl text-xs font-black uppercase tracking-widest flex items-center gap-3 shadow-xl">
                          <AlertTriangle className="w-5 h-5" /> {authError.message}
                       </div>
                    </div>
                  )}

                  <div className="p-16 flex-1">
                    {currentStep === 1 && (
                      <div className="animate-in slide-in-from-right duration-300 space-y-10">
                         <div className="space-y-4">
                            <label className="text-[12px] font-black uppercase tracking-widest text-slate-900 block px-2">Assessment Identity</label>
                            <input className="w-full p-8 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] font-black text-2xl text-slate-900 outline-none focus:border-slate-900 transition-all placeholder:text-slate-300 shadow-inner" placeholder="e.g. Advanced Microeconomics Midterm" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
                         </div>
                         
                         <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-3">
                               <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 block px-2">Unit Descriptor</label>
                               <input className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-slate-900 outline-none" placeholder="e.g. Market Equilibrium" value={formData.lessonTitle} onChange={e => setFormData({...formData, lessonTitle: e.target.value})} />
                            </div>
                            <div className="space-y-3">
                               <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 block px-2">Module Ref</label>
                               <input className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-slate-900 outline-none" placeholder="e.g. ECON-301 Section B" value={formData.moduleTitle} onChange={e => setFormData({...formData, moduleTitle: e.target.value})} />
                            </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-4">
                              <label className="text-[12px] font-black uppercase tracking-widest text-slate-900 block px-2">Pedagogical Source Materials</label>
                              <div onClick={() => fileInputRef.current?.click()} className={`h-48 border-4 border-dashed rounded-[3rem] transition-all flex flex-col items-center justify-center cursor-pointer ${formData.fileData ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}>
                                 <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={e => {
                                   const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setFormData({...formData, fileData: { data: (r.result as string).split(',')[1], mimeType: f.type, name: f.name }}); r.readAsDataURL(f); }
                                 }} />
                                 <CloudUpload className={`w-12 h-12 mb-4 ${formData.fileData ? 'text-blue-500' : 'text-slate-300'}`} />
                                 <span className="text-[10px] font-black uppercase text-slate-900">{formData.fileData?.name || 'Attach Syllabus / Notes'}</span>
                              </div>
                           </div>
                           <div className="space-y-4">
                              <label className="text-[12px] font-black uppercase tracking-widest text-slate-900 block px-2">Rigorous Constraints</label>
                              <textarea className="w-full h-48 p-8 bg-slate-50 border-2 border-slate-100 rounded-[3rem] font-bold text-slate-900 outline-none resize-none focus:border-slate-900 transition-all shadow-inner" placeholder="Enter high-level requirements or marking criteria..." value={formData.rawText} onChange={e => setFormData({...formData, rawText: e.target.value})} />
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
                               <select className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-slate-900 outline-none cursor-pointer hover:border-slate-900 transition-colors appearance-none" value={formData.audienceCategory} onChange={e => setFormData({...formData, audienceCategory: e.target.value as AudienceCategory})}>
                                  {Object.values(AudienceCategory).map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                               </select>
                            </div>
                            <div className="space-y-4">
                               <label className="text-[12px] font-black uppercase tracking-widest text-slate-900 block px-2">Bloom's Taxonomy Level</label>
                               <select className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-slate-900 outline-none cursor-pointer hover:border-slate-900 transition-colors appearance-none" value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})}>
                                  <option>Remembering/Understanding</option><option>Applying/Analyzing</option><option>Evaluating/Creating (Advanced)</option><option>Postgraduate Specialization</option>
                               </select>
                            </div>
                         </div>
                       </div>
                    )}
                    {currentStep === 3 && (
                       <div className="animate-in slide-in-from-right duration-300 h-full flex flex-col justify-center gap-12">
                          <div className={`p-10 rounded-[3rem] text-white flex items-center justify-between transition-all duration-500 shadow-2xl ${isBulkMode ? 'bg-blue-600 scale-105 ring-[12px] ring-blue-50' : 'bg-slate-900'}`}>
                             <div className="flex items-center gap-8">
                                <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center transition-all ${isBulkMode ? 'bg-white text-blue-600 shadow-xl' : 'bg-slate-800 text-blue-400'}`}>
                                   <Layers className="w-10 h-10" />
                                </div>
                                <div>
                                   <h3 className="text-3xl font-black uppercase tracking-tighter">Variant Factory</h3>
                                   <p className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${isBulkMode ? 'text-blue-100' : 'text-slate-400'}`}>Produce diverse assessment containers in parallel</p>
                                </div>
                             </div>
                             <div className="flex items-center gap-8">
                                {isBulkMode && (
                                   <div className="flex items-center gap-4">
                                      <span className="text-[10px] font-black uppercase text-blue-100">Set Count</span>
                                      <input type="number" min="2" max="10" className="w-20 bg-blue-700 border-4 border-blue-400 p-3 rounded-2xl text-center font-black text-white text-2xl outline-none" value={bulkCount} onChange={e => setBulkCount(parseInt(e.target.value))} />
                                   </div>
                                )}
                                <button onClick={() => setIsBulkMode(!isBulkMode)} className={`w-20 h-12 rounded-full transition-all relative border-4 ${isBulkMode ? 'bg-white border-white' : 'bg-slate-800 border-slate-700'}`}>
                                   <div className={`absolute top-1 w-8 h-8 rounded-full transition-all shadow-lg ${isBulkMode ? 'left-10 bg-blue-600' : 'left-1 bg-white'}`} />
                                </button>
                             </div>
                          </div>
                          
                          <button onClick={handleGenerate} className="w-full py-12 bg-blue-600 text-white rounded-[3rem] font-black text-4xl uppercase tracking-tighter hover:bg-blue-700 transition-all flex items-center justify-center gap-8 shadow-[0_30px_60px_-15px_rgba(37,99,235,0.4)] hover:scale-[1.02] active:scale-95 group">
                             {isBulkMode ? <Sparkles className="w-10 h-10 group-hover:rotate-12 transition-transform" /> : <GraduationCap className="w-10 h-10 group-hover:scale-110 transition-transform" />}
                             Initiate {isBulkMode ? `${bulkCount} Variants` : 'Blueprint Synthesis'}
                          </button>
                       </div>
                    )}
                  </div>
                  <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                     <button onClick={() => setCurrentStep(s => s - 1)} disabled={currentStep === 1} className="text-slate-900 font-black uppercase tracking-widest text-[11px] disabled:opacity-0 flex items-center gap-3 hover:translate-x-[-4px] transition-transform"><ArrowLeft className="w-6 h-6" /> Return</button>
                     <button onClick={() => setCurrentStep(s => s + 1)} disabled={currentStep === 3} className="px-14 py-4 bg-white border-2 border-slate-900 text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[12px] hover:bg-slate-900 hover:text-white transition-all shadow-sm">Advanced Proceed</button>
                  </div>
               </div>
            </div>
          ) : mode === AppMode.BULK_REVIEW ? (
            <div className="animate-in fade-in duration-700 space-y-12">
               <div className="flex items-center justify-between bg-white p-10 rounded-[3rem] border-2 border-slate-100 shadow-sm">
                  <div className="flex items-center gap-6">
                     <div className="w-16 h-16 bg-blue-600 rounded-[1.25rem] flex items-center justify-center text-white"><LayoutGrid className="w-8 h-8" /></div>
                     <div>
                       <h2 className="text-5xl font-black uppercase tracking-tighter text-slate-900 mb-1 leading-none">Review Matrix</h2>
                       <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Institutional Cohort: {formData.topic || 'Project X'}</p>
                     </div>
                  </div>
                  <button onClick={() => { setMode(AppMode.GENERATOR); setCurrentStep(1); }} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:scale-105 transition-all flex items-center gap-3">
                    <Plus className="w-5 h-5" /> Re-Intake
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12">
                  {currentBulkSet.map((ws, idx) => (
                    <div key={ws.id} className="group relative bg-white border-2 border-slate-200 rounded-[3.5rem] p-10 shadow-sm hover:shadow-2xl hover:border-blue-400 transition-all flex flex-col min-h-[550px] overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 -mr-16 -mt-16 rounded-full group-hover:bg-blue-50 transition-colors"></div>
                       <div className="absolute top-8 right-8 z-10">
                          <span className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center font-black text-sm shadow-xl">V{idx + 1}</span>
                       </div>
                       
                       <div className="flex-1 relative z-10">
                          <div className="flex items-center gap-4 mb-8">
                             <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-900 group-hover:bg-blue-600 group-hover:text-white transition-all"><FileText className="w-7 h-7" /></div>
                             <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 truncate pr-16">{ws.title}</h3>
                          </div>
                          
                          <div className="space-y-5 mb-10">
                             <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Item Complexity</p>
                                <p className="text-base font-black text-slate-900">{ws.questions.length} Evaluative Objects</p>
                             </div>
                             <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Core Thematic</p>
                                <p className="text-xs font-bold text-slate-700 leading-relaxed line-clamp-3 italic opacity-80">"{ws.topic}"</p>
                             </div>
                          </div>
                       </div>

                       <div className="space-y-4 relative z-10">
                          <button onClick={() => { setWorksheet(ws); setMode(AppMode.WORKSHEET); }} className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-blue-700 shadow-xl transition-all flex items-center justify-center gap-3">
                             <Sparkles className="w-5 h-5" /> Inspect Model
                          </button>
                          <div className="flex gap-4">
                             <button className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-[1.25rem] font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all">Archive</button>
                             <button className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-[1.25rem] font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all">Delete</button>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          ) : worksheet && (
            <div className="animate-in fade-in duration-500">
               <WorksheetView worksheet={worksheet} theme={ThemeType.ACADEMIC} showKey={showTeacherKey} isMathMode={isMathMode} onUpdate={setWorksheet} />
               <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/95 p-4 rounded-full shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] border-2 border-slate-200 z-[90] no-print backdrop-blur-xl">
                  <button onClick={() => setShowTeacherKey(!showTeacherKey)} className={`px-10 py-4 rounded-full font-black text-[12px] uppercase tracking-widest transition-all shadow-lg flex items-center gap-3 ${showTeacherKey ? 'bg-red-600 text-white shadow-red-200 ring-4 ring-red-100' : 'bg-slate-50 text-slate-900 border border-slate-200 hover:bg-slate-100'}`}>
                    {showTeacherKey ? <BookOpen className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                    {showTeacherKey ? 'Conceal Registry' : 'Reveal Registry'}
                  </button>
                  <div className="w-[1.5px] h-8 bg-slate-200"></div>
                  {isBulkMode && (
                    <button onClick={() => setMode(AppMode.BULK_REVIEW)} className="px-10 py-4 bg-slate-50 text-slate-900 border border-slate-200 rounded-full font-black text-[12px] uppercase tracking-widest flex items-center gap-3 hover:bg-slate-100 transition-all"><LayoutGrid className="w-4 h-4" /> Matrix View</button>
                  )}
                  <button onClick={() => { setMode(AppMode.GENERATOR); setCurrentStep(1); }} className="px-10 py-4 bg-slate-950 text-white rounded-full font-black text-[12px] uppercase tracking-widest flex items-center gap-3 hover:scale-105 hover:bg-black transition-all shadow-xl"><Plus className="w-4 h-4" /> New Intake</button>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
