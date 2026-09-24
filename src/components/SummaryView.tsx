import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Printer, 
  BookOpen, 
  BrainCircuit, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Sparkles,
  Share2,
  Download,
  ExternalLink,
  Globe,
  FileCheck
} from 'lucide-react';
import { StudySet } from '../types/study';
import { getSignedFileUrl } from '../services/fileStorageService';

interface SummaryViewProps {
  studySet: StudySet;
  onSwitchMode: (mode: 'flashcards' | 'quiz' | 'dashboard') => void;
  onOpenShare: (set: StudySet) => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  studySet,
  onSwitchMode,
  onOpenShare,
}) => {
  const { summary } = studySet;
  const [expandedExamIndex, setExpandedExamIndex] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const toggleExamAnswer = (idx: number) => {
    setExpandedExamIndex((prev) => (prev === idx ? null : idx));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadOriginalFile = async () => {
    if (!studySet.storagePath) return;
    setIsDownloading(true);
    try {
      const signedUrl = await getSignedFileUrl(studySet.storagePath, 3600);
      if (signedUrl) {
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
      } else {
        alert('Could not generate download link. Please ensure you are logged in and have access to this document.');
      }
    } catch (e) {
      console.warn('Download error:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSwitchMode('dashboard')}
              className="text-xs font-semibold text-chobee-navy-700/60 hover:text-chobee-pink-600 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
            <span className="text-xs text-slate-300">•</span>
            <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
              Structured Study Guide
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-chobee-navy-900 font-display mt-1">
            {studySet.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onSwitchMode('flashcards')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-chobee-pink-600 font-bold text-xs border border-pink-200 transition-colors"
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>Flashcards ({studySet.flashcards.length})</span>
          </button>

          <button
            onClick={() => onSwitchMode('quiz')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-chobee-blue-600 font-bold text-xs border border-blue-200 transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Practice Quiz</span>
          </button>

          <button
            onClick={handlePrint}
            title="Print or Export Study Guide"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-chobee-navy-800 font-bold text-xs shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print Guide</span>
          </button>

          <button
            onClick={() => onOpenShare(studySet)}
            title="Share with Classmates"
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Printable Document Sheet */}
      <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-purple-200/80 shadow-card space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="border-b border-slate-200 pb-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-chobee-pink-600">
              Mayor Cia • Official Study Guide
            </span>
            <span className="text-xs text-chobee-navy-700/60">
              Synthesized by Baby Bear Chobee 🧸🩵
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-chobee-navy-900 font-display">
            {studySet.title}
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <p className="text-xs text-chobee-navy-700/70">
              Subject Category: <span className="font-semibold text-chobee-navy-900">{studySet.category}</span> • 
              Source: <span className="italic font-medium text-chobee-navy-900">
                {studySet.sourceType === 'upload' 
                  ? (studySet.fileName || 'Uploaded Document')
                  : studySet.sourceType === 'external_url'
                  ? 'External Web Reference'
                  : 'Manual Study Notes'}
              </span>
            </p>

            {/* Source Action Buttons */}
            <div className="flex items-center gap-2 print:hidden">
              {studySet.storagePath && (
                <button
                  type="button"
                  onClick={handleDownloadOriginalFile}
                  disabled={isDownloading}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-chobee-blue-700 text-xs font-bold transition-all shadow-2xs active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isDownloading ? 'Generating Link...' : 'Download Original File'}</span>
                </button>
              )}

              {studySet.sourceUrl && (
                <a
                  href={studySet.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-bold transition-all shadow-2xs active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Source URL</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Executive Overview Section */}
        <section className="space-y-3">
          <h3 className="text-base font-extrabold text-chobee-navy-900 font-display flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-chobee-pink-500" />
            <span>Executive Overview</span>
          </h3>
          <div className="p-5 rounded-2xl bg-gradient-to-r from-pink-50/50 via-white to-blue-50/50 border border-pink-100 text-sm text-chobee-navy-800 leading-relaxed">
            {summary.overview || studySet.description}
          </div>
        </section>

        {/* Key Concepts Breakdown */}
        {summary.keyConcepts && summary.keyConcepts.length > 0 && (
          <section className="space-y-4">
            <h3 className="text-base font-extrabold text-chobee-navy-900 font-display flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-chobee-blue-500" />
              <span>Key Concepts & Principles</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summary.keyConcepts.map((concept, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2.5"
                >
                  <h4 className="text-sm font-bold text-chobee-navy-900 font-display">
                    {concept.title}
                  </h4>
                  <p className="text-xs text-chobee-navy-700 leading-relaxed">
                    {concept.explanation}
                  </p>
                  {concept.keyPoints && concept.keyPoints.length > 0 && (
                    <ul className="space-y-1.5 pt-1">
                      {concept.keyPoints.map((point, pIdx) => (
                        <li key={pIdx} className="text-xs text-chobee-navy-800 flex items-start gap-2">
                          <span className="text-chobee-pink-500 font-bold shrink-0">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Structured Terminology Glossary */}
        {summary.glossary && summary.glossary.length > 0 && (
          <section className="space-y-4">
            <h3 className="text-base font-extrabold text-chobee-navy-900 font-display flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              <span>Terminology Glossary & Definitions</span>
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-chobee-navy-800 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-1/3">Term</th>
                    <th className="py-3 px-4">Definition & Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.glossary.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-chobee-pink-600 align-top">
                        {item.term}
                      </td>
                      <td className="py-3 px-4 text-chobee-navy-800 leading-relaxed">
                        {item.definition}
                        {item.example && (
                          <div className="text-[11px] text-slate-500 italic mt-0.5">
                            Ex: {item.example}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Possible Exam Questions with Expandable Answers */}
        {summary.examQuestions && summary.examQuestions.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-chobee-navy-900 font-display flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>High-Yield "Possible Exam Questions"</span>
              </h3>
              <span className="text-xs text-slate-400 print:hidden">Click to test yourself</span>
            </div>

            <div className="space-y-3">
              {summary.examQuestions.map((q, idx) => {
                const isExpanded = expandedExamIndex === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs"
                  >
                    <button
                      onClick={() => toggleExamAnswer(idx)}
                      className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200">
                          {idx + 1}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-chobee-navy-900">
                          {q.question}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {q.difficulty}
                        </span>
                        <div className="print:hidden">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>
                    </button>

                    {(isExpanded || typeof window !== 'undefined' && window.matchMedia('print').matches) && (
                      <div className="p-4 bg-emerald-50/50 border-t border-slate-100 text-xs text-chobee-navy-800 leading-relaxed animate-fadeIn">
                        <span className="font-bold text-emerald-700 block mb-1">Model Answer:</span>
                        <p className="whitespace-pre-line">{q.modelAnswer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
