
import React, { useState, useEffect } from 'react';
import { Worksheet, QuestionType, ThemeType, Question, DocumentType } from '../types';
import { 
  MarkerHighlight, 
  HelenCharacter, 
  QuestionIcon,
  DoodleCorner,
  DoodlePalette,
  DraggableLineRow
} from './HandwritingElements';
import { LatexRenderer } from './LatexRenderer';
import { 
  Trash2, Edit3, Check, X, FilePlus, Type, 
  CheckSquare, PlusCircle, ChevronUp, ChevronDown,
  Settings, User, Landmark, Clock as ClockIcon,
  Hash, Scissors
} from 'lucide-react';

interface WorksheetViewProps {
  worksheet: Worksheet;
  theme: ThemeType;
  showKey?: boolean;
  showDoodles?: boolean;
  isMathMode?: boolean;
  onUpdate?: (worksheet: Worksheet) => void;
}

export const WorksheetView: React.FC<WorksheetViewProps> = ({ 
  worksheet: initialWorksheet, 
  theme, 
  showKey = false, 
  showDoodles = false, 
  isMathMode = false,
  onUpdate
}) => {
  const [worksheet, setWorksheet] = useState<Worksheet>(initialWorksheet);
  const [isBuilderMode, setIsBuilderMode] = useState(false);

  useEffect(() => {
    setWorksheet(initialWorksheet);
  }, [initialWorksheet]);

  const handleUpdate = (newWs: Worksheet) => {
    setWorksheet(newWs);
    if (onUpdate) onUpdate(newWs);
  };

  const moveQuestion = (idx: number, direction: 'up' | 'down') => {
    const newQuestions = [...worksheet.questions];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newQuestions.length) return;
    [newQuestions[idx], newQuestions[targetIdx]] = [newQuestions[targetIdx], newQuestions[idx]];
    handleUpdate({ ...worksheet, questions: newQuestions });
  };

  const removeQuestion = (id: string) => {
    handleUpdate({ ...worksheet, questions: worksheet.questions.filter(q => q.id !== id) });
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    handleUpdate({
      ...worksheet,
      questions: worksheet.questions.map(q => q.id === id ? { ...q, ...updates } : q)
    });
  };

  const addQuestion = (type: QuestionType) => {
    const newQ: Question = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      sectionInstruction: "Follow the directions below:",
      question: type === QuestionType.PAGE_BREAK ? "Page Break" : "Double-click to edit question...",
      correctAnswer: "Answer",
      explanation: "Added manually",
      isChallenge: false,
      points: 5,
      options: type === QuestionType.MCQ ? ["Option 1", "Option 2", "Option 3", "Option 4"] : undefined
    };
    handleUpdate({ ...worksheet, questions: [...worksheet.questions, newQ] });
  };

  const isCreative = theme === ThemeType.CREATIVE;

  const EditableField = ({ value, onSave, className, multiline = false, placeholder = "", isMath = false }: { 
    value: string; onSave: (v: string) => void; className?: string; multiline?: boolean; placeholder?: string; isMath?: boolean
  }) => {
    const [local, setLocal] = useState(value);
    const [editing, setEditing] = useState(false);

    if (!isBuilderMode) {
      return isMath ? (
        <LatexRenderer content={value || placeholder} className={className} />
      ) : (
        <span className={className}>{value || placeholder}</span>
      );
    }

    if (editing) {
      return multiline ? (
        <textarea
          autoFocus
          className={`w-full p-2 border-2 border-blue-400 rounded bg-blue-50 focus:outline-none ${className}`}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => { setEditing(false); onSave(local); }}
        />
      ) : (
        <input
          autoFocus
          className={`w-full p-1 border-2 border-blue-400 rounded bg-blue-50 focus:outline-none ${className}`}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => { setEditing(false); onSave(local); }}
          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur())}
        />
      );
    }

    return (
      <span 
        onClick={() => setEditing(true)} 
        className={`cursor-text hover:bg-slate-50 transition-colors p-1 rounded border border-transparent hover:border-slate-200 ${className} ${!value ? 'text-slate-300 italic' : ''}`}
      >
        {isMath ? <LatexRenderer content={value || placeholder} /> : (value || placeholder)}
      </span>
    );
  };

  return (
    <div className="relative group/ws">
      {/* Control Bar */}
      <div className="absolute -top-16 left-0 right-0 flex justify-between items-center no-print px-4 py-2 bg-white/80 backdrop-blur rounded-2xl border border-slate-200 shadow-sm z-[60]">
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => setIsBuilderMode(!isBuilderMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${isBuilderMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {isBuilderMode ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            {isBuilderMode ? 'Finish Editing' : 'Enter Builder Mode'}
          </button>
          {isBuilderMode && (
             <div className="flex gap-2 border-l pl-4 border-slate-200">
                <button onClick={() => addQuestion(QuestionType.MCQ)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50" title="Add Multiple Choice"><CheckSquare className="w-4 h-4" /></button>
                <button onClick={() => addQuestion(QuestionType.SHORT_ANSWER)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50" title="Add Short Answer"><Type className="w-4 h-4" /></button>
                <button onClick={() => addQuestion(QuestionType.PAGE_BREAK)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50" title="Add Page Break"><FilePlus className="w-4 h-4" /></button>
             </div>
          )}
        </div>
        <div className="flex items-center gap-2">
           <Landmark className="w-4 h-4 text-slate-400" />
           <EditableField 
             value={worksheet.institutionName || ""} 
             onSave={(v) => handleUpdate({...worksheet, institutionName: v})} 
             placeholder="Institution Name..."
             className="text-xs font-black uppercase tracking-widest text-slate-500" 
           />
        </div>
      </div>

      <div 
        id="worksheet-content" 
        className={`max-w-[210mm] mx-auto bg-white p-[15mm] shadow-2xl min-h-[297mm] relative transition-all duration-300 ${isCreative ? 'font-handwriting-body' : 'font-sans'} border-x border-slate-200 print:shadow-none`}
      >
        {/* Header Section */}
        <div className="border-b-4 border-slate-900 pb-6 mb-10">
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-4">
                <Landmark className="w-8 h-8 text-slate-900" />
                <EditableField 
                  value={worksheet.institutionName || "NAME OF INSTITUTION"} 
                  onSave={(v) => handleUpdate({...worksheet, institutionName: v})} 
                  className="text-2xl font-black uppercase tracking-tight text-slate-900"
                />
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-2">
                 <div className="flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    <EditableField value={worksheet.courseCode || "COURSE CODE"} onSave={v => handleUpdate({...worksheet, courseCode: v})} className="text-xs font-bold text-slate-600" />
                 </div>
                 <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <EditableField value={worksheet.instructorName || "INSTRUCTOR NAME"} onSave={v => handleUpdate({...worksheet, instructorName: v})} className="text-xs font-bold text-slate-600" />
                 </div>
                 {worksheet.documentType === DocumentType.EXAM && (
                    <div className="flex items-center gap-2">
                       <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                       <EditableField value={worksheet.duration || "60 Minutes"} onSave={v => handleUpdate({...worksheet, duration: v})} className="text-xs font-bold text-slate-600" />
                    </div>
                 )}
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block bg-slate-900 text-white px-4 py-1 text-[10px] font-black uppercase tracking-[0.3em] mb-2">
                {worksheet.documentType}
              </div>
              <h1 className="text-4xl font-black text-slate-900 uppercase leading-none tracking-tighter">
                <EditableField value={worksheet.title} onSave={v => handleUpdate({...worksheet, title: v})} />
              </h1>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-8 mt-10">
            <div className="col-span-2 border-b-2 border-slate-900 pb-2 flex flex-col justify-end">
              <span className="text-[10px] font-black uppercase text-slate-400 mb-1">Student Name:</span>
              <div className="text-slate-200 text-sm">____________________________________________________</div>
            </div>
            <div className="border-2 border-slate-900 p-4 text-center bg-slate-50">
              <span className="text-[10px] font-black uppercase text-slate-500 block mb-1">Result / Mark</span>
              <div className="text-3xl font-black text-slate-200">___ / {worksheet.questions.reduce((sum, q) => sum + (q.points || 0), 0)}</div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-12 bg-slate-50 p-6 border-l-4 border-slate-900 italic text-sm text-slate-700">
          <EditableField 
            multiline 
            value={worksheet.topic || "Please read all questions carefully and provide complete answers in the spaces provided."} 
            onSave={v => handleUpdate({...worksheet, topic: v})} 
            isMath={isMathMode}
          />
        </div>

        {/* Questions Section */}
        <div className="space-y-16 relative">
          {worksheet.questions.map((q, idx) => {
            if (q.type === QuestionType.PAGE_BREAK) {
              return (
                <div key={q.id} className="relative py-12 flex items-center justify-center group/q border-y border-dashed border-slate-200 no-print">
                   <div className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-300">Page Break</div>
                   {isBuilderMode && (
                      <button onClick={() => removeQuestion(q.id)} className="absolute right-0 p-2 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                   )}
                </div>
              );
            }

            return (
              <div key={q.id} className={`relative group/q ${isBuilderMode ? 'ring-1 ring-blue-50 p-4 rounded-xl -m-4 transition-all hover:bg-blue-50/20' : ''}`}>
                {isBuilderMode && (
                  <div className="absolute -left-16 top-0 flex flex-col gap-1 no-print bg-white shadow-sm border border-slate-200 rounded-lg p-1 opacity-0 group-hover/q:opacity-100 transition-opacity">
                    <button onClick={() => moveQuestion(idx, 'up')} className="p-1.5 hover:bg-slate-100 rounded text-slate-400"><ChevronUp className="w-4 h-4" /></button>
                    <button onClick={() => moveQuestion(idx, 'down')} className="p-1.5 hover:bg-slate-100 rounded text-slate-400"><ChevronDown className="w-4 h-4" /></button>
                    <button onClick={() => removeQuestion(q.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}

                {/* Section Specific Instructions */}
                {q.sectionInstruction && (
                   <div className="mb-4 flex items-center gap-2">
                      <div className="h-4 w-1 bg-yellow-400 rounded-full"></div>
                      <EditableField 
                        value={q.sectionInstruction} 
                        onSave={v => updateQuestion(q.id, {sectionInstruction: v})} 
                        className="text-[11px] font-black uppercase tracking-widest text-slate-400 italic"
                        isMath={isMathMode}
                      />
                   </div>
                )}

                <div className="flex justify-between items-start mb-4">
                   <div className="flex items-start gap-4 flex-1">
                      <div className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center font-black text-sm flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <EditableField 
                          multiline 
                          value={q.question} 
                          onSave={v => updateQuestion(q.id, {question: v})} 
                          className={`text-xl font-bold text-slate-900 leading-tight block ${isMathMode ? 'font-mono' : ''}`} 
                          isMath={true} // Enable mixed math for all questions
                        />
                      </div>
                   </div>
                   <div className="ml-4 flex flex-col items-end">
                      <div className="text-[10px] font-black text-slate-300 uppercase">Points</div>
                      <EditableField value={String(q.points || 0)} onSave={v => updateQuestion(q.id, {points: parseInt(v) || 0})} className="font-black text-slate-900 border-b border-slate-200" />
                   </div>
                </div>

                <div className="ml-14 mt-6">
                  {q.type === QuestionType.MCQ && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {q.options?.map((opt, i) => (
                        <div key={i} className={`flex items-center gap-4 p-3 border-2 border-slate-100 rounded-lg group/opt transition-all ${showKey && opt === q.correctAnswer ? 'bg-red-50 border-red-200 ring-1 ring-red-100' : ''}`}>
                          <div className={`w-5 h-5 border-2 border-slate-900 flex items-center justify-center flex-shrink-0 ${showKey && opt === q.correctAnswer ? 'bg-red-600 border-red-600' : ''}`}>
                             {showKey && opt === q.correctAnswer && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <EditableField 
                            value={opt} 
                            onSave={v => {
                               const newOpts = [...(q.options || [])];
                               newOpts[i] = v;
                               updateQuestion(q.id, {options: newOpts});
                            }} 
                            className={`text-sm font-medium flex-1 ${showKey && opt === q.correctAnswer ? 'text-red-700 font-bold' : ''}`}
                            isMath={true}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === QuestionType.SHORT_ANSWER && (
                    <div className="space-y-4">
                       {[...Array(3)].map((_, i) => (
                          <div key={i} className="border-b border-slate-200 h-10 flex items-end">
                             {showKey && i === 0 && (
                                <span className="font-handwriting-body text-red-600 text-2xl ml-4 animate-in fade-in slide-in-from-left-2">
                                  <LatexRenderer content={q.correctAnswer} />
                                </span>
                             )}
                          </div>
                       ))}
                    </div>
                  )}

                  {q.type === QuestionType.TF && (
                    <div className="flex gap-12">
                       {['True', 'False'].map(val => (
                          <div key={val} className={`flex items-center gap-4 ${showKey && q.correctAnswer === val ? 'bg-red-50 p-2 rounded-lg' : ''}`}>
                             <div className={`w-6 h-6 border-2 border-slate-900 flex items-center justify-center ${showKey && q.correctAnswer === val ? 'bg-red-600 border-red-600 text-white' : ''}`}>
                                {showKey && q.correctAnswer === val && <Check className="w-4 h-4" />}
                             </div>
                             <span className={`text-sm font-black uppercase tracking-widest ${showKey && q.correctAnswer === val ? 'text-red-700' : 'text-slate-400'}`}>{val}</span>
                          </div>
                       ))}
                    </div>
                  )}

                  {q.type === QuestionType.SENTENCE_DRILL && (
                    <div className="space-y-6">
                       <DraggableLineRow text={q.correctAnswer} isSmall={false} />
                       <div className="h-24 border-b-2 border-dashed border-slate-100 w-full"></div>
                    </div>
                  )}
                </div>

                {showKey && q.explanation && (
                  <div className="ml-14 mt-6 p-4 bg-slate-50 border-l-2 border-red-200 text-[11px] leading-relaxed text-slate-500 italic">
                    <span className="font-black uppercase tracking-widest text-red-400 mr-2">Rationale:</span>
                    <EditableField multiline value={q.explanation} onSave={v => updateQuestion(q.id, {explanation: v})} isMath={true} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Area */}
        <div className="mt-32 pt-8 border-t-4 border-slate-900 flex justify-between items-end opacity-40">
           <div className="text-[10px] font-black uppercase tracking-widest text-slate-800">
              Generated by Teach in Minutes Blueprint Pro
           </div>
           <div className="text-right">
              <span className="text-[8px] font-bold block">Document Ref: TM-AS-{(worksheet.id || '0000').slice(-6).toUpperCase()}</span>
              <span className="text-[8px] font-bold block">Confidential Academic Material</span>
           </div>
        </div>
      </div>
    </div>
  );
};
