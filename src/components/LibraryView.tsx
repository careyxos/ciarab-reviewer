import React, { useState } from 'react';
import { 
  Search, 
  Layers, 
  CheckCircle2, 
  FileText, 
  BrainCircuit, 
  Share2, 
  Trash2, 
  Star, 
  PlusCircle, 
  ArrowUpDown,
  Sparkles
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

  // Extract unique categories from studySets plus defaults
  const categories = Array.from(new Set(studySets.map((s) => s.category).filter(Boolean)));
  const allTags = ['All', 'Favorites', ...categories];

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">
            Study Materials
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse, review, and manage all your flashcard decks and study guides
          </p>
        </div>

        <button
          onClick={onOpenUpload}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all active:scale-95 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4 text-chobee-pink-400" />
          <span>Upload Notes / Create Set</span>
        </button>
      </div>

      {/* Search Bar & Tag Filter Pills */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search decks by title, topic, or keyword..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                selectedTag === tag
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tag === 'Favorites' ? '⭐ Favorites' : tag}
            </button>
          ))}

          <div className="flex items-center gap-1 ml-auto pl-2 border-l border-slate-200 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Sort study materials"
              className="bg-transparent text-xs font-semibold text-slate-600 focus:outline-none cursor-pointer"
            >
              <option value="recent">Recent</option>
              <option value="name">Title A-Z</option>
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
                className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-card transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                      {set.category}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onToggleFavorite(set.id)}
                        aria-label={set.isFavorite ? `Remove ${set.title} from favorites` : `Add ${set.title} to favorites`}
                        className={`p-1.5 rounded-lg transition-colors ${
                          set.isFavorite ? 'text-amber-500 fill-amber-400' : 'text-slate-300 hover:text-amber-400'
                        }`}
                      >
                        <Star className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onOpenShare(set)}
                        aria-label={`Share ${set.title} study set`}
                        title="Share study set"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      {!set.isPreset && (
                        <button
                          onClick={() => onDeleteSet(set.id)}
                          aria-label={`Delete custom reviewer ${set.title}`}
                          title="Delete Custom Reviewer"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-chobee-pink-600 transition-colors font-display line-clamp-1">
                      {set.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {set.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      {set.flashcards.length} Cards
                    </span>
                    <span className="font-semibold text-slate-700">{progressPct}% Mastered</span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-chobee-pink-500 to-chobee-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-5 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => onSelectSet(set, 'flashcards')}
                    className="flex items-center justify-center gap-1 py-2 rounded-xl bg-slate-50 hover:bg-chobee-pink-50 hover:text-chobee-pink-600 text-slate-700 font-bold text-xs transition-colors"
                  >
                    <BrainCircuit className="w-3.5 h-3.5" />
                    <span>Cards</span>
                  </button>

                  <button
                    onClick={() => onSelectSet(set, 'quiz')}
                    className="flex items-center justify-center gap-1 py-2 rounded-xl bg-slate-50 hover:bg-chobee-blue-50 hover:text-chobee-blue-600 text-slate-700 font-bold text-xs transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Quiz</span>
                  </button>

                  <button
                    onClick={() => onSelectSet(set, 'summary')}
                    className="flex items-center justify-center gap-1 py-2 rounded-xl bg-slate-50 hover:bg-purple-50 hover:text-purple-600 text-slate-700 font-bold text-xs transition-colors"
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
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
            📚
          </div>
          <p className="text-sm font-bold text-slate-700">No study materials match your search.</p>
          <p className="text-xs text-slate-400">Try adjusting your search or category filter</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedTag('All');
            }}
            className="mt-2 text-xs font-semibold text-chobee-pink-600 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};
