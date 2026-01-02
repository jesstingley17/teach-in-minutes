
import React, { useState, useEffect } from 'react';
import { Worksheet, QuestionType, ThemeType } from '../types';
import { MarkerHighlight } from './HandwritingElements';
import { LatexRenderer } from './LatexRenderer';
import { CheckCircle, XCircle, RefreshCw, BarChart3, Clock, AlertCircle, ArrowLeft } from 'lucide-react';

interface QuizAttempt {
  score: number;
  total: number;
  date: number;
}

interface QuizViewProps {
  worksheet: Worksheet;
  theme: ThemeType;
  onExit: () => void;
  isMathMode?: boolean;
}

export const QuizView: React.FC<QuizViewProps> = ({ worksheet, theme, onExit, isMathMode = false }) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [history, setHistory] = useState<QuizAttempt[]>([]);

  // Fix: ThemeType.CREATIVE does not exist on type 'typeof ThemeType'. Using ThemeType.GAMMA instead.
  const isCreative = theme === ThemeType.GAMMA;
  const progressKey = `quiz_progress_${worksheet.id || 'draft'}`;
  const historyKey = `quiz_history_${worksheet.id || 'draft'}`;

  // Load saved progress and history on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem(progressKey);
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        setAnswers(parsed.answers || {});
        if (parsed.submitted) {
          setSubmitted(true);
          setScore(parsed.score || 0);
        }
      } catch (e) {
        console.error("Failed to restore quiz progress", e);
      }
    }

    const savedHistory = localStorage.getItem(historyKey);
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to restore quiz history", e);
      }
    }
  }, [progressKey, historyKey]);

  // Save progress whenever answers or submission state changes
  useEffect(() => {
    const dataToSave = {
      answers,
      submitted,
      score,
      timestamp: Date.now()
    };
    localStorage.setItem(progressKey, JSON.stringify(dataToSave));
  }, [answers, submitted, score, progressKey]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const calculateScore = () => {
    let correctCount = 0;
    worksheet.questions.forEach(q => {
      const userAnswer = answers[q.id]?.toLowerCase().trim() || '';
      const correctAnswer = q.correctAnswer.toLowerCase().trim();
      if (userAnswer === correctAnswer) {
        correctCount++;
      }
    });
    
    const finalScore = correctCount;
    setScore(finalScore);
    setSubmitted(true);

    // Save to history
    const newAttempt: QuizAttempt = {
      score: finalScore,
      total: worksheet.questions.length,
      date: Date.now()
    };
    const updatedHistory = [newAttempt, ...history].slice(0, 10); // Keep last 10 attempts
    setHistory(updatedHistory);
    localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
    
    // Scroll to top to see results
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetQuiz = () => {
    if (confirm("Reset all answers and start fresh?")) {
      setAnswers({});
      setSubmitted(false);
      setScore(0);
      localStorage.removeItem(progressKey);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const clearHistory = () => {
    if (confirm("Clear your performance history for this worksheet?")) {
      setHistory([]);
      localStorage.removeItem(historyKey);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  };

  return (
    <div className={`max-w-4xl mx-auto p-6 pb-32 transition-all ${isCreative ? 'font-handwriting-body' : 'font-sans'}`}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className={`${isCreative ? 'font-handwriting-header text-5xl' : 'text-3xl font-bold'} text-slate-800`}>
            {isCreative ? <MarkerHighlight>{worksheet.title}</MarkerHighlight> : worksheet.title}
          </h1>
          <p className="text-slate-500 mt-2">{worksheet.topic} • {worksheet.educationalLevel}</p>
        </div>
        <div className="flex gap-4">
          {!submitted && Object.keys(answers).length > 0 && (
            <button 
              onClick={resetQuiz}
              className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl text-sm font-bold transition-colors"
            >
              Reset Progress
            </button>
          )}
          <button 
            onClick={onExit}
            className="px-4 py-2 text-slate-500 hover:text-slate-800 font-medium transition-colors"
          >
            Exit Quiz
          </button>
        </div>
      </div>

      {submitted && (
        <div className="mb-10 animate-in zoom-in duration-500">
           <div className={`p-8 rounded-[2rem] text-center shadow-xl bg-white border-4 flex flex-col items-center ${isCreative ? 'border-yellow-400' : 'border-blue-500'}`}>
              <div className="text-6xl font-black mb-2 text-slate-800">
                {score} / {worksheet.questions.length}
              </div>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-6">Digital Practice Final Result</p>
              
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-6 max-w-md">
                 <div 
                   className={`h-full transition-all duration-1000 ${score/worksheet.questions.length >= 0.8 ? 'bg-green-500' : score/worksheet.questions.length >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                   style={{ width: `${(score / worksheet.questions.length) * 100}%` }}
                 />
              </div>

              <div className="flex gap-4 justify-center">
                <button 
                  onClick={resetQuiz}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl font-black hover:bg-slate-200 transition active:scale-95 shadow-sm"
                >
                  <RefreshCw className="w-5 h-5" /> Retake Quiz
                </button>
                <button 
                  onClick={onExit}
                  className={`px-8 py-3 text-white rounded-2xl font-black transition shadow-lg active:scale-95 ${
                    isCreative ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Return to Worksheet
                </button>
              </div>
           </div>
        </div>
      )}

      <div className="space-y-8">
        {worksheet.questions.map((q, idx) => {
          const userAnswerRaw = answers[q.id] || '';
          const isCorrect = userAnswerRaw.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();
          
          return (
            <div key={q.id} className={`p-6 sm:p-8 rounded-[2rem] border-2 transition-all ${
              isCreative 
                ? 'bg-white border-slate-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]' 
                : 'bg-white border-slate-200'
            } ${submitted && !isCorrect ? 'border-red-200 bg-red-50/10' : ''}`}>
              <div className="flex items-start gap-4 mb-6">
                <span className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg ${
                  isCreative ? 'bg-yellow-100 text-yellow-700 rotate-3' : 'bg-slate-100 text-slate-600'
                }`}>
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <h3 className={`text-xl sm:text-2xl font-bold leading-tight ${isCreative ? 'font-handwriting-body' : ''}`}>
                    {isMathMode ? <LatexRenderer content={q.question} /> : q.question}
                    {q.isChallenge && <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-purple-100 text-purple-800 shadow-sm border border-purple-200">Challenge</span>}
                  </h3>
                </div>
              </div>

              <div className="ml-0 sm:ml-14 space-y-3">
                {q.type === QuestionType.MCQ && (
                  <div className="grid grid-cols-1 gap-3">
                    {q.options?.map((opt, i) => (
                      <label key={i} className={`flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        answers[q.id] === opt 
                          ? (isCreative ? 'border-yellow-400 bg-yellow-50' : 'border-blue-500 bg-blue-50')
                          : 'border-slate-50 hover:border-slate-100'
                      } ${submitted ? 'cursor-default' : ''}`}>
                        <input 
                          type="radio" 
                          name={q.id} 
                          className="hidden" 
                          checked={answers[q.id] === opt}
                          disabled={submitted}
                          onChange={() => handleAnswerChange(q.id, opt)}
                        />
                        <span className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-colors ${
                          answers[q.id] === opt 
                            ? (isCreative ? 'border-yellow-500 bg-yellow-500' : 'border-blue-600 bg-blue-600') 
                            : 'border-slate-300'
                        }`}>
                          {answers[q.id] === opt && <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />}
                        </span>
                        <span className={`text-lg transition-all ${answers[q.id] === opt ? 'font-black text-slate-900' : 'text-slate-600 font-medium'}`}>
                          {isMathMode ? <LatexRenderer content={opt} /> : opt}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {q.type === QuestionType.TF && (
                  <div className="flex flex-wrap gap-4">
                    {['True', 'False'].map(val => (
                      <button
                        key={val}
                        disabled={submitted}
                        onClick={() => handleAnswerChange(q.id, val)}
                        className={`px-10 py-3 rounded-2xl border-2 font-black text-lg transition-all shadow-sm active:scale-95 ${
                          answers[q.id] === val
                            ? (isCreative ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : 'border-blue-500 bg-blue-50 text-blue-700')
                            : 'border-slate-100 text-slate-400 hover:border-slate-200 bg-white'
                        } ${submitted ? 'active:scale-100' : ''}`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                )}

                {(q.type === QuestionType.SHORT_ANSWER || q.type === QuestionType.VOCABULARY) && (
                  <div className="relative">
                    <input 
                      type="text"
                      disabled={submitted}
                      placeholder="Type your answer here..."
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      className={`w-full p-5 rounded-2xl border-2 transition-all text-xl font-bold shadow-inner ${
                        isCreative 
                          ? 'font-handwriting-body bg-slate-50 border-slate-100 focus:ring-4 focus:ring-yellow-100 focus:border-yellow-400 outline-none' 
                          : 'bg-white border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none'
                      } ${submitted ? 'bg-slate-50' : ''}`}
                    />
                  </div>
                )}
              </div>

              {submitted && (
                <div className={`mt-8 ml-0 sm:ml-14 p-6 rounded-[2rem] border-2 animate-in fade-in slide-in-from-top-4 duration-500 ${
                  isCorrect
                    ? 'bg-green-50/50 border-green-200 text-green-900'
                    : 'bg-red-50/50 border-red-200 text-red-900 shadow-sm'
                }`}>
                  <div className="flex items-start gap-4">
                    {isCorrect 
                      ? <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" /> 
                      : <XCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
                    }
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-4">
                        <p className="font-black text-xl uppercase tracking-widest">
                          {isCorrect ? 'Stellar Work!' : 'Almost There!'}
                        </p>
                        <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${
                          isCorrect ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'
                        }`}>
                          {isCorrect ? 'Verified Correct' : 'Needs Review'}
                        </span>
                      </div>
                      
                      <div className="space-y-5">
                        {!isCorrect && (
                          <div className="bg-white/40 p-4 rounded-2xl border border-red-200/50">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2 flex items-center gap-1.5">
                              <AlertCircle className="w-3 h-3" /> Your Submission:
                            </p>
                            <p className="text-base font-bold italic line-through opacity-70">
                              {userAnswerRaw || <span className="opacity-40">[ No Answer Provided ]</span>}
                            </p>
                          </div>
                        )}

                        <div className="bg-white/70 p-4 rounded-2xl border border-current/10 shadow-sm">
                          <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isCorrect ? 'text-green-700/60' : 'text-red-700/60'}`}>Official Solution:</p>
                          <p className="text-lg font-black">
                            {isMathMode ? <LatexRenderer content={q.correctAnswer} /> : q.correctAnswer}
                          </p>
                        </div>

                        {q.explanation && (
                          <div className="pt-2">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Academic Rationale & Context:</p>
                            <p className="text-sm leading-relaxed font-medium bg-white/30 p-4 rounded-xl border border-slate-100">
                              {isMathMode ? <LatexRenderer content={q.explanation} /> : q.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-16 sticky bottom-8 flex justify-center flex-col items-center gap-6 no-print">
        {!submitted ? (
          <button 
            onClick={calculateScore}
            className={`px-16 py-5 rounded-[2rem] text-2xl font-black text-white shadow-2xl transform transition hover:scale-105 active:scale-95 ${
              isCreative ? 'bg-yellow-500 hover:bg-yellow-600 ring-4 ring-yellow-100' : 'bg-blue-600 hover:bg-blue-700 ring-4 ring-blue-100'
            }`}
          >
            Submit All Answers
          </button>
        ) : (
          <div className="flex flex-col items-center gap-6 w-full max-w-md">
            <button 
              onClick={resetQuiz}
              className={`w-full py-5 rounded-[2rem] text-xl font-black text-white shadow-xl transform transition hover:scale-105 active:scale-95 flex items-center justify-center gap-3 ${
                isCreative ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <RefreshCw className="w-6 h-6" /> Retake This Quiz
            </button>
            
            <div className="w-full bg-white rounded-[2rem] p-6 shadow-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom-8 duration-500">
              <div className="flex justify-between items-center mb-6">
                <h4 className="flex items-center gap-2 font-black text-slate-800 text-xs uppercase tracking-[0.2em]">
                  <BarChart3 className="w-4 h-4 text-blue-500" /> Session History
                </h4>
                <button onClick={clearHistory} className="text-[10px] font-black uppercase text-slate-300 hover:text-red-500 transition-colors">Wipe Archive</button>
              </div>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {history.map((attempt, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-all hover:bg-white">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-700">Attempt {history.length - i}</span>
                      <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase mt-1">
                        <Clock className="w-3 h-3" /> {formatDate(attempt.date)}
                      </span>
                    </div>
                    <div className={`px-4 py-2 rounded-xl text-sm font-black shadow-sm ${
                      (attempt.score / attempt.total) >= 0.8 ? 'bg-green-100 text-green-700' :
                      (attempt.score / attempt.total) >= 0.5 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {attempt.score} / {attempt.total}
                    </div>
                  </div>
                ))}
                {history.length === 0 && <p className="text-center py-8 text-xs font-bold text-slate-300 uppercase tracking-widest">No previous attempts</p>}
              </div>
            </div>

            <button 
              onClick={onExit}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-black uppercase tracking-widest text-xs transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Worksheet
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
