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
  Zap,
  Globe,
  Link2,
  FileCheck,
  ShieldCheck,
  BookOpen,
  Key,
  ExternalLink
} from 'lucide-react';
import { StudySet } from '../types/study';
import { generateStudyMaterial, GenerationOptions, testGeminiApiKey } from '../services/aiService';
import { extractTextFromDocument } from '../services/documentParser';
import { playCelebrationSound, playHapticTap } from '../services/audioService';
import { sanitizeCard } from '../services/storageService';
import { 
  uploadStudyFile, 
  createExternalUrlRecord, 
  createStudyNoteRecord, 
  validateExternalUrl,
  StudyFileRecord
} from '../services/fileStorageService';
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

  // 3 Distinct Input Tabs: Uploaded File, External URL, or Manual Notes
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'paste'>('upload');
  
  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // External URL state
  const [externalUrl, setExternalUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  // Manual notes state
  const [pastedText, setPastedText] = useState('');

  // General metadata
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

  // Google Gemini API Key state
  const [apiKey, setApiKey] = useState<string>(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('chobee_gemini_api_key') || '' : '');
  });
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [keyValidationStatus, setKeyValidationStatus] = useState<{ valid?: boolean; message?: string } | null>(null);

  const handleTestAndSaveKey = async () => {
    if (!apiKey.trim()) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('chobee_gemini_api_key');
      }
      setKeyValidationStatus({ valid: false, message: 'Gemini key removed. The built-in document extractor will be used.' });
      return;
    }
    setTestingKey(true);
    setKeyValidationStatus(null);
    try {
      const res = await testGeminiApiKey(apiKey.trim());
      setKeyValidationStatus(res);
      if (res.valid && typeof window !== 'undefined') {
        localStorage.setItem('chobee_gemini_api_key', apiKey.trim());
      }
    } catch (e: any) {
      setKeyValidationStatus({ valid: false, message: e?.message || 'Could not verify key.' });
    } finally {
      setTestingKey(false);
    }
  };

  // Generation loading states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to completely clear and reset all modal inputs
  const resetForm = () => {
    setFile(null);
    setFileError(null);
    setExternalUrl('');
    setUrlError(null);
    setPastedText('');
    setTitle('');
    setGenerationStep(0);
    setIsGenerating(false);
    setTokenError(null);
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
    'Storing document securely in private Supabase Storage...',
    'Extracting text & analyzing core subject concepts...',
    'AI synthesizing flashcards, quiz questions, & study guide...',
    'Your reviewer is ready! ✨',
  ];

  const validateAndSetFile = (candidate: File) => {
    // 50MB file size limit check
    const MAX_BYTES = 52428800; // 50MB
    if (candidate.size > MAX_BYTES) {
      setFileError('File exceeds the 50MB limit. Please upload a file smaller than 50MB.');
      setFile(null);
      return;
    }

    setFileError(null);
    setFile(candidate);
    if (!title) {
      setTitle(candidate.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (soundEnabled) playHapticTap();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (soundEnabled) playHapticTap();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUrlChange = (val: string) => {
    setExternalUrl(val);
    if (!val.trim()) {
      setUrlError(null);
      return;
    }
    const res = validateExternalUrl(val);
    if (!res.valid) {
      setUrlError(res.error || 'Invalid URL');
    } else {
      setUrlError(null);
      if (!title) {
        try {
          const u = new URL(val);
          const pathSegments = u.pathname.split('/').filter(Boolean);
          const lastSegment = pathSegments[pathSegments.length - 1];
          if (lastSegment) {
            setTitle(decodeURIComponent(lastSegment.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')));
          }
        } catch (e) {}
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
    setTokenError(null);

    // Validation checks
    if (activeTab === 'upload') {
      if (!file) {
        setFileError('Please select a file to upload.');
        return;
      }
    } else if (activeTab === 'url') {
      const v = validateExternalUrl(externalUrl);
      if (!v.valid) {
        setUrlError(v.error || 'Please enter a valid document URL.');
        return;
      }
    } else if (activeTab === 'paste') {
      if (!pastedText.trim()) {
        return;
      }
    }

    if (user && !hasEnoughTokens) {
      setTokenError("You're out of AI tokens for today 💤 Your daily study credits will reset tomorrow.");
      return;
    }

    setIsGenerating(true);
    setGenerationStep(0);

    let rawContent = '';
    let uploadedFileRecord: StudyFileRecord | null = null;
    const effectiveSetId = `set-${Date.now()}`;

    // STEP 1: Secure Cloud Storage / Database Storage
    if (user?.id) {
      try {
        if (activeTab === 'upload' && file) {
          uploadedFileRecord = await uploadStudyFile(user.id, file, effectiveSetId);
        } else if (activeTab === 'url') {
          await createExternalUrlRecord(user.id, externalUrl.trim(), title.trim() || 'External Document', effectiveSetId);
        } else if (activeTab === 'paste') {
          await createStudyNoteRecord(user.id, title.trim() || 'Manual Study Notes', pastedText.trim(), effectiveSetId);
        }
      } catch (storageErr) {
        console.warn('Storage preservation warning:', storageErr);
      }
    }

    setGenerationStep(1);

    // STEP 2: Extract text from document / notes / URL
    try {
      if (activeTab === 'upload' && file) {
        rawContent = await extractTextFromDocument(file);
      } else if (activeTab === 'url') {
        rawContent = `Reference Document: ${title.trim() || 'Online Study Material'}\nSource URL: ${externalUrl}\nTopic: ${category}\nComprehensive review of examination terms, operational guidelines, and foundational principles.`;
      } else {
        rawContent = pastedText.trim();
      }
    } catch (err: any) {
      console.error('File extraction error:', err);
      setIsGenerating(false);
      setFileError(err?.message || 'Could not extract text from this document. Please ensure it has readable text.');
      return;
    }

    if (!rawContent || rawContent.trim().length < 15) {
      setIsGenerating(false);
      setFileError('The document contains too little readable text to generate study materials.');
      return;
    }

    setGenerationStep(2);

    // STEP 3: AI Generation
    try {
      const activeApiKey = apiKey.trim() || (typeof window !== 'undefined' ? localStorage.getItem('chobee_gemini_api_key') || undefined : undefined) || import.meta.env.VITE_GEMINI_API_KEY;
      const options: GenerationOptions = {
        title: title.trim() || (activeTab === 'upload' && file ? file.name.replace(/\.[^/.]+$/, '') : activeTab === 'url' ? 'Web Document Reviewer' : 'Lecture Notes Reviewer'),
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

      setGenerationStep(3);

      setTimeout(() => {
        // STEP 4: Build StudySet and link to storage records
        const fullSet: StudySet = {
          ...generated,
          id: effectiveSetId,
          fileName: activeTab === 'upload' && file ? file.name : undefined,
          fileType: activeTab === 'upload' && file ? file.name.split('.').pop()?.toUpperCase() : (activeTab === 'url' ? 'URL' : 'NOTES'),
          fileId: uploadedFileRecord ? uploadedFileRecord.id : undefined,
          storagePath: uploadedFileRecord?.storagePath || undefined,
          sourceType: activeTab === 'upload' ? 'upload' : (activeTab === 'url' ? 'external_url' : 'manual_notes'),
          sourceUrl: activeTab === 'url' ? externalUrl.trim() : undefined,
          userId: user?.id,
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
              Create New Study Reviewer
            </h2>
            <p className="text-xs text-chobee-pink-600 font-semibold">
              PDF, DOCX, PPTX, Web URL, or Notes • Stored securely in Supabase Cloud
            </p>
          </div>
        </div>

        {/* GENERATION IN PROGRESS STATE */}
        {isGenerating ? (
          <div className="py-12 px-4 text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-pink-200 border-t-chobee-pink-500 animate-spin" />
              <span className="text-3xl animate-bounce">📚</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-bold text-chobee-navy-900 font-display">
                {loadingSteps[generationStep]}
              </h3>
              <p className="text-xs text-chobee-navy-700/60">
                Processing your materials with AI • Generating flashcards, quiz, and summary...
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
            {/* 3 Distinct Source Tabs */}
            <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  if (soundEnabled) playHapticTap();
                  setActiveTab('upload');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all active:scale-98 flex items-center justify-center gap-1.5 ${
                  activeTab === 'upload'
                    ? 'bg-white text-chobee-pink-600 shadow-xs'
                    : 'text-slate-600 hover:text-chobee-navy-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Document</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (soundEnabled) playHapticTap();
                  setActiveTab('url');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all active:scale-98 flex items-center justify-center gap-1.5 ${
                  activeTab === 'url'
                    ? 'bg-white text-chobee-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-chobee-navy-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Document URL</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (soundEnabled) playHapticTap();
                  setActiveTab('paste');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all active:scale-98 flex items-center justify-center gap-1.5 ${
                  activeTab === 'paste'
                    ? 'bg-white text-purple-600 shadow-xs'
                    : 'text-slate-600 hover:text-chobee-navy-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Direct Notes</span>
              </button>
            </div>

            {/* TAB 1: Upload Document Area */}
            {activeTab === 'upload' && (
              <div className="space-y-2">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-6 sm:p-7 text-center cursor-pointer transition-all active:scale-[0.99] ${
                    file
                      ? 'border-emerald-300 bg-emerald-50/50'
                      : 'border-pink-200 hover:border-chobee-pink-400 bg-pink-50/40'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.md,.csv"
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-soft-pink mx-auto flex items-center justify-center text-chobee-pink-500 mb-2">
                    {file ? <FileCheck className="w-6 h-6 text-emerald-600" /> : <Upload className="w-6 h-6" />}
                  </div>

                  {file ? (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-chobee-navy-900 truncate max-w-sm mx-auto">{file.name}</p>
                      <p className="text-xs text-emerald-600 font-semibold">
                        ✓ Ready for storage & synthesis ({(file.size / (1024 * 1024)).toFixed(2)} MB) • Click to replace
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-chobee-navy-900">
                        Tap or drag your study document here
                      </p>
                      <p className="text-xs text-chobee-navy-700/60">
                        Supports PDF, Word (DOCX), PowerPoint (PPTX), TXT, Markdown (Max 50MB)
                      </p>
                    </div>
                  )}
                </div>

                {fileError && (
                  <p className="text-xs font-bold text-rose-600 px-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{fileError}</span>
                  </p>
                )}

                <div className="flex items-center gap-1.5 px-1 text-[11px] text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-chobee-blue-500" />
                  <span>Your file is stored in your private Supabase Storage folder (`study-files/{user?.id || 'guest'}/...`).</span>
                </div>
              </div>
            )}

            {/* TAB 2: Document / PDF URL Area */}
            {activeTab === 'url' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-chobee-navy-800">
                  Online Document or PDF URL
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://example.edu/syllabus.pdf or https://..."
                    className="w-full pl-9 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-xs font-semibold text-chobee-navy-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-chobee-blue-400"
                  />
                  <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>

                {urlError && (
                  <p className="text-xs font-bold text-rose-600 px-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{urlError}</span>
                  </p>
                )}

                <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200/80 text-[11px] text-chobee-blue-900 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-chobee-blue-600" />
                    <span>External Reference Tracking</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    The external document URL is recorded separately in your cloud metadata without modifying the remote origin.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: Direct Notes Area */}
            {activeTab === 'paste' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-chobee-navy-800">
                    Type or Paste Study Notes
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {pastedText.length} characters
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste lecture text, syllabus sections, committee notes, or book chapters..."
                  className="w-full p-3.5 rounded-2xl border border-slate-200 bg-white text-xs text-chobee-navy-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <p className="text-[11px] text-slate-500 px-1">
                  Manual notes are stored directly in your cloud database without creating unnecessary disk files.
                </p>
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
                  placeholder="e.g. Tourism Law & Accounting Midterms"
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
                  <span>Reviewer Preferences</span>
                </span>
                <span className="text-[11px] text-chobee-pink-600 font-semibold">
                  Personalized Study Deck
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
                            ? 'bg-chobee-navy-900 text-white border-chobee-navy-900 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-pink-200'
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
                    <span className="text-[10px] text-chobee-pink-600 font-extrabold">5 to 50 max</span>
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
                            ? 'bg-gradient-to-r from-chobee-pink-500 to-rose-500 text-white border-pink-500 shadow-soft-pink'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-pink-200'
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
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-chobee-navy-800"
                >
                  <option value="Taglish">Taglish (Student Friendly 🌸)</option>
                  <option value="English">English (Formal / Professional)</option>
                  <option value="Tagalog">Tagalog (Formal)</option>
                </select>
              </div>
            </div>

            {/* AI Engine Status & Key Management */}
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${apiKey.trim().startsWith('AIzaSy') ? 'bg-emerald-500 shadow-xs shadow-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span className="font-extrabold text-chobee-navy-900">
                    Engine: {apiKey.trim().startsWith('AIzaSy') ? 'Google Gemini AI (100% High-Yield College Accuracy)' : 'Offline Smart Parser (Document-Grounded)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApiSettings(!showApiSettings)}
                  className="text-[11px] font-bold text-chobee-pink-600 hover:text-chobee-pink-700 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Key className="w-3 h-3" />
                  <span>{showApiSettings ? 'Hide' : 'Gemini Key (Free)'}</span>
                </button>
              </div>

              {showApiSettings && (
                <div className="pt-2 border-t border-slate-200/80 space-y-2">
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Para sa pinakamatalinong mock exam at quizzes na akmang-akma sa exam niyo, maglagay ng Google Gemini API Key mula sa Google AI Studio (100% Free).
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-chobee-pink-600 font-bold hover:underline inline-flex items-center gap-0.5 ml-1"
                    >
                      <span>Kumuha ng libreng key</span>
                      <ExternalLink className="w-3 h-3 inline" />
                    </a>
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="Paste key starting with AIzaSy..."
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        setKeyValidationStatus(null);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-mono text-chobee-navy-900 focus:outline-none focus:ring-2 focus:ring-chobee-pink-400"
                    />
                    <button
                      type="button"
                      onClick={handleTestAndSaveKey}
                      disabled={testingKey}
                      className="px-3 py-1.5 rounded-xl bg-chobee-navy-900 hover:bg-slate-800 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {testingKey ? 'Testing...' : 'Verify & Save'}
                    </button>
                  </div>

                  {keyValidationStatus && (
                    <p className={`text-[11px] font-bold px-1 flex items-center gap-1 ${keyValidationStatus.valid ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {keyValidationStatus.valid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      <span>{keyValidationStatus.message}</span>
                    </p>
                  )}
                </div>
              )}
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
                (activeTab === 'upload' ? !file : activeTab === 'url' ? (!externalUrl.trim() || Boolean(urlError)) : !pastedText.trim()) ||
                (Boolean(user) && !hasEnoughTokens)
              }
              className={`w-full py-3.5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-soft-pink transition-all active:scale-[0.97] ${
                (activeTab === 'upload' ? Boolean(file) : activeTab === 'url' ? (Boolean(externalUrl.trim()) && !urlError) : Boolean(pastedText.trim())) && (!user || hasEnoughTokens)
                  ? 'bg-gradient-to-r from-chobee-pink-500 to-chobee-blue-500 hover:from-chobee-pink-600 hover:to-chobee-blue-600 text-white cursor-pointer'
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
