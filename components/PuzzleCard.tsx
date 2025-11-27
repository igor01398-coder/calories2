
import React from 'react';
import { Puzzle } from '../types';
import { Map, Target, Crosshair, Zap, Trophy, Lock } from 'lucide-react';

interface PuzzleCardProps {
  puzzle: Puzzle;
  onSelect: (puzzle: Puzzle) => void;
}

export const PuzzleCard: React.FC<PuzzleCardProps> = ({ puzzle, onSelect }) => {
  
  const getBorderColor = () => {
    switch (puzzle.difficulty) {
      case 'Novice': return 'border-emerald-400 hover:border-emerald-500';
      case 'Geologist': return 'border-amber-400 hover:border-amber-500';
      case 'Expert': return 'border-rose-400 hover:border-rose-500';
      default: return 'border-slate-300';
    }
  };

  return (
    <button
      onClick={() => onSelect(puzzle)}
      className={`w-full text-left bg-white border-l-4 ${getBorderColor()} border-y border-r border-slate-200 p-0 group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}
    >
      {/* Pattern Effect - Subtle in light mode */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.02)_50%)] bg-[size:100%_4px] opacity-100 pointer-events-none"></div>

      <div className="p-4 relative z-10">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded border bg-white ${
                     puzzle.difficulty === 'Novice' ? 'border-emerald-200 text-emerald-600' :
                     puzzle.difficulty === 'Geologist' ? 'border-amber-200 text-amber-600' :
                     'border-rose-200 text-rose-600'
                }`}>
                    <Crosshair className="w-4 h-4" />
                </div>
                <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">
                    Rank: <span className="text-slate-800 font-bold">{puzzle.rankRequirement}</span>
                </span>
            </div>
            <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <Trophy className="w-3 h-3" />
                <span className="text-xs font-mono font-bold">{puzzle.xpReward} XP</span>
            </div>
          </div>

          <h3 className="text-lg font-bold font-mono text-slate-800 mb-2 group-hover:text-teal-600 transition-colors truncate">
            {puzzle.title}
          </h3>
          
          <p className="text-sm text-slate-600 mb-4 font-sans leading-relaxed border-l-2 border-slate-200 pl-3">
            {puzzle.description}
          </p>

          <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-teal-600 font-mono">
                <Target className="w-3 h-3" />
                <span>Target Profile Identified</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono group-hover:text-teal-500 transition-colors">
                Click to Initialize >>
            </span>
          </div>
      </div>
    </button>
  );
};
