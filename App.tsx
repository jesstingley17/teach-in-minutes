
import React, { useState, useRef, useEffect } from 'react';
import { AppMode, Worksheet, ThemeType, QuestionType, DocumentType, AudienceCategory, LearnerProfile, AssessmentBlueprint, Collection, CurriculumStandard } from './types';
import { generateWorksheet } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import { WorksheetView } from './components/WorksheetView';
import { 
  GraduationCap, Loader2, ArrowRight, ArrowLeft, 
  Plus, Baby, School, Building2, UserCircle, 
  Zap, Brain, Languages, Users, CheckCircle, 
  Sparkles, CloudUpload, ShieldCheck, BookMarked, Paperclip,
  LogOut, LogIn, Mail, Lock, User as UserIcon, Folder, Trash2
} from 'lucide-react';

const CATEGORIES = [
  { id: AudienceCategory.EARLY_YEARS, label: 'Early Years', icon: Baby },
  { id: AudienceCategory.PRIMARY, label: 'Primary', icon: School },
  { id: AudienceCategory.MIDDLE_SCHOOL, label: 'Middle', icon: School },
  { id: AudienceCategory.HIGH_SCHOOL, label: 'High School', icon: GraduationCap },
  { id: AudienceCategory.UNIVERSITY, label: 'Higher Ed', icon: Building2 },
  { id: AudienceCategory.PROFESSIONAL, label: 'Professional', icon: UserCircle }
];

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // App State
  const [mode, setMode] = useState<AppMode>(AppMode.GENERATOR);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [worksheet, setWorksheet] = useState<Worksheet | null>(null);
  const [savedWorksheets, setSavedWorksheets] = useState<Worksheet[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMathMode, setIsMathMode] = useState(false);
  const [useGrounding, setUseGrounding] = useState(false);
  const [showTeacherKey, setShowTeacherKey] = useState(false);
  
  const [formData, setFormData] = useState({
    topic: '',
    audienceCategory: AudienceCategory.HIGH_SCHOOL,
    educationalLevel: 'Grade 10',
    learnerProfile: LearnerProfile.GENERAL,
    curriculumStandard: CurriculumStandard.COMMON_CORE,
    difficulty: 'Medium',
    language: 'English',
    documentType: DocumentType.EXAM,
    rawText: '',
    questionCounts: { [QuestionType.MCQ]: 5, [QuestionType.SHORT_ANSWER]: 3 } as Record<string, number>,
    fileData: null as { data: string; mimeType: string; name: string } | null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserContent();
    }
  }, [user]);

  const fetchUserContent = async () => {
    const { data: ws } = await supabase.from('worksheets').select('*').order('savedAt', { ascending: false });
    const { data: colls } = await supabase.from('collections').select('*');
    if (ws) setSavedWorksheets(ws);
    if (colls) setCollections(colls);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    
    if (error) alert(error.message);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setWorksheet(null);
    setMode(AppMode.GENERATOR);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({
        ...formData,
        fileData: { data: (reader.result as string).split(',')[1], mimeType: file.type, name: file.name }
      });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateWorksheet({ ...formData, useGrounding, isMathMode });
      const newWs = { ...result, userId: user?.id, savedAt: Date.now() };
      
      // Persist to Supabase if logged in
      if (user) {
        const { data, error } = await supabase.from('worksheets').insert([newWs]).select().single();
        if (data) setWorksheet(data);
        else setWorksheet(newWs);
      } else {
        setWorksheet(newWs);
      }
      
      setMode(AppMode.WORKSHEET);
      fetchUserContent();
    } catch (error) {
      alert("Blueprint generation failed. Verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-100"><Loader2 className="animate-spin w-12 h-12 text-slate-900" /></div>;

  if (!user) return (
    <div className="min-h-screen flex bg-slate-900 font-sans selection:bg-blue-500 selection:text-white">
      <div className="hidden lg:flex flex-1 items-center justify-center p-20 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 relative overflow-hidden">
        <div className="relative z-10 max-w-lg">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center text-blue-400 mb-8 border border-white/20 shadow-2xl">
            <GraduationCap className="w-10 h-10" />
          </div>
          <h1 className="text-7xl font-black text-white tracking-tighter mb-6 leading-none uppercase">Blueprint Pro</h1>
          <p className="text-xl text-slate-300 font-medium leading-relaxed">The standard-aligned assessment engine for high-rigor environments. AI-driven. Institutional-grade.</p>
        </div>
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/10 blur-[120px] -mr-40 -mt-40 rounded-full animate-pulse"></div>
      </div>
      
      <div className="w-full lg:w-[500px] bg-white flex flex-col items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-sm">
          <header className="mb-12">
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{isSignUp ? 'Create Institution' : 'Scholar Portal'}</h2>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Enter credentials to proceed</p>
          </header>
          
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Academic Email" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-900 transition-all outline-none font-bold" />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Secure Key" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-900 transition-all outline-none font-bold" />
              </div>
            </div>
            
            <button disabled={loading} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3">
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (isSignUp ? 'Establish' : 'Authorize')}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors">
              {isSignUp ? 'Already have credentials? Enter' : 'New Department? Create Archive'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-100 font-sans">
      <aside className="w-80 bg-white border-r border-slate-200 hidden lg:flex flex-col fixed h-full z-20 no-print">
        <div className="p-8 border-b border-slate-100">
           <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xl rotate-3"><GraduationCap className="w-6 h-6" /></div>
              <div><h1 className="font-black text-xl tracking-tighter leading-none uppercase">Blueprint Pro</h1><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Standards v3.1</span></div>
           </div>
           
           <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-inner"><UserIcon className="w-5 h-5" /></div>
              <div className="overflow-hidden flex-1">
                 <p className="text-[10px] font-black uppercase text-slate-400 truncate tracking-tight">{user.email}</p>
                 <button onClick={handleSignOut} className="flex items-center gap-1 text-[9px] font-black uppercase text-red-400 hover:text-red-600 transition-colors">Logout <LogOut className="w-3 h-3" /></button>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
           <button onClick={() => { setMode(AppMode.GENERATOR); setCurrentStep(1); }} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${mode === AppMode.GENERATOR ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}>
              <Plus className="w-4 h-4" /> New Blueprint
           </button>

           <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-4 px-1">Institutional Archive</h3>
              <div className="space-y-1">
                 {savedWorksheets.map(ws => (
                    <div key={ws.id} className="p-3 rounded-xl border border-transparent hover:bg-white hover:border-slate-100 cursor-pointer flex items-center gap-3 transition-all group" onClick={() => { setWorksheet(ws); setMode(AppMode.WORKSHEET); }}>
                       <div className="w-2 h-2 rounded-full bg-blue-500 opacity-20 group-hover:opacity-100 transition-opacity"></div>
                       <div className="overflow-hidden">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 truncate block">{ws.title}</span>
                          <span className="text-[8px] font-bold text-slate-300 uppercase">{ws.documentType} • {ws.curriculumStandard}</span>
                       </div>
                    </div>
                 ))}
                 {savedWorksheets.length === 0 && <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest p-4 text-center border-2 border-dashed border-slate-50 rounded-2xl">Archive Empty</p>}
              </div>
           </div>
        </div>
      </aside>

      <main className="flex-1 lg:ml-80 min-h-screen relative">
        <div className="max-w-6xl mx-auto p-8">
           {loading ? (
             <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <Loader2 className="w-16 h-16 animate-spin text-slate-900" />
                <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Grounding Intelligence...</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Analyzing and aligning standards in real-time</p>
             </div>
           ) : (
             <>
               {mode === AppMode.GENERATOR && (
                 <div className="max-w-4xl mx-auto py-12">
                   <header className="text-center mb-16">
                      <h2 className="text-6xl font-black tracking-tighter text-slate-900 mb-4 uppercase">Intake System</h2>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Design high-alignment assessments in seconds</p>
                      <div className="flex justify-center gap-4 mt-12">
                         {[1, 2, 3].map(s => <div key={s} className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all border-2 ${currentStep === s ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-300'}`}>{s}</div>)}
                      </div>
                   </header>

                   <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col min-h-[600px]">
                      <div className="p-12 flex-1">
                        {currentStep === 1 && (
                          <div className="animate-in slide-in-from-right duration-500 h-full flex flex-col gap-8">
                             <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Assessment Topic or Scope</label>
                                <input className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-bold text-slate-700 outline-none focus:border-slate-900 transition-all" placeholder="e.g. Quantum Mechanics Intro" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                               <div className="space-y-4">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Source Material (PDF / Image)</label>
                                  <div onClick={() => fileInputRef.current?.click()} className={`relative h-48 border-4 border-dashed rounded-[2.5rem] transition-all flex flex-col items-center justify-center cursor-pointer ${formData.fileData ? 'border-green-400 bg-green-50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}>
                                     <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} />
                                     {formData.fileData ? <div className="text-center p-6"><CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" /><p className="text-xs font-black uppercase tracking-tight text-green-700 truncate max-w-[200px]">{formData.fileData.name}</p></div> : <><CloudUpload className="w-10 h-10 text-slate-300 mb-2" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Upload Support</p></>}
                                  </div>
                               </div>
                               <div className="space-y-4">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Manual Text Content</label>
                                  <textarea className="w-full h-48 p-6 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] font-medium text-slate-700 outline-none resize-none focus:border-slate-900 transition-all" placeholder="Paste objectives here..." value={formData.rawText} onChange={e => setFormData({...formData, rawText: e.target.value})} />
                               </div>
                             </div>

                             <div className="p-8 bg-blue-50 border-2 border-dashed border-blue-200 rounded-[2.5rem] flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                   <div className={`p-3 rounded-2xl ${useGrounding ? 'bg-blue-600 text-white' : 'bg-white text-blue-300'}`}><ShieldCheck className="w-6 h-6" /></div>
                                   <div><h4 className="font-black uppercase text-xs tracking-tight text-blue-900">Perplexity Mode (Live Search)</h4><p className="text-[10px] font-bold text-blue-600/60 uppercase">Grounds facts in real-time citations</p></div>
                                </div>
                                <button onClick={() => setUseGrounding(!useGrounding)} className={`w-14 h-8 rounded-full transition-all relative ${useGrounding ? 'bg-blue-600' : 'bg-slate-200'}`}><div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${useGrounding ? 'left-7' : 'left-1'}`} /></button>
                             </div>
                          </div>
                        )}

                        {currentStep === 2 && (
                          <div className="animate-in slide-in-from-right duration-500 space-y-12">
                             <section>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 block flex items-center gap-2"><BookMarked className="w-4 h-4 text-blue-500" /> Standard Alignment Focus</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                   {Object.values(CurriculumStandard).map(std => (
                                     <button key={std} onClick={() => setFormData({...formData, curriculumStandard: std})} className={`p-4 rounded-2xl border-2 transition-all font-black text-[9px] uppercase tracking-widest ${formData.curriculumStandard === std ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>{std.replace('_', ' ')}</button>
                                   ))}
                                </div>
                             </section>
                             <section>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 block flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" /> Educational Audience</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                   {CATEGORIES.map(cat => (
                                     <button key={cat.id} onClick={() => setFormData({ ...formData, audienceCategory: cat.id })} className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${formData.audienceCategory === cat.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                                        <cat.icon className="w-6 h-6" /><span className="font-black text-[9px] uppercase tracking-widest">{cat.label}</span>
                                     </button>
                                   ))}
                                </div>
                             </section>
                          </div>
                        )}

                        {currentStep === 3 && (
                          <div className="animate-in slide-in-from-right duration-500 h-full flex flex-col gap-8 text-center items-center justify-center">
                             <div className="p-12 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 w-full">
                                <Sparkles className="w-12 h-12 text-blue-600 mb-6 mx-auto" />
                                <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Final Verification</h3>
                                <div className="mt-8 flex flex-wrap justify-center gap-4">
                                   <div className="px-6 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><BookMarked className="w-4 h-4 text-blue-500" /> {formData.curriculumStandard}</div>
                                   {formData.fileData && <div className="px-6 py-3 bg-green-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-green-700 flex items-center gap-2"><Paperclip className="w-4 h-4" /> {formData.fileData.name}</div>}
                                   {useGrounding && <div className="px-6 py-3 bg-blue-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-700 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Grounding Enabled</div>}
                                </div>
                             </div>
                             <button onClick={handleGenerate} className="w-full py-8 bg-slate-900 text-white rounded-[2.5rem] font-black text-2xl uppercase tracking-widest hover:bg-slate-800 transition-all shadow-2xl flex items-center justify-center gap-4">Establish Blueprint</button>
                          </div>
                        )}
                      </div>

                      <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                         <button onClick={() => setCurrentStep(p => p - 1)} disabled={currentStep === 1} className="px-6 py-3 text-slate-400 font-black uppercase tracking-widest text-[10px] disabled:opacity-0 flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Back</button>
                         <button onClick={() => setCurrentStep(p => p + 1)} disabled={currentStep === 3} className="px-10 py-4 bg-white border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-sm hover:border-slate-900 transition-all flex items-center gap-2">Next <ArrowRight className="w-4 h-4" /></button>
                      </div>
                   </div>
                 </div>
               )}

               {mode === AppMode.WORKSHEET && worksheet && (
                 <div className="py-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <WorksheetView worksheet={worksheet} theme={ThemeType.ACADEMIC} showKey={showTeacherKey} isMathMode={isMathMode} />
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/80 backdrop-blur-md p-3 rounded-3xl shadow-2xl border border-slate-200 z-[90] no-print">
                       <button onClick={() => setShowTeacherKey(!showTeacherKey)} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${showTeacherKey ? 'bg-red-600 text-white' : 'bg-white text-slate-600'}`}>{showTeacherKey ? 'Hide Solution' : 'Show Solution'}</button>
                       <button onClick={() => setMode(AppMode.GENERATOR)} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg"><Plus className="w-4 h-4" /> New intake</button>
                    </div>
                 </div>
               )}
             </>
           )}
        </div>
      </main>
    </div>
  );
};

export default App;
