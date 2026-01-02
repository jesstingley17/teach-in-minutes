
import React, { useState, useRef, useEffect } from 'react';
import { AppMode, Worksheet, ThemeType, QuestionType, DocumentType, AudienceCategory, LearnerProfile, Course, CourseModule, AssessmentBlueprint, Collection } from './types';
import { generateWorksheet, parseCourseOutline, analyzeCourseForBlueprints } from './services/geminiService';
import { WorksheetView } from './components/WorksheetView';
import { QuizView } from './components/QuizView';
import { MarkerHighlight } from './components/HandwritingElements';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  FileText, PlayCircle, GraduationCap, 
  Loader2, Upload, ArrowRight, ArrowLeft, 
  CheckCircle2, Save, Plus, 
  Minus, Wand2, Printer, 
  Globe, FileStack, Sigma, 
  Baby, School, Building2, UserCircle, 
  Zap, Brain, Languages, Users, Layout, 
  BookOpen, ChevronRight, MoreHorizontal, CheckCircle,
  File, X as CloseIcon, Sparkles, Grid3X3, ListTodo, Edit,
  Link as LinkIcon, Bookmark, FolderPlus, Folder, ChevronDown, 
  Layers, Package, Archive, Move
} from 'lucide-react';

const CATEGORIES = [
  { id: AudienceCategory.EARLY_YEARS, label: 'Early Years', icon: Baby, sub: ['Pre-K', 'Kindergarten'] },
  { id: AudienceCategory.PRIMARY, label: 'Primary', icon: School, sub: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'] },
  { id: AudienceCategory.MIDDLE_SCHOOL, label: 'Middle', icon: School, sub: ['Grade 6', 'Grade 7', 'Grade 8'] },
  { id: AudienceCategory.HIGH_SCHOOL, label: 'High School', icon: GraduationCap, sub: ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'] },
  { id: AudienceCategory.UNIVERSITY, label: 'Higher Ed', icon: Building2, sub: ['Undergrad (Intro)', 'Undergrad (Advanced)', 'Postgrad', 'PhD Research'] },
  { id: AudienceCategory.PROFESSIONAL, label: 'Professional', icon: UserCircle, sub: ['Corporate Training', 'Certification', 'Technical Spec'] }
];

const PROFILES = [
  { id: LearnerProfile.GENERAL, label: 'General Ed', icon: Users, color: 'text-slate-500' },
  { id: LearnerProfile.SPECIAL_ED, label: 'IEP / SpEd', icon: Brain, color: 'text-purple-500' },
  { id: LearnerProfile.GIFTED, label: 'Gifted/Talented', icon: Zap, color: 'text-yellow-500' },
  { id: LearnerProfile.ESL_ELL, label: 'ESL / ELL', icon: Languages, color: 'text-blue-500' }
];

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.GENERATOR);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [worksheet, setWorksheet] = useState<Worksheet | null>(null);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [blueprints, setBlueprints] = useState<AssessmentBlueprint[]>([]);
  const [activeBlueprintId, setActiveBlueprintId] = useState<string | null>(null);
  const [savedWorksheets, setSavedWorksheets] = useState<Worksheet[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showTeacherKey, setShowTeacherKey] = useState(false);
  const [isMathMode, setIsMathMode] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  
  const [formData, setFormData] = useState({
    topic: '',
    customTitle: '',
    audienceCategory: AudienceCategory.HIGH_SCHOOL,
    educationalLevel: 'Grade 10',
    learnerProfile: LearnerProfile.GENERAL,
    difficulty: 'Medium',
    language: 'English',
    documentType: DocumentType.EXAM,
    rawText: '',
    questionCounts: {
      [QuestionType.MCQ]: 3,
      [QuestionType.TF]: 2,
      [QuestionType.SHORT_ANSWER]: 2,
    } as Record<string, number>,
    fileData: null as { data: string; mimeType: string; name: string } | null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('tm_v3_saved');
    if (saved) setSavedWorksheets(JSON.parse(saved));
    const savedCourse = localStorage.getItem('tm_v3_course');
    if (savedCourse) setActiveCourse(JSON.parse(savedCourse));
    const savedColls = localStorage.getItem('tm_v3_collections');
    if (savedColls) {
      setCollections(JSON.parse(savedColls));
    } else {
      // Default collection
      const defaultColl = { id: 'default', name: 'My Assignments', createdAt: Date.now() };
      setCollections([defaultColl]);
      localStorage.setItem('tm_v3_collections', JSON.stringify([defaultColl]));
    }
  }, []);

  const handleSave = (wsToSave: Worksheet, collectionId: string = 'default') => {
    const wsWithColl = { ...wsToSave, collectionId };
    const newSaved = [wsWithColl, ...savedWorksheets.filter(w => w.id !== wsToSave.id)].slice(0, 50);
    localStorage.setItem('tm_v3_saved', JSON.stringify(newSaved));
    setSavedWorksheets(newSaved);
    setShowSaveModal(false);
    
    // Update blueprint status if applicable
    if (activeBlueprintId) {
      setBlueprints(prev => prev.map(b => b.id === activeBlueprintId ? { ...b, status: 'saved', worksheet: wsWithColl } : b));
    }
  };

  const createNewCollection = () => {
    const name = prompt("Enter Container/Collection Name:");
    if (!name) return;
    const newColl: Collection = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      createdAt: Date.now()
    };
    const updated = [...collections, newColl];
    setCollections(updated);
    localStorage.setItem('tm_v3_collections', JSON.stringify(updated));
  };

  const toggleCollection = (id: string) => {
    const next = new Set(expandedCollections);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedCollections(next);
  };

  const updateCount = (type: string, delta: number) => {
    setFormData(prev => ({
      ...prev,
      questionCounts: {
        ...prev.questionCounts,
        [type]: Math.max(0, (prev.questionCounts[type] || 0) + delta)
      }
    }));
  };

  const handleModuleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const result = reader.result as string;
      const base64String = result.split(',')[1];
      const newFileData = { data: base64String, mimeType: file.type, name: file.name };
      
      const analysis = await analyzeCourseForBlueprints(newFileData, formData.rawText);
      if (analysis) {
        setBlueprints(analysis.blueprints);
        setFormData(prev => ({
          ...prev,
          audienceCategory: analysis.suggestedAudience,
          educationalLevel: analysis.suggestedLevel,
          fileData: newFileData
        }));
        setMode(AppMode.BLUEPRINT_DASHBOARD);
      }
      setIsAnalyzing(false);
    };
    reader.readAsDataURL(file);
  };

  const startGenerationFromBlueprint = (bp: AssessmentBlueprint) => {
    setFormData(prev => ({
      ...prev,
      topic: bp.topic,
      customTitle: bp.title,
      documentType: bp.suggestedDocType
    }));
    setActiveBlueprintId(bp.id);
    setMode(AppMode.GENERATOR);
    setCurrentStep(2);
  };

  const handleManualBatch = () => {
    const sections = formData.rawText.split('\n').filter(s => s.trim().length > 3);
    if (sections.length === 0) return alert("Paste some section names first!");
    
    const newBlueprints: AssessmentBlueprint[] = sections.map((s, idx) => ({
      id: Math.random().toString(36).substr(2, 9),
      title: s.split(':')[0] || 'Assessment',
      topic: s,
      status: 'draft',
      suggestedDocType: DocumentType.QUIZ,
      originModule: `Batch ${Math.floor(idx/3) + 1}`,
      originLesson: `Task ${idx + 1}`
    }));
    
    setBlueprints(newBlueprints);
    setMode(AppMode.BLUEPRINT_DASHBOARD);
  };

  const handleGenerate = async () => {
    if (!formData.topic.trim()) return alert("Please specify a topic.");
    setLoading(true);
    try {
      const result = await generateWorksheet({
        ...formData,
        questionCounts: formData.questionCounts as Record<string, number>,
        courseContext: activeCourse ? `From course: ${activeCourse.title}` : undefined,
        isMathMode,
        fileData: formData.fileData ? { data: formData.fileData.data, mimeType: formData.fileData.mimeType } : undefined
      });
      const ws = { ...result, id: Date.now().toString(), savedAt: Date.now() };
      setWorksheet(ws);
      
      if (activeBlueprintId) {
        setBlueprints(prev => prev.map(b => b.id === activeBlueprintId ? { ...b, status: 'ready', worksheet: ws } : b));
      }
      
      setMode(AppMode.WORKSHEET);
    } catch (e) {
      alert("Generation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Sidebar with Containers/Collections */}
      <aside className="w-80 bg-white border-r border-slate-200 hidden lg:flex flex-col fixed h-full z-20 no-print">
        <div className="p-8 border-b border-slate-100">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xl rotate-3">
                 <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                 <h1 className="font-black text-xl tracking-tighter leading-none">TEACH IN MINUTES</h1>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Blueprint Pro</span>
              </div>
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
           <nav className="space-y-2">
              <button onClick={() => { setMode(AppMode.GENERATOR); setCurrentStep(1); setFormData(p => ({ ...p, fileData: null, rawText: '' })); setBlueprints([]); }} className={`w-full flex items-center gap-3 p-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${mode === AppMode.GENERATOR && !blueprints.length ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
                 <Plus className="w-4 h-4" /> New Intake
              </button>
              {blueprints.length > 0 && (
                <button onClick={() => setMode(AppMode.BLUEPRINT_DASHBOARD)} className={`w-full flex items-center gap-3 p-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${mode === AppMode.BLUEPRINT_DASHBOARD ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
                   <Grid3X3 className="w-4 h-4" /> Curriculum Dashboard
                </button>
              )}
           </nav>

           <div>
              <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-300">Containers & Variations</h3>
                <button onClick={createNewCollection} className="p-1 hover:bg-slate-100 rounded text-blue-500" title="New Collection Container">
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                 {collections.map(coll => (
                    <div key={coll.id} className="space-y-1">
                      <button 
                        onClick={() => toggleCollection(coll.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all ${expandedCollections.has(coll.id) ? 'bg-slate-50 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-2">
                          <Folder className={`w-4 h-4 ${expandedCollections.has(coll.id) ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300'}`} />
                          <span className="truncate max-w-[140px]">{coll.name}</span>
                        </div>
                        <ChevronDown className={`w-3 h-3 transition-transform ${expandedCollections.has(coll.id) ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {expandedCollections.has(coll.id) && (
                        <div className="pl-6 space-y-1 animate-in slide-in-from-top-1 duration-200">
                           {savedWorksheets.filter(sw => (sw.collectionId || 'default') === coll.id).map(sw => (
                              <div key={sw.id} onClick={() => { setWorksheet(sw); setMode(AppMode.WORKSHEET); }} className={`p-3 rounded-lg border border-transparent hover:border-slate-100 hover:bg-white cursor-pointer transition-all group flex items-start gap-2 ${worksheet?.id === sw.id ? 'border-blue-100 bg-blue-50/30' : ''}`}>
                                 <FileText className={`w-3 h-3 mt-0.5 ${worksheet?.id === sw.id ? 'text-blue-500' : 'text-slate-300'}`} />
                                 <div className="flex-1 overflow-hidden">
                                    <div className="font-bold text-[10px] uppercase truncate text-slate-700">{sw.title}</div>
                                    <div className="text-[8px] font-medium text-slate-400 truncate">{sw.learnerProfile} • {sw.educationalLevel}</div>
                                 </div>
                              </div>
                           ))}
                           {savedWorksheets.filter(sw => (sw.collectionId || 'default') === coll.id).length === 0 && (
                             <div className="p-4 text-[9px] font-bold text-slate-300 uppercase tracking-widest text-center italic">Empty Container</div>
                           )}
                        </div>
                      )}
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </aside>

      <main className="flex-1 lg:ml-80 min-h-screen">
        <div className="max-w-6xl mx-auto p-8">
           {loading ? (
             <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <Loader2 className="w-16 h-16 animate-spin text-slate-900" />
                <div className="text-center">
                  <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Assembling Variations...</h2>
                  <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Building your educational assets</p>
                </div>
             </div>
           ) : (
             <>
               {mode === AppMode.BLUEPRINT_DASHBOARD && (
                 <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <header className="mb-12 flex justify-between items-end">
                      <div>
                        <div className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-lg text-[10px] font-black uppercase tracking-widest mb-4">Module Map Ready</div>
                        <h2 className="text-5xl font-black tracking-tighter text-slate-900 uppercase">Curriculum Dashboard</h2>
                        <p className="text-slate-500 font-bold mt-2 uppercase text-xs tracking-widest">Organized by module and learning lesson</p>
                      </div>
                      <button onClick={() => { setMode(AppMode.GENERATOR); setCurrentStep(1); }} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-slate-900 transition-all flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add Section
                      </button>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {blueprints.map((bp, i) => (
                         <div key={bp.id} className={`bg-white p-8 rounded-[2.5rem] shadow-xl border-2 transition-all group flex flex-col justify-between relative overflow-hidden ${bp.status === 'ready' ? 'border-green-400' : bp.status === 'saved' ? 'border-blue-400 opacity-60' : 'border-slate-100 hover:border-slate-300'}`}>
                            
                            {(bp.originModule || bp.originLesson) && (
                               <div className="absolute top-0 right-0 p-3">
                                  <div className="bg-slate-900 text-white px-3 py-1 rounded-bl-2xl rounded-tr-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                                     <Bookmark className="w-3 h-3 text-yellow-400" />
                                     {bp.originModule} • {bp.originLesson}
                                  </div>
                               </div>
                            )}

                            <div className="pt-6">
                               <div className="flex justify-between items-start mb-6">
                                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${bp.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                                     {bp.status}
                                  </span>
                                  <span className="text-slate-100 font-black text-3xl tracking-tighter">#{(i+1).toString().padStart(2, '0')}</span>
                               </div>
                               <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-3 leading-tight">{bp.title}</h3>
                               <p className="text-slate-400 text-[10px] font-bold uppercase mb-8 line-clamp-2 leading-relaxed">{bp.topic}</p>
                            </div>
                            
                            <div className="space-y-3">
                               {bp.status === 'ready' || bp.status === 'saved' ? (
                                 <button 
                                   onClick={() => { setWorksheet(bp.worksheet!); setMode(AppMode.WORKSHEET); }}
                                   className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg"
                                 >
                                    <FileText className="w-4 h-4" /> Open Editor
                                 </button>
                               ) : (
                                 <button 
                                   onClick={() => startGenerationFromBlueprint(bp)}
                                   className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg"
                                 >
                                    <Wand2 className="w-4 h-4" /> Generate Section
                                 </button>
                               )}
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               )}

               {mode === AppMode.GENERATOR && (
                 <div className="max-w-4xl mx-auto py-12">
                   <header className="text-center mb-16">
                      <h2 className="text-6xl font-black tracking-tighter text-slate-900 mb-4 uppercase">
                        {currentStep === 1 ? 'Content Intake' : 'Refine Assessment'}
                      </h2>
                      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">Step {currentStep} of 3</p>
                      
                      <div className="flex justify-center gap-4 mt-12">
                         {[1, 2, 3].map(s => (
                           <div key={s} className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all border-2 ${currentStep === s ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-110' : currentStep > s ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-200 text-slate-300'}`}>
                              {currentStep > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                           </div>
                         ))}
                      </div>
                   </header>

                   <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col min-h-[600px]">
                      <div className="p-12 flex-1">
                        {currentStep === 1 && (
                          <div className="animate-in slide-in-from-right duration-500 h-full flex flex-col gap-8">
                             <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">1. Bulk Document Upload</label>
                                {!formData.fileData ? (
                                  <button onClick={() => fileInputRef.current?.click()} className="w-full p-12 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50 hover:bg-white hover:border-blue-500 hover:shadow-2xl transition-all flex flex-col items-center group relative overflow-hidden">
                                     {isAnalyzing && (
                                       <div className="absolute inset-0 bg-blue-600/90 backdrop-blur-md flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
                                          <Loader2 className="w-12 h-12 animate-spin mb-4" />
                                          <span className="font-black uppercase tracking-[0.3em] text-xs">Architecting Curriculum</span>
                                       </div>
                                     )}
                                     <div className="p-6 bg-blue-100 rounded-[2rem] text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                                        <Upload className="w-12 h-12" />
                                     </div>
                                     <h3 className="font-black text-xl uppercase tracking-tighter text-slate-800 mb-2">Upload Syllabus or Course Doc</h3>
                                     <span className="font-bold text-xs uppercase tracking-widest text-slate-400 group-hover:text-blue-600">Analyze full hierarchy</span>
                                     <input ref={fileInputRef} type="file" className="hidden" onChange={handleModuleFileChange} />
                                  </button>
                                ) : (
                                  <div className="flex items-center justify-between p-8 bg-blue-600 rounded-[2rem] text-white shadow-2xl animate-in zoom-in duration-300">
                                     <div className="flex items-center gap-6">
                                        <div className="p-4 bg-white/20 rounded-2xl">
                                           <Package className="w-8 h-8" />
                                        </div>
                                        <div>
                                           <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Variation Source</p>
                                           <p className="font-black text-xl truncate max-w-[300px]">{formData.fileData.name}</p>
                                        </div>
                                     </div>
                                     <button onClick={() => setFormData(p => ({ ...p, fileData: null }))} className="p-4 hover:bg-white/20 rounded-2xl transition-colors">
                                        <CloseIcon className="w-6 h-6" />
                                     </button>
                                  </div>
                                )}
                             </div>
                             
                             <div className="relative">
                                <div className="flex justify-between items-center mb-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Or Batch Sections (One per line)</label>
                                  <button onClick={handleManualBatch} className="text-[10px] font-black uppercase text-blue-600 hover:underline">Draft Blueprints</button>
                                </div>
                                <textarea 
                                  className="w-full h-40 p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-medium text-slate-700 focus:bg-white focus:border-slate-900 outline-none resize-none transition-all" 
                                  placeholder="e.g.&#10;Physics Module 1: Kinematics&#10;Physics Module 2: Dynamics&#10;Lab Assessment 1" 
                                  value={formData.rawText} 
                                  onChange={e => setFormData({...formData, rawText: e.target.value})} 
                                />
                             </div>
                          </div>
                        )}

                        {currentStep === 2 && (
                          <div className="animate-in slide-in-from-right duration-500 space-y-12">
                             <section>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 block">Target Educational Level</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                   {CATEGORIES.map(cat => (
                                     <button 
                                       key={cat.id}
                                       onClick={() => setFormData({ ...formData, audienceCategory: cat.id, educationalLevel: cat.sub[0] })}
                                       className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 group ${formData.audienceCategory === cat.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-slate-50 border-slate-100 hover:border-slate-300 text-slate-600'}`}
                                     >
                                        <cat.icon className={`w-8 h-8 ${formData.audienceCategory === cat.id ? 'text-white' : 'text-slate-400'}`} />
                                        <span className="font-black text-[10px] uppercase tracking-widest">{cat.label}</span>
                                     </button>
                                   ))}
                                </div>
                             </section>

                             <section>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 block">Differentiated Learner Profile</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                   {PROFILES.map(prof => (
                                      <button key={prof.id} onClick={() => setFormData({ ...formData, learnerProfile: prof.id })} className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${formData.learnerProfile === prof.id ? 'bg-white border-slate-900 ring-4 ring-slate-100' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}>
                                         <prof.icon className={`w-5 h-5 ${prof.color}`} />
                                         <span className="font-black text-[9px] uppercase tracking-widest text-slate-700">{prof.label}</span>
                                      </button>
                                   ))}
                                </div>
                             </section>
                          </div>
                        )}

                        {currentStep === 3 && (
                          <div className="animate-in slide-in-from-right duration-500 h-full flex flex-col gap-8 text-center">
                             <div className="p-12 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center">
                                <div className="w-20 h-20 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl">
                                   <Layers className="w-10 h-10" />
                                </div>
                                <h3 className="text-4xl font-black uppercase tracking-tighter text-slate-900 mb-4">Variation Ready</h3>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] max-w-sm mx-auto">Gemini will generate specific questions tailored to the selected educational settings</p>
                                
                                <div className="grid grid-cols-3 gap-8 mt-12 w-full max-w-lg">
                                   {Object.entries(formData.questionCounts).map(([type, count]) => (
                                      <div key={type} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
                                         <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">{type.replace('_', ' ')}</span>
                                         <div className="flex items-center gap-4">
                                            <button onClick={() => updateCount(type, -1)} className="text-slate-300 hover:text-slate-600"><Minus className="w-4 h-4" /></button>
                                            <span className="text-xl font-black">{count}</span>
                                            <button onClick={() => updateCount(type, 1)} className="text-slate-300 hover:text-slate-600"><Plus className="w-4 h-4" /></button>
                                         </div>
                                      </div>
                                   ))}
                                </div>
                             </div>
                             
                             <button onClick={handleGenerate} className="w-full py-8 bg-slate-900 text-white rounded-[2.5rem] font-black text-2xl uppercase tracking-widest hover:bg-slate-800 transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-4">
                                <Sparkles className="w-8 h-8 text-yellow-400" /> Assemble Content
                             </button>
                          </div>
                        )}
                      </div>

                      <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                         <button onClick={() => setCurrentStep(p => p - 1)} disabled={currentStep === 1} className="flex items-center gap-2 px-6 py-3 text-slate-400 font-black uppercase tracking-widest text-[10px] disabled:opacity-0">
                            <ArrowLeft className="w-4 h-4" /> Back
                         </button>
                         <button onClick={() => setCurrentStep(p => p + 1)} disabled={currentStep === 3} className="flex items-center gap-2 px-10 py-4 bg-white border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-sm hover:border-slate-900 active:scale-95 transition-all">
                            Next Step <ArrowRight className="w-4 h-4" />
                         </button>
                      </div>
                   </div>
                 </div>
               )}

               {mode === AppMode.WORKSHEET && worksheet && (
                 <div className="py-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <WorksheetView worksheet={worksheet} theme={ThemeType.ACADEMIC} showKey={showTeacherKey} isMathMode={isMathMode} onUpdate={(newWs) => setWorksheet(newWs)} />
                    
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/80 backdrop-blur-md p-3 rounded-3xl shadow-2xl border border-slate-200 z-50 no-print">
                       <button onClick={() => setShowTeacherKey(!showTeacherKey)} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all ${showTeacherKey ? 'bg-red-600 text-white shadow-lg ring-4 ring-red-100' : 'bg-white text-slate-600 border border-slate-200'}`}>
                          {showTeacherKey ? 'Hide Solution Key' : 'Show Solution Key'}
                       </button>
                       <button onClick={() => setMode(AppMode.QUIZ)} className="px-6 py-3 bg-purple-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg">
                          <PlayCircle className="w-4 h-4" /> Start Practice
                       </button>
                       <button onClick={async () => {
                          const element = document.getElementById('worksheet-content');
                          if (!element) return;
                          setLoading(true);
                          const canvas = await html2canvas(element, { scale: 3, useCORS: true });
                          const pdf = new jsPDF('p', 'mm', 'a4');
                          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
                          pdf.save(`${worksheet.title}.pdf`);
                          setLoading(false);
                       }} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg">
                          <Printer className="w-4 h-4" /> Export PDF
                       </button>
                       <button onClick={() => setShowSaveModal(true)} className="px-6 py-3 bg-yellow-400 text-yellow-900 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg">
                          <Archive className="w-4 h-4" /> Save to Container
                       </button>
                    </div>

                    {/* Save to Collection Modal */}
                    {showSaveModal && (
                       <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6 no-print">
                          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-200">
                             <div className="flex justify-between items-start mb-8">
                                <div>
                                   <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Archive Variation</h3>
                                   <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Select a container for this asset</p>
                                </div>
                                <button onClick={() => setShowSaveModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><CloseIcon className="w-6 h-6" /></button>
                             </div>
                             
                             <div className="space-y-3 mb-10 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {collections.map(coll => (
                                   <button 
                                     key={coll.id} 
                                     onClick={() => handleSave(worksheet, coll.id)}
                                     className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-50 hover:border-slate-900 hover:bg-slate-50 transition-all text-left group"
                                   >
                                      <Folder className="w-6 h-6 text-slate-300 group-hover:text-yellow-500 group-hover:fill-yellow-500" />
                                      <div>
                                         <div className="font-black text-sm uppercase tracking-tight text-slate-800">{coll.name}</div>
                                         <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {savedWorksheets.filter(sw => (sw.collectionId || 'default') === coll.id).length} Saved Items
                                         </div>
                                      </div>
                                   </button>
                                ))}
                             </div>
                             
                             <button 
                               onClick={() => {
                                  const name = prompt("Enter new Container name:");
                                  if (name) {
                                     const newId = Math.random().toString(36).substr(2, 9);
                                     setCollections([...collections, { id: newId, name, createdAt: Date.now() }]);
                                     handleSave(worksheet, newId);
                                  }
                               }}
                               className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
                             >
                                <FolderPlus className="w-4 h-4" /> Create New Container
                             </button>
                          </div>
                       </div>
                    )}
                 </div>
               )}

               {mode === AppMode.QUIZ && worksheet && (
                  <QuizView worksheet={worksheet} theme={ThemeType.ACADEMIC} onExit={() => setMode(AppMode.WORKSHEET)} isMathMode={isMathMode} />
               )}
             </>
           )}
        </div>
      </main>
    </div>
  );
};

export default App;
