
import React, { useState, useRef, useEffect } from 'react';
import { AppMode, Worksheet, ThemeType, QuestionType, DocumentType, AudienceCategory, LearnerProfile, CurriculumStandard } from './types';
import { generateWorksheet } from './services/geminiService';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { WorksheetView } from './components/WorksheetView';
import { 
  GraduationCap, Loader2, ArrowRight, ArrowLeft, 
  Plus, Baby, School, Building2, UserCircle, 
  Sparkles, CloudUpload, ShieldCheck, User as UserIcon, LogOut, Mail, Lock, AlertCircle, Layers, FileText,
  BookOpen, LayoutGrid, CheckCircle2
} from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<{message: string, isWarning?: boolean} | null>(null);

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

  const handleGenerate = async () => {
    setLoading(true);
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
    } catch (e) { alert("Failed to generate."); } finally { setLoading(false); }
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
        <div className="relative z-10 max-w-lg">
          <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-400 mb-8 border border-blue-500/20"><GraduationCap className="w-10 h-10" /></div>
          <h1 className="text-8xl font-black text-white tracking-tighter mb-6 leading-none uppercase">Blueprint<br/><span className="text-blue-500">Pro</span></h1>
          <p className="text-2xl text-slate-400 font-medium leading-relaxed">Professional assessment generation for schools & universities.</p>
        </div>
      </div>
      <div className="w-full lg:w-[550px] bg-white flex flex-col items-center justify-center p-8">
        <form onSubmit={handleAuth} className="w-full max-w-sm space-y-5">
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-8 text-center underline decoration-8 decoration-blue-500 underline-offset-8">Portal</h2>
          {authError && <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-xs font-bold">{authError.message}</div>}
          <div className="space-y-3">
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-900 outline-none font-bold text-slate-900" />
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-900 outline-none font-bold text-slate-900" />
          </div>
          <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all">{loading ? <Loader2 className="animate-spin mx-auto" /> : 'Enter Portal'}</button>
          <button type="button" onClick={() => { setIsGuest(true); localStorage.setItem('isGuest', 'true'); }} className="w-full py-4 text-slate-600 font-black uppercase tracking-widest text-[11px] hover:text-slate-900 transition-all">Continue as Guest Mode</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans antialiased overflow-x-hidden">
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
      </aside>

      <main className="flex-1 lg:ml-80 min-h-screen relative">
        <div className="p-8 lg:p-12 pb-32">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-10">
               <div className="relative">
                  <Loader2 className="w-24 h-24 animate-spin text-blue-600" />
                  <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-900 w-8 h-8" />
               </div>
               <div className="text-center">
                 <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900">
                    {isBulkMode ? `Drafting ${bulkCount} Unique Variants...` : "Synthesizing Standards..."}
                 </h2>
                 <p className="text-slate-900 font-bold uppercase tracking-widest text-xs mt-4 bg-yellow-100 px-6 py-2 rounded-full inline-block border border-yellow-200 shadow-sm">
                    {isBulkMode ? "Parallelizing pedagogical engine" : "Calibrating institutional rigor"}
                 </p>
               </div>
            </div>
          ) : mode === AppMode.GENERATOR ? (
            <div className="max-w-4xl mx-auto py-4">
               <header className="text-center mb-12">
                  <h2 className="text-6xl font-black tracking-tighter text-slate-900 mb-4 uppercase">Intake Module</h2>
                  <div className="flex justify-center gap-6 mt-12">
                     {[1, 2, 3].map(s => (
                       <div key={s} className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all border-4 shadow-sm ${currentStep === s ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>{s}</div>
                     ))}
                  </div>
               </header>

               <div className="bg-white rounded-[3rem] shadow-2xl border-2 border-slate-100 overflow-hidden flex flex-col min-h-[600px]">
                  <div className="p-12 flex-1">
                    {currentStep === 1 && (
                      <div className="animate-in slide-in-from-right duration-300 space-y-8">
                         <div className="space-y-4">
                            <label className="text-[12px] font-black uppercase tracking-widest text-slate-900 block px-2">Assessment Objective Title</label>
                            <input className="w-full p-6 bg-slate-50 border-2 border-slate-200 rounded-3xl font-black text-xl text-slate-900 outline-none focus:border-slate-900 transition-all placeholder:text-slate-300 shadow-inner" placeholder="e.g. Theoretical Physics Midterm 2024" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
                         </div>
                         
                         <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-3">
                               <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 block px-2">Lesson Title</label>
                               <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-slate-900 outline-none" placeholder="e.g. Quantum States" value={formData.lessonTitle} onChange={e => setFormData({...formData, lessonTitle: e.target.value})} />
                            </div>
                            <div className="space-y-3">
                               <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 block px-2">Module / Chapter</label>
                               <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-slate-900 outline-none" placeholder="e.g. Module 4" value={formData.moduleTitle} onChange={e => setFormData({...formData, moduleTitle: e.target.value})} />
                            </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-4">
                              <label className="text-[12px] font-black uppercase tracking-widest text-slate-900 block px-2">Reference Source</label>
                              <div onClick={() => fileInputRef.current?.click()} className={`h-40 border-4 border-dashed rounded-[2.5rem] transition-all flex flex-col items-center justify-center cursor-pointer ${formData.fileData ? 'border-blue-500 bg-blue-50 shadow-inner' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
                                 <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={e => {
                                   const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setFormData({...formData, fileData: { data: (r.result as string).split(',')[1], mimeType: f.type, name: f.name }}); r.readAsDataURL(f); }
                                 }} />
                                 <CloudUpload className={`w-10 h-10 ${formData.fileData ? 'text-blue-500' : 'text-slate-900 opacity-20'}`} />
                                 <span className="text-[10px] font-black uppercase mt-3 text-slate-900">{formData.fileData?.name || 'Upload Document'}</span>
                              </div>
                           </div>
                           <div className="space-y-4">
                              <label className="text-[12px] font-black uppercase tracking-widest text-slate-900 block px-2">Additional Constraints</label>
                              <textarea className="w-full h-40 p-6 bg-slate-50 border-2 border-slate-200 rounded-[2.5rem] font-bold text-slate-900 outline-none resize-none focus:border-slate-900 transition-all shadow-inner" placeholder="Enter specific institutional requirements..." value={formData.rawText} onChange={e => setFormData({...formData, rawText: e.target.value})} />
                           </div>
                         </div>
                      </div>
                    )}
                    {currentStep === 2 && (
                       <div className="animate-in slide-in-from-right duration-300 space-y-12">
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.values(CurriculumStandard).map(std => (
                              <button key={std} onClick={() => setFormData({...formData, curriculumStandard: std})} className={`p-4 rounded-xl border-2 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm ${formData.curriculumStandard === std ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105' : 'bg-white text-slate-900 border-slate-200 hover:border-slate-900'}`}>{std.replace('_', ' ')}</button>
                            ))}
                         </div>
                         <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4">
                               <label className="text-[12px] font-black uppercase tracking-widest text-slate-900 block px-2">Student Audience Tier</label>
                               <select className="w-full p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-slate-900 outline-none cursor-pointer" value={formData.audienceCategory} onChange={e => setFormData({...formData, audienceCategory: e.target.value as AudienceCategory})}>
                                  {Object.values(AudienceCategory).map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                               </select>
                            </div>
                            <div className="space-y-4">
                               <label className="text-[12px] font-black uppercase tracking-widest text-slate-900 block px-2">Difficulty Spectrum</label>
                               <select className="w-full p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-slate-900 outline-none cursor-pointer" value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})}>
                                  <option>Introductory (100 Level)</option><option>Standard Undergraduate</option><option>Advanced / Challenging</option><option>Professional Postgraduate</option>
                               </select>
                            </div>
                         </div>
                       </div>
                    )}
                    {currentStep === 3 && (
                       <div className="animate-in slide-in-from-right duration-300 h-full flex flex-col justify-center gap-10">
                          <div className={`p-10 rounded-[2.5rem] text-white flex items-center justify-between transition-all duration-500 shadow-xl ${isBulkMode ? 'bg-blue-600 scale-105 ring-8 ring-blue-100' : 'bg-slate-900'}`}>
                             <div className="flex items-center gap-6">
                                <div className={`p-4 rounded-2xl transition-all ${isBulkMode ? 'bg-white text-blue-600' : 'bg-slate-800 text-blue-400'}`}>
                                   <Layers className="w-10 h-10" />
                                </div>
                                <div><h3 className="text-xl font-black uppercase tracking-tight">Bulk Variant Generation</h3><p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isBulkMode ? 'text-blue-100' : 'text-slate-400'}`}>Produce multiple distinct containers</p></div>
                             </div>
                             <div className="flex items-center gap-6">
                                {isBulkMode && (
                                   <div className="flex items-center gap-3">
                                      <input type="number" min="2" max="10" className="w-16 bg-blue-700 border-2 border-blue-400 p-2 rounded-xl text-center font-black text-white text-lg outline-none" value={bulkCount} onChange={e => setBulkCount(parseInt(e.target.value))} />
                                   </div>
                                )}
                                <button onClick={() => setIsBulkMode(!isBulkMode)} className={`w-16 h-10 rounded-full transition-all relative border-2 ${isBulkMode ? 'bg-white border-white' : 'bg-slate-700 border-slate-600'}`}><div className={`absolute top-1 w-6 h-6 rounded-full transition-all shadow-md ${isBulkMode ? 'left-8 bg-blue-600' : 'left-1 bg-white'}`} /></button>
                             </div>
                          </div>
                          
                          <button onClick={handleGenerate} className="w-full py-10 bg-blue-600 text-white rounded-[2.5rem] font-black text-3xl uppercase tracking-tighter hover:bg-blue-700 transition-all flex items-center justify-center gap-6 shadow-2xl hover:scale-[1.01] active:scale-95">
                             {isBulkMode ? <Sparkles className="w-8 h-8" /> : <GraduationCap className="w-8 h-8" />}
                             Construct {isBulkMode ? `${bulkCount} Variants` : 'Blueprint Asset'}
                          </button>
                       </div>
                    )}
                  </div>
                  <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                     <button onClick={() => setCurrentStep(s => s - 1)} disabled={currentStep === 1} className="text-slate-900 font-black uppercase tracking-widest text-[11px] disabled:opacity-0 flex items-center gap-2 hover:translate-x-[-4px] transition-transform"><ArrowLeft className="w-5 h-5" /> Back</button>
                     <button onClick={() => setCurrentStep(s => s + 1)} disabled={currentStep === 3} className="px-10 py-3 bg-white border-2 border-slate-900 text-slate-900 rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-900 hover:text-white transition-all">Proceed</button>
                  </div>
               </div>
            </div>
          ) : mode === AppMode.BULK_REVIEW ? (
            <div className="animate-in fade-in duration-700 space-y-12">
               <div className="flex items-center justify-between bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                  <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 mb-1">Variant Review Dashboard</h2>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Lesson: {formData.lessonTitle || 'Unassigned'} • Module: {formData.moduleTitle || 'Standard'}</p>
                  </div>
                  <button onClick={() => { setMode(AppMode.GENERATOR); setCurrentStep(1); }} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:scale-105 transition-all flex items-center gap-2">
                    <Plus className="w-4 h-4" /> New Intake
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                  {currentBulkSet.map((ws, idx) => (
                    <div key={ws.id} className="group relative bg-white border-2 border-slate-200 rounded-[3rem] p-8 shadow-sm hover:shadow-2xl hover:border-blue-300 transition-all flex flex-col min-h-[500px]">
                       <div className="absolute top-6 right-6 flex items-center gap-2">
                          <span className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-md">v{idx + 1}</span>
                       </div>
                       
                       <div className="flex-1">
                          <div className="flex items-center gap-3 mb-6">
                             <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500"><FileText className="w-6 h-6" /></div>
                             <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 truncate pr-12">{ws.title}</h3>
                          </div>
                          
                          <div className="space-y-4 mb-8">
                             <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Assessment Objects</p>
                                <p className="text-sm font-bold text-slate-700">{ws.questions.length} Items generated</p>
                             </div>
                             <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Primary Focus</p>
                                <p className="text-xs font-medium text-slate-600 line-clamp-2">{ws.topic}</p>
                             </div>
                          </div>
                       </div>

                       <div className="space-y-3">
                          <button onClick={() => { setWorksheet(ws); setMode(AppMode.WORKSHEET); }} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 shadow-md transition-all flex items-center justify-center gap-2">
                             <Sparkles className="w-4 h-4" /> Open Full Builder
                          </button>
                          <div className="flex gap-3">
                             <button className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-200 transition-all">Quick Save</button>
                             <button className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-200 transition-all">Archived</button>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          ) : worksheet && (
            <div className="animate-in fade-in duration-500">
               <WorksheetView worksheet={worksheet} theme={ThemeType.ACADEMIC} showKey={showTeacherKey} isMathMode={isMathMode} onUpdate={setWorksheet} />
               <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/95 p-4 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-2 border-slate-200 z-[90] no-print backdrop-blur-md">
                  <button onClick={() => setShowTeacherKey(!showTeacherKey)} className={`px-10 py-4 rounded-full font-black text-[12px] uppercase tracking-widest transition-all shadow-lg flex items-center gap-3 ${showTeacherKey ? 'bg-red-600 text-white shadow-red-200 ring-4 ring-red-100' : 'bg-slate-100 text-slate-900 border border-slate-200 hover:bg-slate-200'}`}>
                    {showTeacherKey ? <BookOpen className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    {showTeacherKey ? 'Hide Official Key' : 'Reveal Official Key'}
                  </button>
                  <div className="w-[1px] h-8 bg-slate-300"></div>
                  {isBulkMode && (
                    <button onClick={() => setMode(AppMode.BULK_REVIEW)} className="px-10 py-4 bg-slate-100 text-slate-900 border border-slate-200 rounded-full font-black text-[12px] uppercase tracking-widest flex items-center gap-3 hover:bg-slate-200 transition-all"><LayoutGrid className="w-4 h-4" /> Back to Variants</button>
                  )}
                  <button onClick={() => { setMode(AppMode.GENERATOR); setCurrentStep(1); }} className="px-10 py-4 bg-slate-900 text-white rounded-full font-black text-[12px] uppercase tracking-widest flex items-center gap-3 hover:scale-105 transition-transform"><Plus className="w-4 h-4" /> New Blueprint</button>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
