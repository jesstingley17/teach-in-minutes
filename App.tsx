
import React, { useState, useRef, useEffect } from 'react';
import { AppMode, Worksheet, ThemeType, QuestionType, DocumentType, AudienceCategory, LearnerProfile, AssessmentBlueprint, Collection, CurriculumStandard } from './types';
import { generateWorksheet } from './services/geminiService';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { WorksheetView } from './components/WorksheetView';
import { 
  GraduationCap, Loader2, ArrowRight, ArrowLeft, 
  Plus, Baby, School, Building2, UserCircle, 
  Zap, Brain, Languages, Users, CheckCircle, 
  Sparkles, CloudUpload, ShieldCheck, BookMarked, Paperclip,
  LogOut, LogIn, Mail, Lock, User as UserIcon, Folder, Trash2, AlertCircle, Info
} from 'lucide-react';

const CATEGORIES = [
  { id: AudienceCategory.EARLY_YEARS, label: 'Early Years', icon: Baby },
  { id: AudienceCategory.PRIMARY, label: 'Primary', icon: School },
  { id: AudienceCategory.MIDDLE_SCHOOL, label: 'Middle', icon: School },
  { id: AudienceCategory.HIGH_SCHOOL, label: 'High School', icon: GraduationCap },
  { id: AudienceCategory.UNIVERSITY, label: 'Higher Ed', icon: Building2 },
  { id: AudienceCategory.PROFESSIONAL, label: 'Professional', icon: UserCircle }
];

const EXAMPLE_WORKSHEET: Worksheet = {
  id: 'demo-123',
  title: 'Calculus I: Limits & Continuity',
  topic: 'Introduction to Delta-Epsilon Definition',
  educationalLevel: 'University Year 1',
  documentType: DocumentType.EXAM,
  curriculumStandard: CurriculumStandard.CUSTOM,
  standardReference: 'MATH-101-LMT',
  institutionName: 'Department of Mathematics',
  questions: [
    {
      id: 'q1',
      type: QuestionType.MCQ,
      question: 'Evaluate the limit: $\\lim_{x \\to 2} (3x^2 - 4x + 1)$',
      options: ['3', '5', '7', '9'],
      correctAnswer: '5',
      explanation: 'Direct substitution: $3(2)^2 - 4(2) + 1 = 12 - 8 + 1 = 5$.',
      isChallenge: false,
      points: 5
    }
  ],
  savedAt: Date.now()
};

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<{message: string, isWarning?: boolean} | null>(null);

  // App State
  const [mode, setMode] = useState<AppMode>(AppMode.GENERATOR);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [worksheet, setWorksheet] = useState<Worksheet | null>(null);
  const [savedWorksheets, setSavedWorksheets] = useState<Worksheet[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMathMode, setIsMathMode] = useState(true);
  const [useGrounding, setUseGrounding] = useState(false);
  const [showTeacherKey, setShowTeacherKey] = useState(false);
  
  const [formData, setFormData] = useState({
    topic: '',
    audienceCategory: AudienceCategory.UNIVERSITY,
    educationalLevel: 'Freshman',
    learnerProfile: LearnerProfile.GENERAL,
    curriculumStandard: CurriculumStandard.CUSTOM,
    difficulty: 'Hard',
    language: 'English',
    documentType: DocumentType.EXAM,
    rawText: '',
    questionCounts: { [QuestionType.MCQ]: 5, [QuestionType.SHORT_ANSWER]: 2 } as Record<string, number>,
    fileData: null as { data: string; mimeType: string; name: string } | null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check local storage for guest session
    const guestStatus = localStorage.getItem('isGuest');
    const mockUser = localStorage.getItem('mockUser');
    
    if (guestStatus === 'true') {
      setIsGuest(true);
    } else if (mockUser) {
      setUser(JSON.parse(mockUser));
    }

    // Check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        setIsGuest(false);
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        setIsGuest(false);
      } else if (!isGuest && !localStorage.getItem('mockUser')) {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user || isGuest) {
      fetchUserContent();
    }
  }, [user, isGuest]);

  const loadLocalArchive = () => {
    const local = localStorage.getItem('local_archive');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        setSavedWorksheets(parsed.length > 0 ? parsed : [EXAMPLE_WORKSHEET]);
      } catch (e) {
        setSavedWorksheets([EXAMPLE_WORKSHEET]);
      }
    } else {
      setSavedWorksheets([EXAMPLE_WORKSHEET]);
    }
  };

  const fetchUserContent = async () => {
    if (user && isSupabaseConfigured && !user.isMock) {
      const { data: ws } = await supabase.from('worksheets').select('*').order('savedAt', { ascending: false });
      const { data: colls } = await supabase.from('collections').select('*');
      if (ws) setSavedWorksheets(ws.length > 0 ? ws : [EXAMPLE_WORKSHEET]);
      if (colls) setCollections(colls);
    } else {
      loadLocalArchive();
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);

    if (!isSupabaseConfigured) {
      // Automatic mock login if keys are missing
      const mockUser = { id: 'mock-' + email, email, isMock: true };
      setUser(mockUser);
      localStorage.setItem('mockUser', JSON.stringify(mockUser));
      setLoading(false);
      return;
    }

    try {
      const { data, error } = isSignUp 
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        // If Supabase exists but sign in failed (e.g. no account), offer local mode
        setAuthError({ 
          message: error.message + ". You can still proceed with a Local Session if you don't have an account yet.", 
          isWarning: true 
        });
      } else if (data?.user) {
        setUser(data.user);
      }
    } catch (err) {
      setAuthError({ message: "Network error. Supabase might be unreachable. Try Local Session." });
    }
    setLoading(false);
  };

  const handleLocalEntry = () => {
    const mockUser = { id: 'mock-' + (email || 'guest'), email: email || 'local-user@edu.com', isMock: true };
    setUser(mockUser);
    localStorage.setItem('mockUser', JSON.stringify(mockUser));
    setAuthError(null);
  };

  const handleGuestEntry = () => {
    setIsGuest(true);
    localStorage.setItem('isGuest', 'true');
    loadLocalArchive();
  };

  const handleSignOut = async () => {
    if (user?.isMock || isGuest) {
      setIsGuest(false);
      setUser(null);
      localStorage.removeItem('isGuest');
      localStorage.removeItem('mockUser');
    } else {
      await supabase.auth.signOut();
    }
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
    if (!formData.topic && !formData.rawText && !formData.fileData) {
      alert("Please provide a topic, text, or file.");
      return;
    }
    setLoading(true);
    try {
      const result = await generateWorksheet({ ...formData, useGrounding, isMathMode });
      const newWs: Worksheet = { 
        ...result, 
        id: Math.random().toString(36).substr(2, 9),
        userId: user?.id, 
        savedAt: Date.now() 
      };
      
      if (user && isSupabaseConfigured && !user.isMock) {
        try {
          const { data } = await supabase.from('worksheets').insert([newWs]).select().single();
          if (data) setWorksheet(data);
          else setWorksheet(newWs);
        } catch (e) {
          setWorksheet(newWs);
        }
      } else {
        const currentArchive = JSON.parse(localStorage.getItem('local_archive') || '[]');
        const updatedArchive = [newWs, ...currentArchive].slice(0, 20);
        localStorage.setItem('local_archive', JSON.stringify(updatedArchive));
        setSavedWorksheets(updatedArchive);
        setWorksheet(newWs);
      }
      
      setMode(AppMode.WORKSHEET);
    } catch (error) {
      alert("Generation failed. Please try again with simpler inputs.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><Loader2 className="animate-spin w-10 h-10 text-blue-500" /></div>;

  if (!user && !isGuest) return (
    <div className="min-h-screen flex bg-slate-950 font-sans selection:bg-blue-500 selection:text-white overflow-hidden">
      <div className="hidden lg:flex flex-1 items-center justify-center p-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-950 relative">
        <div className="relative z-10 max-w-lg">
          <div className="w-16 h-16 bg-blue-600/20 backdrop-blur-3xl rounded-3xl flex items-center justify-center text-blue-400 mb-8 border border-blue-500/30 shadow-[0_0_50px_rgba(37,99,235,0.2)]">
            <GraduationCap className="w-10 h-10" />
          </div>
          <h1 className="text-8xl font-black text-white tracking-tighter mb-6 leading-none uppercase">Blueprint<br/><span className="text-blue-500">Pro</span></h1>
          <p className="text-2xl text-slate-400 font-medium leading-relaxed">Institutional-grade curriculum design. Powered by Gemini Pro.</p>
        </div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
      </div>
      
      <div className="w-full lg:w-[550px] bg-white flex flex-col items-center justify-center p-8 lg:p-16 border-l border-slate-900/10">
        <div className="w-full max-w-sm">
          <header className="mb-12">
            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">{isSignUp ? 'Establish Department' : 'Academic Portal'}</h2>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Professional Grade Assessment Engine</p>
          </header>
          
          <form onSubmit={handleAuth} className="space-y-5">
            {authError && (
              <div className={`p-4 rounded-2xl flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 border-2 ${authError.isWarning ? 'bg-orange-50 border-orange-100 text-orange-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-xs font-bold leading-relaxed">{authError.message}</p>
                </div>
                {authError.isWarning && (
                  <button type="button" onClick={handleLocalEntry} className="text-[10px] font-black uppercase bg-orange-200/50 py-2 rounded-lg hover:bg-orange-200 transition-colors">Log In Locally Instead</button>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="University Email" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-900 transition-all outline-none font-bold placeholder:text-slate-300" />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Access Token" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-900 transition-all outline-none font-bold placeholder:text-slate-300" />
              </div>
            </div>
            
            <button disabled={loading} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3">
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (isSignUp ? 'Create Workspace' : 'Authorize Entrance')}
            </button>
          </form>
          
          <div className="mt-8 flex flex-col gap-4 text-center">
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors">
              {isSignUp ? 'Back to Scholar Login' : 'Need Institutional Access? Establishment'}
            </button>
            
            <div className="pt-8 border-t border-slate-100 mt-4">
               <div className="flex gap-3">
                 <button onClick={handleLocalEntry} className="flex-1 py-3 bg-blue-50 text-blue-700 border-2 border-blue-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center gap-2">
                   <Zap className="w-3.5 h-3.5" /> Local Access
                 </button>
                 <button onClick={handleGuestEntry} className="flex-1 py-3 border-2 border-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                   <UserIcon className="w-3.5 h-3.5" /> Guest Mode
                 </button>
               </div>
               <div className="mt-6 flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Info className="w-4 h-4 text-slate-400" />
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter leading-tight text-left">Local and Guest modes bypass the database and save content directly to your browser's memory.</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans selection:bg-blue-500 selection:text-white">
      <aside className="w-80 bg-white border-r border-slate-200 hidden lg:flex flex-col fixed h-full z-20 no-print shadow-sm">
        <div className="p-8 border-b border-slate-100">
           <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3"><GraduationCap className="w-6 h-6" /></div>
              <div><h1 className="font-black text-xl tracking-tighter leading-none uppercase">Blueprint Pro</h1><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Standards Engine</span></div>
           </div>
           
           <div className={`p-4 rounded-2xl border flex items-center gap-4 ${user?.isMock || isGuest ? 'bg-orange-50 border-orange-100' : 'bg-blue-50 border-blue-100'}`}>
              <div className={`w-10 h-10 ${user?.isMock || isGuest ? 'bg-orange-500' : 'bg-blue-600'} rounded-xl flex items-center justify-center text-white shadow-inner`}><UserIcon className="w-5 h-5" /></div>
              <div className="overflow-hidden flex-1">
                 <p className="text-[10px] font-black uppercase text-slate-400 truncate tracking-tight">{isGuest ? 'GUEST SCHOLAR' : user?.email}</p>
                 <button onClick={handleSignOut} className="flex items-center gap-1 text-[9px] font-black uppercase text-red-500 hover:text-red-700 transition-colors">End Session <LogOut className="w-3 h-3" /></button>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-10">
           <button onClick={() => { setMode(AppMode.GENERATOR); setCurrentStep(1); }} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${mode === AppMode.GENERATOR ? 'bg-slate-900 text-white shadow-xl scale-[1.02]' : 'text-slate-400 hover:bg-slate-50'}`}>
              <Plus className="w-4 h-4" /> Create Blueprint
           </button>

           <div>
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-300">Archive Library</h3>
                <span className="text-[9px] font-black text-slate-200 uppercase">{savedWorksheets.length} Assets</span>
              </div>
              <div className="space-y-1">
                 {savedWorksheets.map(ws => (
                    <div key={ws.id} className="p-4 rounded-2xl border border-transparent hover:bg-slate-50 hover:border-slate-100 cursor-pointer flex items-center gap-3 transition-all group" onClick={() => { setWorksheet(ws); setMode(AppMode.WORKSHEET); }}>
                       <div className={`w-2.5 h-2.5 rounded-full ${user?.isMock || isGuest ? 'bg-orange-400' : 'bg-blue-500'} opacity-20 group-hover:opacity-100 transition-opacity`}></div>
                       <div className="overflow-hidden">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 truncate block group-hover:text-slate-950">{ws.title}</span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{ws.documentType} • {ws.curriculumStandard}</span>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </aside>

      <main className="flex-1 lg:ml-80 min-h-screen relative">
        <div className="max-w-6xl mx-auto p-8 lg:p-12">
           {loading ? (
             <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-10 animate-pulse">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse"></div>
                  <Loader2 className="w-20 h-20 animate-spin text-slate-900 relative z-10" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Establishing Standards...</h2>
                  <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">Architecting high-alignment curriculum content</p>
                </div>
             </div>
           ) : (
             <>
               {mode === AppMode.GENERATOR && (
                 <div className="max-w-4xl mx-auto py-8 lg:py-16">
                   <header className="text-center mb-20">
                      <h2 className="text-7xl font-black tracking-tighter text-slate-900 mb-4 uppercase">Intake System</h2>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Design Institutional Assessments in Seconds</p>
                      <div className="flex justify-center gap-6 mt-16">
                         {[1, 2, 3].map(s => (
                           <div key={s} className="flex flex-col items-center gap-3">
                             <div className={`w-14 h-14 rounded-3xl flex items-center justify-center font-black transition-all border-4 ${currentStep === s ? 'bg-slate-900 border-slate-900 text-white shadow-2xl scale-110' : 'bg-white border-slate-100 text-slate-200'}`}>{s}</div>
                             <span className={`text-[9px] font-black uppercase tracking-widest ${currentStep === s ? 'text-slate-900' : 'text-slate-200'}`}>
                               {s === 1 ? 'Scope' : s === 2 ? 'Audit' : 'Verify'}
                             </span>
                           </div>
                         ))}
                      </div>
                   </header>

                   <div className="bg-white rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden flex flex-col min-h-[650px] transition-all duration-500">
                      <div className="p-16 flex-1">
                        {currentStep === 1 && (
                          <div className="animate-in slide-in-from-right duration-500 h-full flex flex-col gap-10">
                             <div className="space-y-4">
                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-6 block">Assessment Objective or Title</label>
                                <input className="w-full p-8 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] font-bold text-2xl text-slate-800 outline-none focus:border-slate-900 focus:bg-white transition-all shadow-inner" placeholder="e.g. Theoretical Physics Final" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                               <div className="space-y-4">
                                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-6 block">Base Document (PDF/JPG)</label>
                                  <div onClick={() => fileInputRef.current?.click()} className={`relative h-56 border-4 border-dashed rounded-[3rem] transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden ${formData.fileData ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}>
                                     <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} />
                                     {formData.fileData ? <div className="text-center p-8"><CheckCircle className="w-10 h-10 text-blue-500 mx-auto mb-3" /><p className="text-xs font-black uppercase tracking-tight text-blue-700 truncate max-w-[200px]">{formData.fileData.name}</p></div> : <><CloudUpload className="w-12 h-12 text-slate-200 mb-4" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contextual Support</p></>}
                                  </div>
                               </div>
                               <div className="space-y-4">
                                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-6 block">Structural Instructions</label>
                                  <textarea className="w-full h-56 p-8 bg-slate-50 border-2 border-slate-100 rounded-[3rem] font-medium text-slate-700 outline-none resize-none focus:border-slate-900 focus:bg-white transition-all shadow-inner" placeholder="Specify rigor, specific chapters, or custom rubrics..." value={formData.rawText} onChange={e => setFormData({...formData, rawText: e.target.value})} />
                               </div>
                             </div>

                             <div className="p-10 bg-blue-900 text-white rounded-[3rem] flex items-center justify-between shadow-2xl relative overflow-hidden group">
                                <div className="absolute inset-0 bg-blue-800 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                <div className="flex items-center gap-6 relative z-10">
                                   <div className={`p-4 rounded-2xl ${useGrounding ? 'bg-blue-500 text-white shadow-lg' : 'bg-blue-800/50 text-blue-300'}`}><ShieldCheck className="w-8 h-8" /></div>
                                   <div><h4 className="font-black uppercase text-sm tracking-widest">Grounding Intelligence</h4><p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Verify citations against live academic databases</p></div>
                                </div>
                                <button onClick={() => setUseGrounding(!useGrounding)} className={`w-16 h-10 rounded-full transition-all relative z-10 ${useGrounding ? 'bg-blue-500' : 'bg-blue-950'}`}><div className={`absolute top-1.5 w-7 h-7 bg-white rounded-full shadow-2xl transition-all ${useGrounding ? 'left-7.5' : 'left-1.5'}`} /></button>
                             </div>
                          </div>
                        )}

                        {currentStep === 2 && (
                          <div className="animate-in slide-in-from-right duration-500 space-y-16">
                             <section>
                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-300 mb-8 px-2 block flex items-center gap-3"><BookMarked className="w-4 h-4 text-blue-500" /> Regulatory Alignment</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                   {Object.values(CurriculumStandard).map(std => (
                                     <button key={std} onClick={() => setFormData({...formData, curriculumStandard: std})} className={`p-5 rounded-[2rem] border-2 transition-all font-black text-[10px] uppercase tracking-widest ${formData.curriculumStandard === std ? 'bg-blue-600 border-blue-600 text-white shadow-xl scale-105' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'}`}>{std.replace('_', ' ')}</button>
                                   ))}
                                </div>
                             </section>
                             <section>
                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-300 mb-8 px-2 block flex items-center gap-3"><Users className="w-4 h-4 text-slate-400" /> Target Academic Cohort</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                   {CATEGORIES.map(cat => (
                                     <button key={cat.id} onClick={() => setFormData({ ...formData, audienceCategory: cat.id })} className={`p-8 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 ${formData.audienceCategory === cat.id ? 'bg-slate-900 border-slate-900 text-white shadow-2xl scale-105' : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-white'}`}>
                                        <cat.icon className="w-8 h-8" /><span className="font-black text-[10px] uppercase tracking-widest">{cat.label}</span>
                                     </button>
                                   ))}
                                </div>
                             </section>
                          </div>
                        )}

                        {currentStep === 3 && (
                          <div className="animate-in slide-in-from-right duration-500 h-full flex flex-col gap-10 text-center items-center justify-center">
                             <div className="p-16 bg-slate-50 rounded-[4rem] border-4 border-dashed border-slate-100 w-full relative">
                                <Sparkles className="w-16 h-16 text-blue-600 mb-8 mx-auto" />
                                <h3 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Blueprint Integrity Check</h3>
                                <div className="mt-10 flex flex-wrap justify-center gap-4">
                                   <div className="px-8 py-4 bg-white shadow-sm border border-slate-100 rounded-[2rem] text-[11px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-3"><BookMarked className="w-5 h-5 text-blue-500" /> {formData.curriculumStandard}</div>
                                   {formData.fileData && <div className="px-8 py-4 bg-green-50 rounded-[2rem] text-[11px] font-black uppercase tracking-widest text-green-700 flex items-center gap-3 border border-green-100"><Paperclip className="w-5 h-5" /> {formData.fileData.name}</div>}
                                   {useGrounding && <div className="px-8 py-4 bg-blue-50 rounded-[2rem] text-[11px] font-black uppercase tracking-widest text-blue-700 flex items-center gap-3 border border-blue-100"><ShieldCheck className="w-5 h-5" /> Verified Grounding</div>}
                                </div>
                             </div>
                             <button onClick={handleGenerate} className="w-full py-10 bg-slate-900 text-white rounded-[3rem] font-black text-3xl uppercase tracking-widest hover:bg-slate-800 transition-all shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-6 group">
                               Establish Blueprint
                               <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
                             </button>
                          </div>
                        )}
                      </div>

                      <div className="p-12 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                         <button onClick={() => setCurrentStep(p => p - 1)} disabled={currentStep === 1} className="px-10 py-4 text-slate-400 font-black uppercase tracking-widest text-[11px] disabled:opacity-0 flex items-center gap-3 hover:text-slate-900 transition-colors"><ArrowLeft className="w-4 h-4" /> Previous Module</button>
                         <button onClick={() => setCurrentStep(p => p + 1)} disabled={currentStep === 3} className="px-14 py-5 bg-white border-2 border-slate-200 rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-md hover:border-slate-900 transition-all flex items-center gap-3">Next Intake <ArrowRight className="w-4 h-4" /></button>
                      </div>
                   </div>
                 </div>
               )}

               {mode === AppMode.WORKSHEET && worksheet && (
                 <div className="py-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                    <WorksheetView worksheet={worksheet} theme={ThemeType.ACADEMIC} showKey={showTeacherKey} isMathMode={isMathMode} />
                    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/90 backdrop-blur-2xl p-4 rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] border border-white z-[90] no-print">
                       <button onClick={() => setShowTeacherKey(!showTeacherKey)} className={`px-8 py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-widest transition-all ${showTeacherKey ? 'bg-red-600 text-white shadow-xl shadow-red-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{showTeacherKey ? 'Hide Solution' : 'Reveal Solution'}</button>
                       <div className="w-[2px] h-8 bg-slate-200"></div>
                       <button onClick={() => setMode(AppMode.GENERATOR)} className="px-8 py-4 bg-slate-900 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-widest flex items-center gap-3 shadow-xl hover:bg-slate-800 transition-all"><Plus className="w-4 h-4" /> New Blueprint</button>
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
