import React, { useState, useEffect, useRef } from 'react';
import { fireLightCelebration } from '../services/fxService';
import { 
  X, 
  Upload, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Sliders, 
  File,
  Layers,
  ArrowRight,
  Zap
} from 'lucide-react';
import { StudySet } from '../types/study';
import { generateStudyMaterial, GenerationOptions } from '../services/aiService';
import { extractTextFromPDF } from '../services/pdfParser';
import { playCelebrationSound, playHapticTap } from '../services/audioService';
import { sanitizeCard } from '../services/storageService';
import { useAuth } from '../context/AuthContext';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStudySetCreated: (newSet: StudySet) => void;
  soundEnabled: boolean;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onStudySetCreated,
  soundEnabled,
}) => {
  const { user, dailyUsage, updateUsageRemaining, openAuthModal } = useAuth();
  const REQUIRED_TOKENS = 10;
  const hasEnoughTokens = user ? (user.role === 'admin' || dailyUsage.remaining >= REQUIRED_TOKENS) : true;
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'Tourism' | 'Accounting' | 'Events' | 'General'>('Tourism');
  const [themeColor, setThemeColor] = useState<'pink' | 'blue' | 'lavender'>('pink');
  
  // Customization settings
  const [cardCount, setCardCount] = useState<number>(10);
  const [quizCount, setQuizCount] = useState<number>(10);
  const [questionTypes, setQuestionTypes] = useState<('multiple_choice' | 'true_false' | 'identification')[]>([
    'multiple_choice',
    'true_false',
    'identification',
  ]);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Mixed'>('Mixed');
  const [language, setLanguage] = useState<'English' | 'Tagalog' | 'Taglish'>('Taglish');

  // Generation loading states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to completely clear and reset all modal inputs so old notes are never reused
  const resetForm = () => {
    setFile(null);
    setPastedText('');
    setTitle('');
    setGenerationStep(0);
    setIsGenerating(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Reset inputs fresh every time the modal is opened
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const loadingSteps = [
    'Reading and extracting text from your study document...',
    'Analyzing core concepts and definitions...',
    'Synthesizing flashcards, quiz questions, and study guide...',
    'Your study set is ready! ✨',
  ];

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (soundEnabled) playHapticTap();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      if (!title) {
        setTitle(droppedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (soundEnabled) playHapticTap();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const toggleQuestionType = (type: 'multiple_choice' | 'true_false' | 'identification') => {
    if (soundEnabled) playHapticTap();
    if (questionTypes.includes(type)) {
      if (questionTypes.length > 1) {
        setQuestionTypes(questionTypes.filter((t) => t !== type));
      }
    } else {
      setQuestionTypes([...questionTypes, type]);
    }
  };

  const handleStartGeneration = async () => {
    if (soundEnabled) playHapticTap();
    setIsGenerating(true);
    setGenerationStep(0);

    let rawContent = '';

    if (activeTab === 'upload') {
      if (!file) {
        setIsGenerating(false);
        return;
      }

      try {
        if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
          // Real PDF Extraction
          rawContent = await extractTextFromPDF(file);
        } else if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
          rawContent = await file.text();
        } else {
          // For docx/pptx or other files
          const raw = await file.text();
          const clean = raw.replace(/[^A-Za-z0-9\s.,?!:;'"()\-]/g, ' ').slice(0, 8000);
          rawContent = clean.length > 50 ? clean : `Study concepts extracted from ${file.name}.`;
        }
      } catch (err) {
        console.warn('File read error:', err);
        rawContent = `Study notes on ${title || file.name}.\nCore definitions, principles, and practice questions.`;
      }
    } else {
      rawContent = pastedText;
    }

    // Disallow raw PDF FlateDecode or binary syntax from entering the generator
    if (
      rawContent.includes('FlateDecode') || 
      rawContent.includes('stream EQ') || 
      rawContent.includes('1.7 obj') ||
      rawContent.includes('endstream')
    ) {
      const cleanName = (activeTab === 'upload' && file) ? file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') : (title || 'Lecture Notes');
      rawContent = `Comprehensive Study Material: ${cleanName}
Overview: Essential theoretical concepts, operational standards, review summaries, and examination guidelines for ${cleanName}.
1. Operational Standards: Standardized operating procedures executed to guarantee efficiency, accuracy, and institutional compliance.
2. Resource Management: Strategic allocation of logistics, budgeting, materials, and human resources to achieve milestones.
3. Protocol and Precedence: The formal order, etiquette, and guidelines followed in ceremonies and meetings.
4. Risk Management: Pre-planned response mechanisms designed to mitigate disruptions and equipment malfunctions.
5. Quality Assurance: Systematic review procedures conducted before live execution or examination assessments.
6. Documentation: Transparent reporting, milestone logs, and post-activity evaluations to verify outcomes.`;
    }

    if (!rawContent.trim()) {
      rawContent = `Study set for ${title || 'General Review'}.\nCore principles, definition of terms, operations, and review guidelines.`;
    }

    // Step progression
    const stepInterval = setInterval(() => {
      setGenerationStep((prev) => {
        if (prev < 2) return prev + 1;
        return prev;
      });
    }, 750);

    if (user && !hasEnoughTokens) {
      setTokenError("You're out of AI tokens for today 💤 Your daily study credits will reset tomorrow.");
      return;
    }

    try {
      setTokenError(null);
      const activeApiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof window !== 'undefined' ? localStorage.getItem('chobee_gemini_api_key') || undefined : undefined);
      const options: GenerationOptions = {
        title: title.trim() || (activeTab === 'upload' && file ? file.name.replace(/\.[^/.]+$/, '') : 'Lecture Notes Reviewer'),
        category,
        themeColor,
        cardCount,
        quizCount,
        questionTypes,
        difficulty,
        language,
        apiKey: activeApiKey,
      };

      const generated = await generateStudyMaterial(rawContent, options);

      if (user && user.role !== 'admin') {
        updateUsageRemaining(Math.max(0, dailyUsage.remaining - REQUIRED_TOKENS));
      }

      clearInterval(stepInterval);
      setGenerationStep(3);

      setTimeout(() => {
        const fullSet: StudySet = {
          ...generated,
          id: `set-${Date.now()}`,
          fileName: activeTab === 'upload' && file ? file.name : undefined,
          fileType: activeTab === 'upload' && file ? file.name.split('.').pop()?.toUpperCase() : 'NOTES',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPreset: false,
          isFavorite: false,
          flashcards: (generated.flashcards || []).map((fc, idx) => sanitizeCard(fc, idx)),
        };

        if (soundEnabled) playCelebrationSound();
        fireLightCelebration(0.5, 0.7);

        onStudySetCreated(fullSet);
        setIsGenerating(false);
        resetForm();
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Error generating material:', err);
      clearInterval(stepInterval);
      setIsGenerating(false);
      if (err?.data?.code === 'OUT_OF_TOKENS' || err?.status === 402) {
        setTokenError("You're out of AI tokens for today 💤 Your daily study credits will reset tomorrow.");
      } else {
        setTokenError(err?.message || 'Generation failed. Please try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={isGenerating}
          aria-label="Close modal"
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-chobee-pink-50 text-chobee-pink-600 flex items-center justify-center text-xl font-bold">
            ✨
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-display">
              Create New Study Set
            </h2>
            <p className="text-xs text-slate-500">
              Upload lecture documents or paste notes to generate flashcards and quizzes
            </p>
          </div>
        </div>

        {/* GENERATION IN PROGRESS STATE */}
        {isGenerating ? (
          <div className="py-12 px-4 text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100 border-t-chobee-pink-500 animate-spin" />
              <span className="text-3xl animate-bounce">🧸</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                {loadingSteps[generationStep]}
              </h3>
              <p className="text-xs text-slate-500">
                Synthesizing your flashcards, summary guide, and practice quiz...
              </p>
            </div>

            {/* Stepper Dots */}
            <div className="flex items-center justify-center gap-2 pt-2">
              {loadingSteps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === generationStep
                      ? 'w-8 bg-chobee-pink-500'
                      : idx < generationStep
                      ? 'w-2 bg-emerald-400'
                      : 'w-2 bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          /* FORM CONTROLS */
          <div className="space-y-5">
            {/* Segmented Control */}
            <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200">
              <button
                onClick={() => {
                  if (soundEnabled) playHapticTap();
                  setActiveTab('upload');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all active:scale-98 ${
                  activeTab === 'upload'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Upload Document (PDF / DOCX)
              </button>
              <button
                onClick={() => {
                  if (soundEnabled) playHapticTap();
                  setActiveTab('paste');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all active:scale-98 ${
                  activeTab === 'paste'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Paste Text / Lecture Notes
              </button>
            </div>

            {/* Upload Area */}
            {activeTab === 'upload' && (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all active:scale-[0.99] ${
                  file
                    ? 'border-emerald-300 bg-emerald-50/40'
                    : 'border-slate-200 hover:border-chobee-pink-400 bg-slate-50/50 hover:bg-white'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,.docx,.pptx,.txt,.md,image/*"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-white shadow-2xs mx-auto flex items-center justify-center text-chobee-pink-500 mb-3 border border-slate-100">
                  {file ? <FileText className="w-6 h-6 text-emerald-600" /> : <Upload className="w-6 h-6" />}
                </div>

                {file ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900">{file.name}</p>
                    <p className="text-xs text-emerald-600 font-semibold">
                      ✓ Ready for extraction ({(file.size / 1024).toFixed(1)} KB) • Click to change
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800">
                      Click or drag your study file here
                    </p>
                    <p className="text-xs text-slate-500">
                      Supports PDF, Word, PowerPoint, TXT, Markdown, and images
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Paste Area */}
            {activeTab === 'paste' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Paste Study Material or Lecture Notes
                </label>
                <textarea
                  rows={4}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste lecture text, syllabus sections, committee notes, or book chapters..."
                  className="w-full p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all"
                />
              </div>
            )}

            {/* Title & Category Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Reviewer Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Chapter 4 Operations Reviewer"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-400 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-400 transition-all"
                >
                  <option value="Tourism">Tourism Management</option>
                  <option value="Accounting">Accounting & Finance</option>
                  <option value="Events">Event Facilitation</option>
                  <option value="General">General Reviewer</option>
                </select>
              </div>
            </div>

            {/* Generation Settings */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-chobee-pink-500" />
                  <span>Output Preferences</span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Customized Generation
                </span>
              </div>

              {/* Question Types */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500">Include Question Formats:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => toggleQuestionType('multiple_choice')}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                      questionTypes.includes('multiple_choice')
                        ? 'bg-chobee-pink-50 text-chobee-pink-700 border-chobee-pink-200'
                        : 'bg-white text-slate-500 border-slate-200'
                    }`}
                  >
                    ✓ Multiple Choice
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleQuestionType('true_false')}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                      questionTypes.includes('true_false')
                        ? 'bg-chobee-blue-50 text-chobee-blue-700 border-chobee-blue-200'
                        : 'bg-white text-slate-500 border-slate-200'
                    }`}
                  >
                    ✓ True / False
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleQuestionType('identification')}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                      questionTypes.includes('identification')
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-white text-slate-500 border-slate-200'
                    }`}
                  >
                    ✓ Identification
                  </button>
                </div>
              </div>

              {/* Card Count & Quiz Count */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500">Flashcard Count:</span>
                  <div className="flex gap-1.5">
                    {[5, 10, 30, 50].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          if (soundEnabled) playHapticTap();
                          setCardCount(num);
                        }}
                        className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-all active:scale-95 ${
                          cardCount === num
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
                    <span>Quiz Count:</span>
                    <span className="text-[10px] text-chobee-pink-600 font-semibold">5 to 50 max</span>
                  </span>
                  <div className="flex gap-1.5">
                    {[5, 10, 30, 50].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          if (soundEnabled) playHapticTap();
                          setQuizCount(num);
                        }}
                        className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-all active:scale-95 ${
                          quizCount === num
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {num === 50 ? '50 Max' : num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Language Tone */}
              <div className="space-y-1 pt-1">
                <span className="text-[11px] font-bold text-slate-500">Language Tone:</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="Taglish">Taglish (Chobee Friendly 🧸)</option>
                  <option value="English">English (Formal)</option>
                  <option value="Tagalog">Tagalog (Formal)</option>
                </select>
              </div>
            </div>

            {/* Token Cost and Balance Info */}
            <div className="flex items-center justify-between px-1 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-slate-600">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Cost: <strong className="text-slate-900">{REQUIRED_TOKENS} Tokens</strong></span>
              </div>
              {user ? (
                <span className={`font-semibold text-xs ${hasEnoughTokens ? 'text-slate-600' : 'text-red-500'}`}>
                  Available: <strong className={hasEnoughTokens ? 'text-slate-900 font-mono' : 'text-red-600 font-mono'}>{user.role === 'admin' ? 'Unlimited' : dailyUsage.remaining}</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="text-chobee-pink-600 font-semibold hover:underline"
                >
                  Log in to track credits &rarr;
                </button>
              )}
            </div>

            {/* Token limit error notice if empty */}
            {(tokenError || (user && !hasEnoughTokens)) && (
              <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
                <span className="text-base shrink-0">🌙</span>
                <div>
                  <strong className="block font-bold text-slate-900">
                    {tokenError || "You're out of AI tokens for today"}
                  </strong>
                  <span className="font-medium text-slate-500">
                    Your daily study credits will reset in {dailyUsage.resetCountdown}.
                  </span>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleStartGeneration}
              disabled={
                (activeTab === 'upload' ? !file : !pastedText.trim()) || (Boolean(user) && !hasEnoughTokens)
              }
              className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98] ${
                (activeTab === 'upload' ? file : pastedText.trim()) && (!user || hasEnoughTokens)
                  ? 'bg-slate-900 hover:bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <Sparkles className="w-4 h-4 text-chobee-pink-400" />
              <span>Generate Study Set</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
