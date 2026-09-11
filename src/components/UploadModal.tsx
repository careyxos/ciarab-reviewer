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
  Globe, 
  HelpCircle,
  File,
  Layers,
  ArrowRight,
  Zap,
  Lock
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
    'Analyzing concepts and definitions for Mayor Cia...',
    'Chobee is synthesizing flashcards & quiz simulations...',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-chobee-navy-950/70 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-2xl glass-panel rounded-3xl p-5 sm:p-8 border border-pink-200/90 shadow-glow-dual max-h-[92vh] overflow-y-auto gpu-accelerated ios-spring">
        {/* iOS Grab Handle */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300/80 mx-auto mb-4" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={isGenerating}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-chobee-navy-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-400 to-blue-400 flex items-center justify-center text-xl shadow-soft-pink">
            ✨
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-chobee-navy-900 font-display">
              Create New AI Study Set
            </h2>
            <p className="text-xs text-chobee-pink-600 font-semibold">
              PDF, DOCX, Notes, or Topic Prompt • Built for Mayor Cia
            </p>
          </div>
        </div>

        {/* GENERATION IN PROGRESS STATE */}
        {isGenerating ? (
          <div className="py-12 px-4 text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-pink-200 border-t-chobee-pink-500 animate-spin" />
              <span className="text-3xl animate-bounce">🧸</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-bold text-chobee-navy-900 font-display">
                {loadingSteps[generationStep]}
              </h3>
              <p className="text-xs text-chobee-navy-700/60">
                Patience, pretty Mayor... Baby Bear is analyzing all concepts. 🌸
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
            {/* iOS Segmented Control */}
            <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200/80">
              <button
                onClick={() => {
                  if (soundEnabled) playHapticTap();
                  setActiveTab('upload');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all active:scale-98 ${
                  activeTab === 'upload'
                    ? 'bg-white text-chobee-pink-600 shadow-xs'
                    : 'text-slate-600 hover:text-chobee-navy-900'
                }`}
              >
                Upload File (PDF / DOCX)
              </button>
              <button
                onClick={() => {
                  if (soundEnabled) playHapticTap();
                  setActiveTab('paste');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all active:scale-98 ${
                  activeTab === 'paste'
                    ? 'bg-white text-chobee-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-chobee-navy-900'
                }`}
              >
                Paste Text / Notes
              </button>
            </div>

            {/* Upload Area */}
            {activeTab === 'upload' && (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-7 text-center cursor-pointer transition-all active:scale-[0.99] ${
                  file
                    ? 'border-emerald-300 bg-emerald-50/50'
                    : 'border-pink-200 hover:border-chobee-pink-400 bg-pink-50/40'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,.docx,.pptx,.txt,.md,image/*"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-white shadow-soft-pink mx-auto flex items-center justify-center text-chobee-pink-500 mb-2">
                  {file ? <FileText className="w-6 h-6 text-emerald-600" /> : <Upload className="w-6 h-6" />}
                </div>

                {file ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-chobee-navy-900">{file.name}</p>
                    <p className="text-xs text-emerald-600 font-semibold">
                      ✓ Document ready for extraction ({(file.size / 1024).toFixed(1)} KB) • Click to change
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-chobee-navy-900">
                      Tap or drop your PDF or DOCX here
                    </p>
                    <p className="text-xs text-chobee-navy-700/60">
                      Supports PDF, Word, PowerPoint, TXT, Markdown, and Images
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Paste Area */}
            {activeTab === 'paste' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-chobee-navy-800">
                  Paste Study Material or Lecture Notes
                </label>
                <textarea
                  rows={4}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste lecture text, syllabus sections, committee notes, or book chapters..."
                  className="w-full p-3.5 rounded-2xl border border-slate-200 bg-white text-xs text-chobee-navy-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-chobee-pink-400"
                />
              </div>
            )}

            {/* Title & Category Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-chobee-navy-800">Reviewer Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Tourism Week Final Reviewer"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-chobee-navy-900 focus:outline-none focus:ring-2 focus:ring-chobee-pink-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-chobee-navy-800">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-chobee-navy-900 focus:outline-none focus:ring-2 focus:ring-chobee-pink-400"
                >
                  <option value="Tourism">Tourism Management</option>
                  <option value="Accounting">Accounting & Finance</option>
                  <option value="Events">Event Facilitation</option>
                  <option value="General">General Reviewer</option>
                </select>
              </div>
            </div>

            {/* Generation Settings */}
            <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-chobee-navy-800">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-chobee-pink-500" />
                  <span>Output Preferences</span>
                </span>
                <span className="text-[11px] text-chobee-pink-600 font-semibold">
                  Personalized for Mayor Cia
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
                        ? 'bg-pink-100 text-pink-800 border-pink-300'
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
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
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
                        ? 'bg-purple-100 text-purple-800 border-purple-300'
                        : 'bg-white text-slate-500 border-slate-200'
                    }`}
                  >
                    ✓ Identification
                  </button>
                </div>
              </div>

              {/* Card Count & Language */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500">Card Count:</span>
                  <div className="flex gap-2">
                    {[5, 10, 20].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          if (soundEnabled) playHapticTap();
                          setCardCount(num);
                        }}
                        className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-all active:scale-95 ${
                          cardCount === num
                            ? 'bg-chobee-navy-900 text-white border-chobee-navy-900'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500">Language Tone:</span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-chobee-navy-800"
                  >
                    <option value="Taglish">Taglish (Chobee Tone 🧸)</option>
                    <option value="English">English (Formal)</option>
                    <option value="Tagalog">Tagalog (Formal)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Token Cost and Balance Info */}
            <div className="flex items-center justify-between px-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-500">
                <Zap className="w-3.5 h-3.5 text-chobee-pink-500 fill-chobee-pink-500" />
                <span>Cost: <strong className="text-chobee-navy-900">{REQUIRED_TOKENS} Tokens</strong></span>
              </div>
              {user ? (
                <span className={`font-bold text-xs ${hasEnoughTokens ? 'text-slate-600' : 'text-red-500'}`}>
                  Available: <strong className={hasEnoughTokens ? 'text-chobee-navy-900 font-mono' : 'text-red-600 font-mono'}>{user.role === 'admin' ? 'Unlimited' : dailyUsage.remaining}</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="text-chobee-pink-600 font-bold hover:underline"
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
                  <strong className="block font-black text-chobee-navy-900">
                    {tokenError || "You're out of AI tokens for today 💤"}
                  </strong>
                  <span className="font-semibold text-slate-500">
                    Your daily study credits will reset tomorrow (in {dailyUsage.resetCountdown}).
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
              className={`w-full py-3.5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-soft-pink transition-all active:scale-[0.97] ${
                (activeTab === 'upload' ? file : pastedText.trim()) && (!user || hasEnoughTokens)
                  ? 'bg-gradient-to-r from-chobee-pink-500 to-chobee-blue-500 hover:from-chobee-pink-600 hover:to-chobee-blue-600 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate AI Study Material</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
