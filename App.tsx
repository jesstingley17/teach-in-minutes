
import React, { useState, useRef, useEffect } from 'react';
import { AppMode, Worksheet, ThemeType, QuestionType, DocumentType, AudienceCategory, LearnerProfile, CurriculumStandard, BrandingConfig, LayoutStyle, AestheticMode } from './types';
import { generateWorksheet } from './services/geminiService';
import { WorksheetView } from './components/WorksheetView';
import { 
  GraduationCap, Loader2, Plus, Sparkles, CloudUpload, 
  BookOpen, ShieldCheck, XCircle, Library, Eye,
  Languages, BrainCircuit, Star, Zap, Construction, Target,
  Settings, Layers, ChevronRight, Layout, Palette, Trash2, ArrowLeft,
  Glasses, Award, Flame, UserCog
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

  const [mode, setMode] = useState<AppMode>(AppMode.ONBOARDING);
  const [worksheet, setWorksheet] = useState<Worksheet | null>(null);
  const [currentBulkSet, setCurrentBulkSet] = useState<Worksheet[]>([]);
  const [savedWorksheets, setSavedWorksheets] = useState<Worksheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTeacherKey, setShowTeacherKey] = useState(false);
  
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  
  // New: Suite Definition
  const [suiteIntents, setSuiteIntents] = useState<{type: DocumentType, profile: LearnerProfile, layout: LayoutStyle}[]>([
    { type: DocumentType.HOMEWORK, profile: LearnerProfile.GENERAL, layout: LayoutStyle.LAID_TEACH }
  ]);

  const [formData, setFormData] = useState({
    topic: '',
    lessonTitle: '',
    moduleTitle: '',
    audienceCategory: AudienceCategory.UNIVERSITY,
    educationalLevel: 'Degree Level',
    difficulty: 'Standard Application',
    language: 'English',
    rawText: '',
    guidelineData: null as { data: string; mimeType: string; name: string } | null
  });

  const guidelineInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedBranding = localStorage.getItem('institutional_branding');
    if (savedBranding) setBranding(JSON.parse(savedBranding));
    const localSession = localStorage.getItem('local_user_session');
    if (localSession) setUser(JSON.parse(localSession));
    if (localStorage.getItem('isGuest') === 'true') setIsGuest(true);
    setAuthLoading(false);
  }, []);

  useEffect(() => { if (user || isGuest) fetchUserContent(); }, [user, isGuest]);

  const fetchUserContent = async () => {
    const prefix = user?.email || 'guest';
    const local = JSON.parse(localStorage.getItem(`archive_${prefix}`) || '[]');
    setSavedWorksheets(local);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'jtingley@anchorchartpro.com' && password === 'Password123') {
      const u = { email, id: 'j-pro' };
      setUser(u);
      localStorage.setItem('local_user_session', JSON.stringify(u));
    } else setAuthError("Invalid credentials.");
  };

  const handleGenerate = async () => {
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
        moduleTitle: formData.moduleTitle,
        lessonTitle: formData.lessonTitle,
        instructorName: branding.instructorName,
        institutionName: branding.institutionName,
        logoUrl: branding.logoUrl,
        savedAt: Date.now() + i
      }));

      const prefix = user?.email || 'guest';
      const local = JSON.parse(localStorage.getItem(`archive_${prefix}`) || '[]');
      localStorage.setItem(`archive_${prefix}`, JSON.stringify([...processed, ...local].slice(0, 50)));

      setSavedWorksheets(prev => [...processed, ...prev]);
      setCurrentBulkSet(processed);
      setMode(AppMode.BULK_REVIEW);
    } catch (e: any) { 
      alert(e.message);
    } finally { setLoading(false); }
  };

  const addContainer = () => setSuiteIntents([...suiteIntents, { type: DocumentType.QUIZ, profile: LearnerProfile.GENERAL, layout: LayoutStyle.CLASSIC }]);
  const removeContainer = (idx: number) => setSuiteIntents(suiteIntents.filter((_, i) => i !== idx));
  const updateIntent = (idx: number, updates: any) => {
    const n = [...suiteIntents];
    n[idx] = { ...n[idx], ...updates };
    setSuiteIntents(n);
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin" /></div>;

  if (!user && !isGuest) return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      <div className="hidden lg:flex flex-1 items-center justify-center p-20 bg-slate-900">
        <div className="max-w-lg text-center">
          <GraduationCap className="w-16 h-16 text-blue-500 mx-auto mb-8" />
          <h1 className="text-7xl font-black text-white uppercase italic mb-6">Blueprint<span className="text-blue-500 not-italic">Pro</span></h1>
          <p className="text-slate-400 text-xl font-medium">Architecture for the modern classroom.</p>
        </div>
      </div>
      <div className="w-full lg:w-[500px] bg-white p-12 flex flex-col justify-center">
        <form onSubmit={handleLogin} className="space-y-6">
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-8">Faculty Portal</h2>
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Faculty Email" className="w-full p-4 bg-slate-50 border-2 rounded-xl outline-none focus:border-slate-900 font-bold" />
          <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Passkey" className="w-full p-4 bg-slate-50 border-2 rounded-xl outline-none focus:border-slate-900 font-bold" />
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
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white"><GraduationCap className="w-6 h-6" /></div>
              <h1 className="font-black text-lg uppercase tracking-tight">Blueprint Pro</h1>
           </div>
           <button onClick={() => setMode(AppMode.GENERATOR)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">
              <Plus className="w-4 h-4 inline mr-2" /> Start Architecture
           </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
           <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Library</h3>
           <div className="space-y-1">
              {savedWorksheets.map(ws => (
                <div key={ws.id} className="p-3 rounded-xl hover:bg-slate-50 cursor-pointer" onClick={() => { setWorksheet(ws); setMode(AppMode.WORKSHEET); }}>
                   <span className="text-[10px] font-black uppercase block truncate">{ws.title}</span>
                   <span className="text-[8px] font-bold text-slate-300 uppercase">{ws.documentType}</span>
                </div>
              ))}
           </div>
        </div>
        <div className="p-6 border-t border-slate-50 space-y-3">
           <button onClick={() => setMode(AppMode.SETTINGS)} className="w-full p-3 rounded-xl flex items-center gap-3 font-black text-[9px] uppercase text-slate-400 hover:text-slate-900">
              <Settings className="w-4 h-4" /> Branding
           </button>
           <button onClick={() => { setUser(null); setIsGuest(false); localStorage.clear(); }} className="w-full p-3 rounded-xl flex items-center gap-3 font-black text-[9px] uppercase text-slate-300 hover:text-red-500">
              <XCircle className="w-4 h-4" /> Sign Out
           </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-72 min-h-screen relative bg-white">
        <div className="p-8 lg:p-12 pb-32">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in zoom-in">
               <div className="relative">
                 <Loader2 className="w-20 h-20 animate-spin text-slate-900" />
                 <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-pulse" />
               </div>
               <div className="max-w-sm">
                 <h2 className="text-4xl font-black uppercase tracking-tighter italic">Factory Materialization</h2>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">Synthesizing {suiteIntents.length} distinct containers based on your Blueprint...</p>
               </div>
            </div>
          ) : mode === AppMode.GENERATOR ? (
            <div className="max-w-6xl mx-auto py-4">
               <header className="mb-12 flex justify-between items-end">
                  <div>
                    <h2 className="text-6xl font-black uppercase tracking-tighter">Suite Architect</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Configure your custom instructional sequence</p>
                  </div>
                  <button onClick={() => setMode(AppMode.ONBOARDING)} className="text-slate-300 hover:text-slate-900 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"><ArrowLeft className="w-4 h-4" /> Back to Library</button>
               </header>

               <div className="grid grid-cols-12 gap-12">
                  {/* Left Column: Context */}
                  <div className="col-span-12 lg:col-span-4 space-y-8">
                     <div className="bg-slate-50 p-8 rounded-[2.5rem] space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Knowledge Base</h3>
                        <input className="w-full p-5 bg-white border-2 rounded-2xl font-black text-xl outline-none focus:border-slate-900" placeholder="Topic: e.g. Fractions" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
                        <input className="w-full p-4 bg-white border-2 rounded-2xl font-bold" placeholder="Module: e.g. Unit 2" value={formData.moduleTitle} onChange={e => setFormData({...formData, moduleTitle: e.target.value})} />
                        <input className="w-full p-4 bg-white border-2 rounded-2xl font-bold" placeholder="Lesson: e.g. Addition" value={formData.lessonTitle} onChange={e => setFormData({...formData, lessonTitle: e.target.value})} />
                        <div className="pt-4 border-t space-y-4">
                           <label className="text-[9px] font-black uppercase text-slate-400">Institutional Rigor</label>
                           <select className="w-full p-4 bg-white border-2 rounded-2xl font-bold outline-none" value={formData.audienceCategory} onChange={e => setFormData({...formData, audienceCategory: e.target.value as AudienceCategory})}>
                              {Object.values(AudienceCategory).map(v => <option key={v} value={v}>{v.replace('_', ' ')}</option>)}
                           </select>
                        </div>
                     </div>
                  </div>

                  {/* Right Column: Containers */}
                  <div className="col-span-12 lg:col-span-8 space-y-6">
                     <div className="flex justify-between items-center px-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Suite Blueprint ({suiteIntents.length} Containers)</h3>
                        <button onClick={addContainer} className="flex items-center gap-2 px-6 py-2 bg-slate-100 hover:bg-slate-200 rounded-full font-black text-[10px] uppercase tracking-widest transition-all">
                           <Plus className="w-4 h-4" /> Add Container
                        </button>
                     </div>

                     <div className="space-y-4">
                        {suiteIntents.map((intent, i) => (
                           <div key={i} className="group relative bg-white border-2 border-slate-100 rounded-[2rem] p-8 hover:border-slate-900 transition-all shadow-sm hover:shadow-xl">
                              <div className="flex justify-between items-start mb-6">
                                 <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-xs">{i + 1}</div>
                                 <button onClick={() => removeContainer(i)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                 <div className="space-y-2">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Category</label>
                                    <select className="w-full p-3 bg-slate-50 border-2 rounded-xl font-bold text-xs outline-none" value={intent.type} onChange={e => updateIntent(i, {type: e.target.value})}>
                                       {Object.values(DocumentType).map(v => <option key={v} value={v}>{v.replace('_', ' ')}</option>)}
                                    </select>
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Scaffolding</label>
                                    <select className="w-full p-3 bg-slate-50 border-2 rounded-xl font-bold text-xs outline-none" value={intent.profile} onChange={e => updateIntent(i, {profile: e.target.value})}>
                                       {Object.values(LearnerProfile).map(v => <option key={v} value={v}>{v.replace('_', ' ')}</option>)}
                                    </select>
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Layout</label>
                                    <select className="w-full p-3 bg-slate-50 border-2 rounded-xl font-bold text-xs outline-none" value={intent.layout} onChange={e => updateIntent(i, {layout: e.target.value})}>
                                       {Object.values(LayoutStyle).map(v => <option key={v} value={v}>{v.replace('_', ' ')}</option>)}
                                    </select>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>

                     <div className="pt-12 flex justify-center">
                        <button onClick={handleGenerate} className="px-20 py-8 bg-slate-900 text-white rounded-[2.5rem] font-black text-2xl uppercase tracking-tighter flex items-center gap-6 shadow-2xl hover:scale-105 active:scale-95 transition-all">
                           <Sparkles className="w-8 h-8 text-yellow-400" /> Materialize Suite
                        </button>
                     </div>
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
          ) : mode === AppMode.BULK_REVIEW ? (
            <div className="max-w-6xl mx-auto py-12 animate-in fade-in duration-700">
               <header className="mb-16 flex justify-between items-end">
                  <div>
                    <h2 className="text-6xl font-black uppercase tracking-tighter italic">Factory Output</h2>
                    <div className="flex items-center gap-6 mt-4">
                       <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">{formData.moduleTitle}</span>
                       <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{formData.lessonTitle}</span>
                    </div>
                  </div>
                  <button onClick={() => setMode(AppMode.GENERATOR)} className="px-8 py-3 bg-slate-100 hover:bg-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">New Architecture</button>
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
                           <div className="flex items-center gap-3 mb-8">
                              <span className="text-[8px] font-black uppercase text-slate-300 border px-2 py-0.5 rounded">{ws.learnerProfile}</span>
                              <span className="text-[8px] font-black uppercase text-slate-300 border px-2 py-0.5 rounded">{ws.visualMetadata?.layoutStyle}</span>
                           </div>
                        </div>
                        <button onClick={() => { setWorksheet(ws); setMode(AppMode.WORKSHEET); }} className="w-full py-4 bg-slate-50 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 group-hover:bg-slate-900 group-hover:text-white transition-all">
                           <Eye className="w-4 h-4" /> Inspect Container
                        </button>
                     </div>
                  ))}
               </div>
            </div>
          ) : worksheet && (
            <div className="animate-in fade-in duration-500">
               <WorksheetView worksheet={worksheet} theme={branding.defaultTheme} showKey={showTeacherKey} onUpdate={setWorksheet} />
               <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/90 p-3 rounded-full shadow-2xl border border-slate-100 z-[90] no-print backdrop-blur-md">
                  <button onClick={() => setShowTeacherKey(!showTeacherKey)} className={`px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${showTeacherKey ? 'bg-red-600 text-white' : 'bg-slate-50 border hover:bg-slate-100'}`}>
                    {showTeacherKey ? 'Hide Key' : 'Solution Key'}
                  </button>
                  <button onClick={() => setMode(AppMode.GENERATOR)} className="px-8 py-3 bg-slate-900 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl">New Suite</button>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
