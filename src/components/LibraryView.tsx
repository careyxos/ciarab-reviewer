import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Layers, 
  CheckCircle2, 
  FileText, 
  BrainCircuit, 
  Share2, 
  Trash2, 
  Star, 
  PlusCircle, 
  ArrowUpDown 
} from 'lucide-react';
import { StudySet } from '../types/study';

interface LibraryViewProps {
  studySets: StudySet[];
  onSelectSet: (set: StudySet, mode: 'flashcards' | 'quiz' | 'summary') => void;
  onOpenUpload: () => void;
  onOpenShare: (set: StudySet) => void;
  onDeleteSet: (setId: string) => void;
  onToggleFavorite: (setId: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  studySets,
  onSelectSet,
  onOpenUpload,
  onOpenShare,
  onDeleteSet,
  onToggleFavorite,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'cards'>('recent');

  const allTags = ['All', 'Tourism', 'Accounting', 'Events', 'Favorites'];

  // Filter sets
  const filteredSets = studySets
    .filter((set) => {
      const matchesSearch =
        set.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        set.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        set.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;
      if (selectedTag === 'All') return true;
      if (selectedTag === 'Favorites') return !!set.isFavorite;
      return set.category === selectedTag || set.tags.includes(selectedTag);
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      if (sortBy === 'cards') return b.flashcards.length - a.flashcards.length;
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-chobee-navy-900 font-display">
            Materials Library
          </h1>
          <p className="text-xs text-chobee-navy-700/70">
            Browse, manage, and share all study reviewers for Mayor Cia & committee
          </p>
        </div>

        <button
          onClick={onOpenUpload}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-chobee-pink-500 to-chobee-blue-500 hover:from-chobee-pink-600 hover:to-chobee-blue-600 text-white font-bold text-xs shadow-soft-pink transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Upload New Reviewer</span>
        </button>
      </div>

      {/* Search Bar & Tag Filter Pills */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200/80">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reviewers by title, term, or tag..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-chobee-navy-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-chobee-pink-400"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedTag === tag
                  ? 'bg-chobee-pink-500 text-white shadow-xs'
                  : 'bg-white text-chobee-navy-700 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              {tag}
            </button>
          ))}

          <div className="flex items-center gap-1 ml-auto pl-2 border-l border-slate-200">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-slate-600 focus:outline-none"
            >
              <option value="recent">Recent</option>
              <option value="name">Name</option>
              <option value="cards">Most Cards</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Sets */}
      {filteredSets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSets.map((set) => {
            const masteredCount = set.flashcards.filter((c) => c.state === 'mastered').length;
            const progressPct =
              set.flashcards.length > 0 ? Math.round((masteredCount / set.flashcards.length) * 100) : 0;

            return (
              <div
                key={set.id}
                className="glass-panel rounded-2xl p-5 border border-slate-200/80 hover:border-pink-200 shadow-sm hover:shadow-card transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700">
                      {set.category}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onToggleFavorite(set.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          set.isFavorite ? 'text-amber-500 fill-amber-400' : 'text-slate-300 hover:text-amber-400'
                        }`}
                      >
                        <Star className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onOpenShare(set)}
                        title="Share study set with classmates"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-chobee-blue-600 transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      {!set.isPreset && (
                        <button
                          onClick={() => onDeleteSet(set.id)}
                          title="Delete Custom Reviewer"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-chobee-navy-900 group-hover:text-chobee-pink-600 transition-colors font-display line-clamp-1">
                      {set.title}
                    </h3>
                    <p className="text-xs text-chobee-navy-700/70 line-clamp-2 mt-1 leading-relaxed">
                      {set.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-chobee-navy-700/70 pt-2">
                    <span className="flex items-center gap-1 font-semibold">
                      <Layers className="w-3.5 h-3.5 text-chobee-pink-500" />
                      {set.flashcards.length} Cards
                    </span>
                    <span className="font-bold text-chobee-navy-900">{progressPct}% Mastered</span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-chobee-pink-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-5 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => onSelectSet(set, 'flashcards')}
                    className="flex items-center justify-center gap-1 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-chobee-pink-600 font-bold text-xs transition-colors"
                  >
                    <BrainCircuit className="w-3.5 h-3.5" />
                    <span>Study</span>
                  </button>

                  <button
                    onClick={() => onSelectSet(set, 'quiz')}
                    className="flex items-center justify-center gap-1 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-chobee-blue-600 font-bold text-xs transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Quiz</span>
                  </button>

                  <button
                    onClick={() => onSelectSet(set, 'summary')}
                    className="flex items-center justify-center gap-1 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Guide</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 glass-panel rounded-3xl border border-slate-200">
          <p className="text-sm font-semibold text-chobee-navy-700">No reviewers match your search.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedTag('All');
            }}
            className="mt-3 text-xs font-bold text-chobee-pink-600 underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
};
