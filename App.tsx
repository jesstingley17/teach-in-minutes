
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
  Baby, School, Building2, UserCircle, 
  Zap, Brain, Languages, Users, Layout, 
  BookOpen, ChevronRight, MoreHorizontal, CheckCircle,
  File, X as CloseIcon, Sparkles, Grid3X3, ListTodo, Edit,
  Link as LinkIcon, Bookmark, FolderPlus, Folder, ChevronDown, 
  Layers, Package, Archive, Move, Play, CheckSquare, Trash2,
  Check as CheckIcon, Square
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
  const [blueprints, setBlueprints] = useState<AssessmentBlueprint[]>([]);
  const [selectedBlueprintIds, setSelectedBlueprintIds] = useState<Set<string>>(new Set());
  const [savedWorksheets, setSavedWorksheets] = useState<Worksheet[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
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

  // Load persistence
  useEffect(() => {
    const savedWs = localStorage.getItem('tm_v3_saved');
    if (savedWs) setSavedWorksheets(JSON.parse(savedWs));
    
    const savedBlueprints = localStorage.getItem('tm_v3_blueprints');
    if (savedBlueprints) setBlueprints(JSON.parse(savedBlueprints));

    const savedColls = localStorage.getItem('tm_v3_collections');
    if (savedColls) {
      setCollections(JSON.parse(savedColls));
    } else {
      const defaultColl = { id: 'default', name: 'Main Collection', createdAt: Date.now() };
      setCollections([defaultColl]);
      localStorage.setItem('tm_v3_collections', JSON.stringify([defaultColl]));
    }
  }, []);

  // Sync blueprints
  useEffect(() => {
    if (blueprints.length > 0) {
      localStorage.setItem('tm_v3_blueprints', JSON.stringify(blueprints));
    }
  }, [blueprints]);

  const handleSave = (wsToSave: Worksheet, collectionId: string = 'default') => {
    const wsWithColl = { ...wsToSave, collectionId, savedAt: Date.now() };
    const newSaved = [wsWithColl, ...savedWorksheets.filter(w => w.id !== wsToSave.id)].slice(0, 200);
    localStorage.setItem('tm_v3_saved', JSON.stringify(newSaved));
    setSavedWorksheets(newSaved);
    setShowSaveModal(false);
    
    setBlueprints(prev => prev.map(b => 
      (b.worksheet?.id === wsToSave.id || b.id === wsToSave.id) 
      ? { ...b, status: 'saved', worksheet: wsWithColl } 
      : b
    ));
  };

  const createNewCollection = () => {
    const name = prompt("Enter Container Name:");
    if (!name) return;
    const newColl: Collection = { id: Math.random().toString(36).substr(2, 9), name, createdAt: Date.now() };
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

  const toggleBlueprintSelection = (id: string) => {
    const next = new Set(selectedBlueprintIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedBlueprintIds(next);
  };

  const handleBatchGenerate = async () => {
    const targets = blueprints.filter(b => selectedBlueprintIds.has(b.id) && b.status !== 'ready' && b.status !== 'saved');
    if (targets.length === 0) return alert("Select at least one draft blueprint to generate.");
    
    setBatchLoading(true);
    for (const bp of targets) {
      setBlueprints(prev => prev.map(item => item.id === bp.id ? { ...item, status: 'generating' } : item));
      try {
        const result = await generateWorksheet({
          topic: bp.topic,
          educationalLevel: formData.educationalLevel,
          audienceCategory: formData.audienceCategory,
          learnerProfile: formData.learnerProfile,
          difficulty: formData.difficulty,
          language: formData.language,
          documentType: bp.suggestedDocType,
          questionCounts: formData.questionCounts,
          isMathMode,
          fileData: formData.fileData ? { data: formData.fileData.data, mimeType: formData.fileData.mimeType } : undefined
        });
        const ws = { ...result, id: bp.id, savedAt: Date.now() };
        setBlueprints(prev => prev.map(item => item.id === bp.id ? { ...item, status: 'ready', worksheet: ws } : item));
      } catch (err) {
        setBlueprints(prev => prev.map(item => item.id === bp.id ? { ...item, status: 'draft' } : item));
      }
    }
    setBatchLoading(false);
    setSelectedBlueprintIds(new Set());
  };

  const handleBatchArchive = () => {
    const targets = blueprints.filter(b => selectedBlueprintIds.has(b.id));
    if (targets.length === 0) return;

    const collectionName = prompt("Select or Create a Collection for these assets:", "Course Bundle");
    if (!collectionName) return;

    let targetColl = collections.find(c => c.name.toLowerCase() === collectionName.toLowerCase());
    if (!targetColl) {
      targetColl = { id: Math.random().toString(36).substr(2, 9), name: collectionName, createdAt: Date.now() };
      const newColls = [...collections, targetColl];
      setCollections(newColls);
      localStorage.setItem('tm_v3_collections', JSON.stringify(newColls));
    }

    const newSaved = [...savedWorksheets];
    targets.forEach(bp => {
      const wsToSave: Worksheet = bp.worksheet || {
        id: bp.id,
        title: bp.title,
        topic: bp.topic,
        educationalLevel: formData.educationalLevel,
        documentType: bp.suggestedDocType,
        questions: [], // Placeholder for draft
        learnerProfile: formData.learnerProfile,
        audienceCategory: formData.audienceCategory,
        collectionId: targetColl!.id,
        savedAt: Date.now()
      };
      
      const existingIdx = newSaved.findIndex(s => s.id === wsToSave.id);
      if (existingIdx > -1) newSaved[existingIdx] = { ...wsToSave, collectionId: targetColl!.id };
      else newSaved.push({ ...wsToSave, collectionId: targetColl!.id });
    });

    localStorage.setItem('tm_v3_saved', JSON.stringify(newSaved));
    setSavedWorksheets(newSaved);
    setBlueprints(prev => prev.map(b => selectedBlueprintIds.has(b.id) ? { ...b, status: 'saved' } : b));
    setSelectedBlueprintIds(new Set());
    alert(`Archived ${targets.length} items to ${collectionName}`);
  };

  const handleBatchDelete = () => {
    if (!confirm(`Delete ${selectedBlueprintIds.size} selected blueprints?`)) return;
    setBlueprints(prev => prev.filter(b => !selectedBlueprintIds.has(b.id)));
    setSelectedBlueprintIds(new Set());
  };

  // Fixes Error in file App.tsx on line 516: Cannot find name 'handleManualBatch'.
  const handleManualBatch = () => {
    if (!formData.rawText.trim()) return;
    const items = formData.rawText.split('\n').map(l => l.trim()).filter(l => l);
    const newBlueprints: AssessmentBlueprint[] = items.map(item => ({
      id: Math.random().toString(36).substr(2, 9),
      title: item,
      topic: item,
      status: 'draft',
      suggestedDocType: formData.documentType
    }));
    setBlueprints(prev => [...prev, ...newBlueprints]);
    setMode(AppMode.BLUEPRINT_DASHBOARD);
  };

  // Fixes Error in file App.tsx on line 581: Cannot find name 'handleGenerate'.
  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateWorksheet({
        topic: formData.topic || formData.customTitle || "Untitled Worksheet",
        educationalLevel: formData.educationalLevel,
        audienceCategory: formData.audienceCategory,
        learnerProfile: formData.learnerProfile,
        difficulty: formData.difficulty,
        language: formData.language,
        documentType: formData.documentType,
        questionCounts: formData.questionCounts,
        rawText: formData.rawText,
        fileData: formData.fileData ? { data: formData.fileData.data, mimeType: formData.fileData.mimeType } : undefined,
        isMathMode
      });
      
      const newWs = { ...result, id: Math.random().toString(36).substr(2, 9), savedAt: Date.now() };
      setWorksheet(newWs);
      setMode(AppMode.WORKSHEET);
    } catch (error) {
      console.error("Generation failed:", error);
      alert("Failed to generate content. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-100">
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
              <button onClick={() => { setMode(AppMode.GENERATOR); setCurrentStep(1); }} className={`w-full flex items-center gap-3 p-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${mode === AppMode.GENERATOR ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
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
                <button onClick={createNewCollection} className="p-1 hover:bg-slate-100 rounded text-blue-500">
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
                           {savedWorksheets.filter(sw => sw.collectionId === coll.id).map(sw => (
                              <div key={sw.id} onClick={() => { setWorksheet(sw); setMode(AppMode.WORKSHEET); }} className={`p-3 rounded-lg border border-transparent hover:border-slate-100 hover:bg-white cursor-pointer transition-all group flex items-start gap-2 ${worksheet?.id === sw.id ? 'border-blue-100 bg-blue-50/30' : ''}`}>
                                 <FileText className={`w-3 h-3 mt-0.5 ${worksheet?.id === sw.id ? 'text-blue-500' : 'text-slate-300'}`} />
                                 <div className="flex-1 overflow-hidden">
                                    <div className="font-bold text-[10px] uppercase truncate text-slate-700">{sw.title}</div>
                                    <div className="text-[8px] font-medium text-slate-400 truncate">{sw.documentType} • {sw.educationalLevel}</div>
                                 </div>
                              </div>
                           ))}
                           {savedWorksheets.filter(sw => sw.collectionId === coll.id).length === 0 && (
                             <div className="p-4 text-[9px] font-bold text-slate-300 uppercase tracking-widest text-center italic">Empty</div>
                           )}
                        </div>
                      )}
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </aside>

      <main className="flex-1 lg:ml-80 min-h-screen relative">
        {/* Floating Batch Action Bar */}
        {selectedBlueprintIds.size > 0 && mode === AppMode.BLUEPRINT_DASHBOARD && (
          <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-8 py-6 rounded-[2.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] flex items-center gap-8 border border-white/10 animate-in slide-in-from-bottom-12 duration-500">
             <div className="flex items-center gap-3 border-r border-white/20 pr-8">
                <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center font-black">{selectedBlueprintIds.size}</div>
                <div className="text-[10px] font-black uppercase tracking-widest">Items Selected</div>
             </div>
             <div className="flex items-center gap-3">
                <button onClick={handleBatchGenerate} disabled={batchLoading} className="px-6 py-3 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all flex items-center gap-2">
                   {batchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                   Generate Selected
                </button>
                <button onClick={handleBatchArchive} className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all">
                   <Archive className="w-4 h-4" /> Archive All
                </button>
                <button onClick={handleBatchDelete} className="px-6 py-3 bg-red-600/20 hover:bg-red-600 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all text-red-400 hover:text-white">
                   <Trash2 className="w-4 h-4" /> Delete
                </button>
             </div>
             <button onClick={() => setSelectedBlueprintIds(new Set())} className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all">
                <CloseIcon className="w-5 h-5" />
             </button>
          </div>
        )}

        <div className="max-w-6xl mx-auto p-8">
           {loading ? (
             <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <Loader2 className="w-16 h-16 animate-spin text-slate-900" />
                <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Architecting Content...</h2>
             </div>
           ) : (
             <>
               {mode === AppMode.BLUEPRINT_DASHBOARD && (
                 <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 pb-40">
                    <header className="mb-12 flex justify-between items-end gap-8 flex-wrap">
                      <div className="flex-1 min-w-[300px]">
                        <div className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-lg text-[10px] font-black uppercase tracking-widest mb-4">Course Map Persistence Enabled</div>
                        <h2 className="text-5xl font-black tracking-tighter text-slate-900 uppercase">Curriculum Dashboard</h2>
                        <p className="text-slate-500 font-bold mt-2 uppercase text-xs tracking-widest">Select and batch manage your educational assets</p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                         <button 
                           onClick={() => setSelectedBlueprintIds(new Set(blueprints.map(b => b.id)))}
                           className="px-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:border-slate-900 transition-all flex items-center gap-2"
                         >
                            <CheckSquare className="w-4 h-4" /> Select All
                         </button>
                         <button onClick={() => { setMode(AppMode.GENERATOR); setCurrentStep(1); }} className="px-6 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-xl">
                           <Plus className="w-4 h-4" /> Add Blueprint
                         </button>
                      </div>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {blueprints.map((bp, i) => (
                         <div 
                           key={bp.id} 
                           onClick={() => toggleBlueprintSelection(bp.id)}
                           className={`bg-white p-8 rounded-[2.5rem] shadow-xl border-2 transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden ${
                            selectedBlueprintIds.has(bp.id) ? 'border-slate-900 ring-4 ring-slate-100' :
                            bp.status === 'ready' ? 'border-green-400' : 
                            bp.status === 'saved' ? 'border-blue-400 opacity-60' : 
                            bp.status === 'generating' ? 'border-yellow-400 animate-pulse' : 'border-slate-100 hover:border-slate-300'
                           }`}
                         >
                            {/* Checkbox Overlay */}
                            <div className="absolute top-6 left-6 z-10">
                               {selectedBlueprintIds.has(bp.id) ? (
                                 <div className="w-6 h-6 bg-slate-900 text-white rounded-lg flex items-center justify-center animate-in zoom-in duration-200">
                                    <CheckIcon className="w-4 h-4" />
                                 </div>
                               ) : (
                                 <div className="w-6 h-6 bg-slate-100 rounded-lg group-hover:bg-slate-200" />
                               )}
                            </div>

                            {(bp.originModule || bp.originLesson) && (
                               <div className="absolute top-0 right-0 p-3">
                                  <div className="bg-slate-900 text-white px-3 py-1 rounded-bl-2xl rounded-tr-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                                     <Bookmark className="w-3 h-3 text-yellow-400" />
                                     {bp.originModule}
                                  </div>
                               </div>
                            )}

                            <div className="pt-6">
                               <div className="flex justify-between items-start mb-6">
                                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${
                                    bp.status === 'ready' ? 'bg-green-100 text-green-700' : 
                                    bp.status === 'generating' ? 'bg-yellow-100 text-yellow-700' :
                                    bp.status === 'saved' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
                                  }`}>
                                     {bp.status === 'generating' && <Loader2 className="w-3 h-3 animate-spin" />}
                                     {bp.status}
                                  </span>
                                  <span className="text-slate-100 font-black text-3xl tracking-tighter">#{(i+1).toString().padStart(2, '0')}</span>
                               </div>
                               <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-3 leading-tight">{bp.title}</h3>
                               <p className="text-slate-400 text-[10px] font-bold uppercase mb-8 line-clamp-2 leading-relaxed">{bp.topic}</p>
                            </div>
                            
                            <div className="space-y-3" onClick={e => e.stopPropagation()}>
                               {bp.status === 'ready' || bp.status === 'saved' ? (
                                 <button 
                                   onClick={() => { setWorksheet(bp.worksheet!); setMode(AppMode.WORKSHEET); }}
                                   className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg"
                                 >
                                    <FileText className="w-4 h-4" /> Open Editor
                                 </button>
                               ) : bp.status === 'generating' ? (
                                 <div className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 italic">
                                    Gemini Thinking...
                                 </div>
                               ) : (
                                 <div className="flex gap-2">
                                   <button 
                                     onClick={() => {
                                        setFormData(prev => ({ ...prev, topic: bp.topic, customTitle: bp.title, documentType: bp.suggestedDocType }));
                                        setMode(AppMode.GENERATOR);
                                        setCurrentStep(3);
                                     }}
                                     className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg"
                                   >
                                      <Wand2 className="w-4 h-4" /> Generate
                                   </button>
                                   <button 
                                      onClick={() => {
                                        setSelectedBlueprintIds(new Set([bp.id]));
                                        handleBatchArchive();
                                      }}
                                      className="p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition-all"
                                      title="Save as Draft Container"
                                   >
                                      <Archive className="w-4 h-4" />
                                   </button>
                                 </div>
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
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">1. Syllabus or Course Material</label>
                                {!formData.fileData ? (
                                  <button onClick={() => fileInputRef.current?.click()} className="w-full p-12 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50 hover:bg-white hover:border-blue-500 transition-all flex flex-col items-center group relative overflow-hidden">
                                     {isAnalyzing && (
                                       <div className="absolute inset-0 bg-blue-600/90 backdrop-blur-md flex flex-col items-center justify-center text-white z-20">
                                          <Loader2 className="w-12 h-12 animate-spin mb-4" />
                                          <span className="font-black uppercase tracking-widest text-xs">Parsing Course Structure</span>
                                       </div>
                                     )}
                                     <div className="p-6 bg-blue-100 rounded-[2rem] text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                                        <Upload className="w-12 h-12" />
                                     </div>
                                     <h3 className="font-black text-xl uppercase tracking-tighter text-slate-800 mb-2">Upload Syllabus</h3>
                                     <span className="font-bold text-xs uppercase tracking-widest text-slate-400">PDF, DOCX, or Images</span>
                                     <input ref={fileInputRef} type="file" className="hidden" onChange={handleModuleFileChange} />
                                  </button>
                                ) : (
                                  <div className="flex items-center justify-between p-8 bg-blue-600 rounded-[2rem] text-white shadow-2xl">
                                     <div className="flex items-center gap-6">
                                        <Package className="w-8 h-8" />
                                        <div>
                                           <p className="text-[10px] font-black uppercase opacity-60 mb-1">Source Loaded</p>
                                           <p className="font-black text-xl truncate max-w-[300px]">{formData.fileData.name}</p>
                                        </div>
                                     </div>
                                     <button onClick={() => setFormData(p => ({ ...p, fileData: null }))} className="p-4 hover:bg-white/20 rounded-2xl">
                                        <CloseIcon className="w-6 h-6" />
                                     </button>
                                  </div>
                                )}
                             </div>
                             
                             <div className="relative">
                                <div className="flex justify-between items-center mb-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Or Bulk Paste Assessment Titles</label>
                                  {/* Error in file App.tsx on line 516 fixed by handleManualBatch definition above */}
                                  <button onClick={handleManualBatch} className="text-[10px] font-black uppercase text-blue-600 hover:underline">Draft Map</button>
                                </div>
                                <textarea 
                                  className="w-full h-40 p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-medium text-slate-700 focus:bg-white focus:border-slate-900 outline-none resize-none transition-all" 
                                  placeholder="Introduction to Physics&#10;Forces and Motion&#10;Energy Transfer Lab" 
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
                                       className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${formData.audienceCategory === cat.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-slate-50 border-slate-100 hover:border-slate-300 text-slate-600'}`}
                                     >
                                        <cat.icon className={`w-8 h-8 ${formData.audienceCategory === cat.id ? 'text-white' : 'text-slate-400'}`} />
                                        <span className="font-black text-[10px] uppercase tracking-widest">{cat.label}</span>
                                     </button>
                                   ))}
                                </div>
                             </section>

                             <section>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 block">Learner Profile Variation</label>
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
                                <Layers className="w-12 h-12 text-slate-900 mb-6" />
                                <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 mb-2">Final Variations</h3>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-12">Configure quantity per category</p>
                                
                                <div className="grid grid-cols-3 gap-8 w-full max-w-lg">
                                   {Object.entries(formData.questionCounts).map(([type, count]) => (
                                      <div key={type} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
                                         <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">{type}</span>
                                         <div className="flex items-center gap-4">
                                            {/* Error in file App.tsx on line 572: arithmetic op fix */}
                                            <button onClick={() => setFormData(p => ({...p, questionCounts: {...p.questionCounts, [type]: Math.max(0, (count as number) - 1)}}))} className="text-slate-300"><Minus className="w-4 h-4" /></button>
                                            <span className="text-xl font-black">{count as number}</span>
                                            {/* Error in file App.tsx on line 574: operator + fix */}
                                            <button onClick={() => setFormData(p => ({...p, questionCounts: {...p.questionCounts, [type]: (count as number) + 1}}))} className="text-slate-300"><Plus className="w-4 h-4" /></button>
                                         </div>
                                      </div>
                                   ))}
                                </div>
                             </div>
                             
                             {/* Error in file App.tsx on line 581: handleGenerate defined above */}
                             <button onClick={handleGenerate} className="w-full py-8 bg-slate-900 text-white rounded-[2.5rem] font-black text-2xl uppercase tracking-widest hover:bg-slate-800 transition-all shadow-2xl flex items-center justify-center gap-4">
                                <Sparkles className="w-8 h-8 text-yellow-400" /> Assemble Assets
                             </button>
                          </div>
                        )}
                      </div>

                      <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                         <button onClick={() => setCurrentStep(p => p - 1)} disabled={currentStep === 1} className="px-6 py-3 text-slate-400 font-black uppercase tracking-widest text-[10px] disabled:opacity-0 flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4" /> Back
                         </button>
                         <button onClick={() => setCurrentStep(p => p + 1)} disabled={currentStep === 3} className="px-10 py-4 bg-white border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-sm hover:border-slate-900 transition-all flex items-center gap-2">
                            Next Step <ArrowRight className="w-4 h-4" />
                         </button>
                      </div>
                   </div>
                 </div>
               )}

               {mode === AppMode.WORKSHEET && worksheet && (
                 <div className="py-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <WorksheetView worksheet={worksheet} theme={ThemeType.ACADEMIC} showKey={showTeacherKey} isMathMode={isMathMode} onUpdate={(newWs) => setWorksheet(newWs)} />
                    
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/80 backdrop-blur-md p-3 rounded-3xl shadow-2xl border border-slate-200 z-[90] no-print">
                       <button onClick={() => setShowTeacherKey(!showTeacherKey)} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${showTeacherKey ? 'bg-red-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                          {showTeacherKey ? 'Hide Solution' : 'Show Solution'}
                       </button>
                       <button onClick={() => setMode(AppMode.QUIZ)} className="px-6 py-3 bg-purple-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg">
                          <PlayCircle className="w-4 h-4" /> Practice Mode
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
                          <Printer className="w-4 h-4" /> PDF Export
                       </button>
                       <button onClick={() => setShowSaveModal(true)} className="px-6 py-3 bg-yellow-400 text-yellow-900 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg">
                          <Archive className="w-4 h-4" /> Save Variation
                       </button>
                    </div>

                    {showSaveModal && (
                       <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6 no-print">
                          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-200">
                             <div className="flex justify-between items-start mb-8">
                                <div>
                                   <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Archive Asset</h3>
                                   <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Select a destination container</p>
                                </div>
                                <button onClick={() => setShowSaveModal(false)} className="p-2"><CloseIcon className="w-6 h-6" /></button>
                             </div>
                             
                             <div className="space-y-3 mb-10 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {collections.map(coll => (
                                   <button 
                                     key={coll.id} 
                                     onClick={() => handleSave(worksheet, coll.id)}
                                     className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-50 hover:border-slate-900 transition-all text-left"
                                   >
                                      <Folder className="w-6 h-6 text-slate-300" />
                                      <div>
                                         <div className="font-black text-sm uppercase tracking-tight text-slate-800">{coll.name}</div>
                                         <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {savedWorksheets.filter(sw => sw.collectionId === coll.id).length} Saved
                                         </div>
                                      </div>
                                   </button>
                                ))}
                             </div>
                             
                             <button onClick={createNewCollection} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-blue-500 hover:border-blue-500 transition-all flex items-center justify-center gap-2">
                                <FolderPlus className="w-4 h-4" /> New Container
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
