
import React, { useState, useEffect, useCallback } from 'react';
import { Puzzle, AppView, PlayerStats, PuzzleProgress } from './types';
import { ImageEditor } from './components/ImageEditor';
import { GameMap } from './components/GameMap';
import { IntroScreen } from './components/IntroScreen';
import { EncyclopediaModal } from './components/EncyclopediaModal';
import { User, Satellite, Eye, EyeOff, LifeBuoy, BookOpen, X, Mountain, Pickaxe, Search, Info, Lock, ClipboardList, ChevronRight, CloudFog, MapPin, CheckCircle, AlertTriangle, Book } from 'lucide-react';

// Updated Puzzles with Real Coordinates around Yongchun Pi Wetland Park (Taipei)
const SAMPLE_PUZZLES: Puzzle[] = [
  {
    id: '1',
    title: 'Mission 01: 四獸山連線',
    description: '透過方位與地形觀察理解永春陂是被四獸山包圍的山谷窪地。',
    targetPromptHint: 'Overlay digital measurement grid on mountain peaks, visualize hydrological flow into the valley',
    difficulty: 'Novice',
    xpReward: 300, // Big Mission Reward
    rankRequirement: 'Cadet',
    lat: 25.032647652556317,
    lng: 121.58009862209747,
    fragmentId: 0,
    type: 'main',
    quiz: {
      question: "請對照Mapy，填入四獸山的高度",
      answer: "138,141,151,183"
    }
  },
  {
    id: '2',
    title: 'Mission 02: 岩層解密',
    description: '請先回答地質問題，驗證所在地層後，再進行岩層採樣分析。',
    targetPromptHint: '描述岩石特徵 (例如：羽毛狀節理)',
    difficulty: 'Geologist',
    xpReward: 300, // Big Mission Reward
    rankRequirement: 'Scout',
    lat: 25.028155021059753,
    lng: 121.57924699325368,
    fragmentId: 1,
    quiz: {
      question: "請問我們現在在哪一層？",
      answer: "南港層"
    },
    uploadInstruction: "請拍攝所收集到的砂岩照片，並描述它的樣子。例如：羽毛狀、貝殼狀、放射狀",
    type: 'main'
  },
  {
    id: '3',
    title: 'Mission 03: 等高線挑戰',
    description: '請打開Mapy並截圖，在截圖上畫出爬上永春崗平台的路線，同時觀察Mapy裡的等高線圖',
    targetPromptHint: 'Project holographic red contour lines onto the terrain, high density on steep slopes',
    difficulty: 'Expert',
    xpReward: 300, // Big Mission Reward
    rankRequirement: 'Ranger',
    lat: 25.029229726415355, 
    lng: 121.57698592023897,
    fragmentId: 2,
    quiz: {
      question: "爬完的感受？",
      answer: "等高線越密集，爬起來越累 或 稀疏→不累"
    },
    uploadInstruction: "上傳您的Mapy截圖，並繪製路線。",
    type: 'main'
  }
];

const SIDE_MISSIONS: Puzzle[] = [
  {
    id: 's1',
    title: '擋土牆獵人',
    description: '校園或步道周邊有許多保護邊坡的擋土牆。請尋找擋土牆，觀察其結構與排水狀況。良好的排水設施對於防止邊坡滑動至關重要。',
    targetPromptHint: 'Analyze retaining wall structure, highlight drainage holes in red, check for structural cracks',
    difficulty: 'Novice',
    xpReward: 50, // Per Photo Reward
    rankRequirement: 'Freelancer',
    lat: 0, // Location agnostic
    lng: 0,
    fragmentId: -1, // No fragment
    type: 'side',
    uploadInstruction: '請拍攝擋土牆正面照片，需清楚呈現排水設施或植生狀況。'
  }
];

const INITIAL_STATS: PlayerStats = {
  level: 1,
  currentXp: 0,
  nextLevelXp: 500,
  rank: '小小地質學家',
  mana: 75,
  maxMana: 100,
  sosCount: 1
};

// Placeholder map image - Replace with actual Yongchun Pi map URL
const TREASURE_MAP_IMAGE = "https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1000&auto=format&fit=crop";

const TUTORIAL_STEPS = [
    {
        title: "Navigation Protocol",
        desc: "The map is shrouded in 'Fog of War'. You must physically move to clear the fog and reveal geological anomalies.",
        icon: <CloudFog className="w-10 h-10 text-teal-600" />
    },
    {
        title: "Target Identification",
        desc: "Look for Mission Markers. Green is Novice, Amber is Geologist, Red is Expert. Tap them to begin field analysis.",
        icon: <MapPin className="w-10 h-10 text-amber-600" />
    },
    {
        title: "Field Equipment",
        desc: "Use the bottom menu to access 'Side Ops' (for extra XP) and the 'Archives' to track collected data fragments.",
        icon: <BookOpen className="w-10 h-10 text-indigo-600" />
    }
];

const App: React.FC = () => {
  // Start at INTRO instead of HOME
  const [view, setView] = useState<AppView>(AppView.INTRO);
  const [activePuzzle, setActivePuzzle] = useState<Puzzle | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats>(INITIAL_STATS);
  const [teamName, setTeamName] = useState<string>('UNIT-734'); // Default fallback
  const [isFogEnabled, setIsFogEnabled] = useState<boolean>(true);
  
  // UI States
  const [showManual, setShowManual] = useState<boolean>(false); // Info Button (Guide)
  const [showTreasureMap, setShowTreasureMap] = useState<boolean>(false); // Treasure Manual (Fragments)
  const [showSideMissions, setShowSideMissions] = useState<boolean>(false); // Side Missions Modal
  const [showEncyclopedia, setShowEncyclopedia] = useState<boolean>(false); // Encyclopedia Modal
  const [gpsStatus, setGpsStatus] = useState<'searching' | 'locked' | 'error'>('searching');
  
  // Tutorial States
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [tutorialStep, setTutorialStep] = useState<number>(0);

  // Game State
  const [collectedFragments, setCollectedFragments] = useState<number[]>([]);
  const [completedPuzzleIds, setCompletedPuzzleIds] = useState<string[]>([]);
  
  // Stored Answers
  const [puzzleProgress, setPuzzleProgress] = useState<Record<string, PuzzleProgress>>({});

  // Time State
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check for tutorial on first load of HOME view
  useEffect(() => {
    if (view === AppView.HOME) {
        const hasSeen = localStorage.getItem('hasSeenTutorial');
        if (!hasSeen) {
            setShowTutorial(true);
        }
    }
  }, [view]);

  // Helper to determine rank title
  const getRankTitle = (level: number) => {
      if (level <= 1) return "小小地質學家";
      if (level === 2) return "地形線索搜查員";
      if (level === 3) return "地質現象調查員";
      return "永春大地守護者";
  };

  const closeTutorial = () => {
      localStorage.setItem('hasSeenTutorial', 'true');
      setShowTutorial(false);
  };

  const nextTutorialStep = () => {
      if (tutorialStep < TUTORIAL_STEPS.length - 1) {
          setTutorialStep(prev => prev + 1);
      } else {
          closeTutorial();
      }
  };

  const handlePuzzleSelect = (puzzle: Puzzle) => {
    setActivePuzzle(puzzle);
    setView(AppView.EDITOR);
    setShowSideMissions(false);
  };

  // +100 XP for answering a field correctly (Only for Main Missions)
  // Logic: XP is awarded once per field. Persistence prevents re-answering.
  const handleFieldSolved = () => {
      if (activePuzzle?.type === 'side') return;

      // Only grant XP if the mission isn't fully completed yet to avoid double counting if UI logic fails
      if (activePuzzle && completedPuzzleIds.includes(activePuzzle.id)) return;

      setPlayerStats(prev => {
          const newXp = prev.currentXp + 100;
          const newLevel = Math.floor(newXp / 500) + 1; 
          return {
              ...prev,
              currentXp: newXp,
              level: newLevel,
              rank: getRankTitle(newLevel)
          };
      });
  };

  const handleImageComplete = (progressData?: PuzzleProgress) => {
    if (activePuzzle) {
        // Save Progress Data
        if (progressData) {
            setPuzzleProgress(prev => ({
                ...prev,
                [activePuzzle.id]: progressData
            }));
        }

        // Side Missions: Handled by handleSideMissionProgress for XP.
        // We DO NOT mark them as completed to allow unlimited repetition.
        if (activePuzzle.type === 'side') {
             setPuzzleProgress(prev => {
                 const newProg = { ...prev };
                 delete newProg[activePuzzle.id]; // Clear side mission progress to reset fields/images
                 return newProg;
             });
             setView(AppView.HOME);
             setActivePuzzle(null);
             return;
        }

        // Main Missions: Mark puzzle as completed (if not already)
        if (!completedPuzzleIds.includes(activePuzzle.id)) {
            setCompletedPuzzleIds(prev => [...new Set([...prev, activePuzzle.id])]);

            // Award Big Mission XP (+300)
            setPlayerStats(prev => {
                const newXp = prev.currentXp + activePuzzle.xpReward;
                const newLevel = Math.floor(newXp / 500) + 1; 
                return {
                    ...prev,
                    currentXp: newXp,
                    level: newLevel,
                    rank: getRankTitle(newLevel),
                    mana: Math.max(0, prev.mana - 15)
                };
            });
            
            // Collect Fragment (Only for Main Missions)
            if (activePuzzle.type !== 'side' && activePuzzle.fragmentId !== -1 && !collectedFragments.includes(activePuzzle.fragmentId)) {
                setCollectedFragments(prev => [...prev, activePuzzle.fragmentId]);
            }
        }

        // Return to map
        setView(AppView.HOME);
        setActivePuzzle(null);
    }
  };

  // Handles Saving State when User goes Back without completing
  const handleEditorBack = (progress?: PuzzleProgress) => {
    if (progress && activePuzzle) {
        setPuzzleProgress(prev => ({
            ...prev,
            [activePuzzle.id]: progress
        }));
    }
    setActivePuzzle(null);
    setView(AppView.HOME);
  };
  
  // Handler for side missions (XP only, unlimited)
  const handleSideMissionProgress = () => {
      if (activePuzzle && activePuzzle.type === 'side') {
           // UNLIMITED XP: Do NOT add to completedPuzzleIds
           // We just award the XP and let them do it again.

           // Award Side Mission Photo XP
           setPlayerStats(prev => {
            const newXp = prev.currentXp + activePuzzle.xpReward;
            const newLevel = Math.floor(newXp / 500) + 1; 
            return {
                ...prev,
                currentXp: newXp,
                level: newLevel,
                rank: getRankTitle(newLevel),
                mana: Math.max(0, prev.mana - 15) 
            };
        });
      }
  };

  const handleIntroStart = (name: string) => {
    setTeamName(name);
    setView(AppView.HOME);
  };
  
  const handleGpsStatusChange = useCallback((status: 'searching' | 'locked' | 'error') => {
      setGpsStatus(status);
  }, []);

  return (
    <div className="h-screen w-screen bg-slate-50 text-slate-900 overflow-hidden flex flex-col font-sans">
      
      {/* View Router */}
      {view === AppView.INTRO && (
        <IntroScreen onStart={handleIntroStart} />
      )}

      {view === AppView.HOME && (
        <>
            {/* Header / HUD */}
            <div className="absolute top-0 left-0 right-0 z-[500] p-4 pointer-events-none">
                <div className="flex justify-between items-start">
                    
                    {/* Player Info Card */}
                    <div className="bg-white/90 backdrop-blur border border-slate-200 p-3 rounded-lg pointer-events-auto shadow-lg">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center border border-teal-200">
                                <User className="w-6 h-6 text-teal-600" />
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 font-mono">{getRankTitle(playerStats.level)}</div>
                                <div className="font-bold font-mono text-teal-700 uppercase">{teamName}</div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            {/* XP Display: Modulo 500 for current level progress */}
                            <div className="flex justify-between text-[10px] font-mono text-slate-500">
                                <span>LVL {playerStats.level}</span>
                                <span>{playerStats.currentXp % 500} / 500 XP</span>
                            </div>
                            <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-teal-500" 
                                    style={{ width: `${(playerStats.currentXp % 500) / 500 * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* System Status / Time */}
                    <div className="flex flex-col items-end gap-2 pointer-events-auto">
                        <div className={`backdrop-blur border px-3 py-1 rounded-full flex items-center gap-2 shadow-sm transition-colors ${
                            gpsStatus === 'locked' ? 'bg-teal-50/90 border-teal-200' : 
                            gpsStatus === 'error' ? 'bg-rose-50/90 border-rose-200' : 'bg-amber-50/90 border-amber-200'
                        }`}>
                             {gpsStatus === 'error' ? (
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                             ) : (
                                <Satellite className={`w-3 h-3 ${gpsStatus === 'locked' ? 'text-teal-600' : 'text-amber-600 animate-pulse'}`} />
                             )}
                             
                             <span className={`text-xs font-mono font-bold ${
                                 gpsStatus === 'locked' ? 'text-teal-700' : 
                                 gpsStatus === 'error' ? 'text-rose-700' : 'text-amber-700'
                             }`}>
                                {gpsStatus === 'locked' ? 'GPS LOCKED' : gpsStatus === 'error' ? 'GPS OFFLINE' : 'SEARCHING...'}
                             </span>
                             
                             <span className="text-xs font-mono text-slate-400 border-l border-slate-300 pl-2">
                                {currentTime.toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit', hour12: false})}
                             </span>
                        </div>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setIsFogEnabled(!isFogEnabled)}
                                className={`p-2 rounded-full border transition-colors shadow-sm ${isFogEnabled ? 'bg-white border-slate-300 text-slate-400' : 'bg-teal-50 border-teal-200 text-teal-600'}`}
                            >
                                {isFogEnabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button 
                                onClick={() => setShowManual(true)}
                                className="p-2 bg-white border border-slate-300 text-slate-500 rounded-full hover:text-teal-600 hover:border-teal-300 transition-colors shadow-sm"
                            >
                                <Info className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Map Layer */}
            <GameMap 
                puzzles={SAMPLE_PUZZLES} 
                onPuzzleSelect={handlePuzzleSelect}
                fogEnabled={isFogEnabled}
                onGpsStatusChange={handleGpsStatusChange}
                completedPuzzleIds={completedPuzzleIds}
            />

            {/* Bottom HUD */}
            <div className="absolute bottom-6 left-6 z-[500] flex flex-col gap-3">
                 {/* Encyclopedia Button */}
                 <button 
                    onClick={() => setShowEncyclopedia(true)}
                    className="group relative bg-white/90 backdrop-blur border border-teal-200 p-3 rounded-lg hover:bg-teal-50 transition-all hover:scale-105 active:scale-95 shadow-lg"
                 >
                    <Book className="w-6 h-6 text-teal-600 group-hover:text-teal-700" />
                    <span className="sr-only">Encyclopedia</span>
                 </button>

                 {/* Side Missions Button */}
                 <button 
                    onClick={() => setShowSideMissions(true)}
                    className="group relative bg-white/90 backdrop-blur border border-indigo-200 p-3 rounded-lg hover:bg-indigo-50 transition-all hover:scale-105 active:scale-95 shadow-lg"
                 >
                    <div className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {SIDE_MISSIONS.length}
                    </div>
                    <ClipboardList className="w-6 h-6 text-indigo-600 group-hover:text-indigo-700" />
                    <span className="sr-only">Side Missions</span>
                 </button>

                 {/* Fragments Button */}
                 <button 
                    onClick={() => setShowTreasureMap(true)}
                    className="group relative bg-white/90 backdrop-blur border border-amber-200 p-3 rounded-lg hover:bg-amber-50 transition-all hover:scale-105 active:scale-95 shadow-lg"
                 >
                    <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">
                        {collectedFragments.length}/3
                    </div>
                    <BookOpen className="w-6 h-6 text-amber-500 group-hover:text-amber-600" />
                    <span className="sr-only">Open Field Manual</span>
                 </button>
            </div>

            {/* One-Time Tutorial Overlay */}
            {showTutorial && (
                <div className="absolute inset-0 z-[2000] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-slate-200 relative overflow-hidden flex flex-col items-center text-center">
                        <button 
                            onClick={closeTutorial} 
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-slate-100">
                            {TUTORIAL_STEPS[tutorialStep].icon}
                        </div>
                        
                        <h3 className="text-xl font-bold font-mono text-slate-800 mb-2">
                            {TUTORIAL_STEPS[tutorialStep].title}
                        </h3>
                        
                        <p className="text-sm text-slate-600 mb-8 px-2 min-h-[60px]">
                            {TUTORIAL_STEPS[tutorialStep].desc}
                        </p>
                        
                        <div className="flex items-center justify-between w-full mt-auto">
                            <div className="flex gap-1">
                                {TUTORIAL_STEPS.map((_, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`w-2 h-2 rounded-full transition-colors ${idx === tutorialStep ? 'bg-teal-600' : 'bg-slate-200'}`}
                                    />
                                ))}
                            </div>
                            
                            <button 
                                onClick={nextTutorialStep}
                                className="bg-teal-600 hover:bg-teal-500 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all flex items-center gap-2"
                            >
                                {tutorialStep === TUTORIAL_STEPS.length - 1 ? (
                                    <>START <CheckCircle className="w-4 h-4" /></>
                                ) : (
                                    <>NEXT <ChevronRight className="w-4 h-4" /></>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Encyclopedia Modal */}
            {showEncyclopedia && (
              <EncyclopediaModal 
                onClose={() => setShowEncyclopedia(false)} 
                completedPuzzleIds={completedPuzzleIds}
              />
            )}

            {/* Manual Modal */}
            {showManual && (
                <div className="absolute inset-0 z-[1000] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white border border-slate-200 w-full max-w-md rounded-xl shadow-2xl overflow-hidden relative">
                         <button 
                            onClick={() => setShowManual(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="p-6">
                            <h2 className="text-xl font-bold font-mono text-teal-700 mb-4 flex items-center gap-2">
                                <LifeBuoy className="w-5 h-5" /> FIELD GUIDE
                            </h2>
                            <ul className="space-y-3 text-sm text-slate-600 font-mono">
                                <li className="flex items-start gap-2">
                                    <div className="mt-1 min-w-[6px] h-1.5 rounded-full bg-teal-500"></div>
                                    Navigate the map to find anomalies (Markers).
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="mt-1 min-w-[6px] h-1.5 rounded-full bg-teal-500"></div>
                                    <span className="text-slate-400 font-bold">[FOG PROTOCOL]</span> Visibility is limited. You must physically move closer to anomalies to engage them.
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="mt-1 min-w-[6px] h-1.5 rounded-full bg-teal-500"></div>
                                    Use the "Gemini Lens" (Camera) to scan targets and reveal hidden geological data.
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="mt-1 min-w-[6px] h-1.5 rounded-full bg-teal-500"></div>
                                    Collect all 3 data fragments to unlock the "Lost Memory" of Yongchun Pi.
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Side Missions Modal */}
            {showSideMissions && (
                <div className="absolute inset-0 z-[1000] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white border border-indigo-100 w-full max-w-md rounded-xl shadow-2xl overflow-hidden relative flex flex-col max-h-[80vh]">
                         <div className="p-4 border-b border-indigo-100 bg-indigo-50/50 flex justify-between items-center">
                            <h2 className="text-lg font-bold font-mono text-indigo-700 flex items-center gap-2">
                                <ClipboardList className="w-5 h-5" /> 支線任務
                            </h2>
                            <button onClick={() => setShowSideMissions(false)} className="text-slate-400 hover:text-indigo-700">
                                <X className="w-5 h-5" />
                            </button>
                         </div>
                         
                         <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                            {SIDE_MISSIONS.map(mission => (
                                <div key={mission.id} className="bg-white border border-slate-200 p-4 rounded-lg hover:border-indigo-400 hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-slate-800 font-mono">{mission.title}</h3>
                                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 font-mono">
                                            {mission.xpReward} XP
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 mb-4">{mission.description}</p>
                                    <button 
                                        onClick={() => handlePuzzleSelect(mission)}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded text-sm font-mono font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                                    >
                                        START MISSION <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                         </div>
                    </div>
                </div>
            )}

            {/* Treasure Map / Fragments Modal */}
            {showTreasureMap && (
                <div className="absolute inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in zoom-in-95 duration-300">
                    <div className="w-full max-w-2xl bg-white border border-amber-200 rounded-lg overflow-hidden flex flex-col max-h-[80vh] shadow-2xl">
                         <div className="p-4 border-b border-amber-100 flex justify-between items-start bg-amber-50">
                            <div>
                                <h2 className="text-lg font-bold font-mono text-amber-700 flex items-center gap-2">
                                    <Mountain className="w-5 h-5" /> 尋寶手冊
                                </h2>
                                <p className="text-xs text-amber-600/80 font-mono mt-1 ml-7">過關收集到的碎片存放於此</p>
                            </div>
                            <button onClick={() => setShowTreasureMap(false)} className="text-slate-400 hover:text-amber-800">
                                <X className="w-5 h-5" />
                            </button>
                         </div>
                         
                         <div className="flex-1 overflow-y-auto p-6 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* The Map Image with Overlay */}
                                <div className="relative aspect-square bg-slate-100 rounded-lg border-2 border-slate-200 overflow-hidden group shadow-inner">
                                    {/* Grayscale filter until completed */}
                                    <img 
                                        src={TREASURE_MAP_IMAGE} 
                                        alt="Old Map" 
                                        className={`w-full h-full object-cover transition-all duration-1000 ${collectedFragments.length === 3 ? 'grayscale-0 sepia' : 'grayscale opacity-50 blur-[2px]'}`} 
                                    />
                                    
                                    {collectedFragments.length < 3 && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="bg-white/80 p-4 rounded backdrop-blur-sm text-center border border-slate-300 shadow-lg">
                                                <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                                <p className="text-xs font-mono text-slate-500">DATA FRAGMENTED</p>
                                                <p className="text-xl font-bold text-slate-800 font-mono">{collectedFragments.length} / 3</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Fragment Indicators */}
                                    <div className="absolute top-2 left-2 flex gap-1">
                                        {[0, 1, 2].map(id => (
                                            <div key={id} className={`w-2 h-2 rounded-full ${collectedFragments.includes(id) ? 'bg-amber-500 shadow-md' : 'bg-slate-300'}`}></div>
                                        ))}
                                    </div>
                                </div>

                                {/* Text / Lore */}
                                <div className="space-y-4">
                                    <h3 className="text-teal-700 font-mono text-sm border-b border-slate-200 pb-2">碎片紀錄</h3>
                                    
                                    {collectedFragments.length === 0 ? (
                                        <p className="text-slate-400 text-sm font-mono italic">尚未收集到資料。請開始實地調查。</p>
                                    ) : (
                                        <ul className="space-y-3">
                                            {collectedFragments.includes(0) && (
                                                <li className="bg-teal-50 p-3 rounded border-l-4 border-teal-500 animate-in slide-in-from-right duration-300">
                                                    <div className="text-xs text-teal-700 font-bold mb-1">FRAGMENT #01</div>
                                                    <p className="text-sm text-slate-700">"The four beasts guard the valley. Their peaks form a natural basin..."</p>
                                                </li>
                                            )}
                                            {collectedFragments.includes(1) && (
                                                <li className="bg-amber-50 p-3 rounded border-l-4 border-amber-500 animate-in slide-in-from-right duration-500">
                                                    <div className="text-xs text-amber-700 font-bold mb-1">FRAGMENT #02</div>
                                                    <p className="text-sm text-slate-700">"The Nangang sandstone layers reveal a shallow marine past. Feather-like patterns suggest ancient currents."</p>
                                                </li>
                                            )}
                                            {collectedFragments.includes(2) && (
                                                <li className="bg-purple-50 p-3 rounded border-l-4 border-purple-500 animate-in slide-in-from-right duration-700">
                                                    <div className="text-xs text-purple-700 font-bold mb-1">FRAGMENT #03</div>
                                                    <p className="text-sm text-slate-700">"Steep slopes protect the hidden reservoir. The ridges tell the story of collision."</p>
                                                </li>
                                            )}
                                        </ul>
                                    )}
                                    
                                    {collectedFragments.length === 3 && (
                                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm font-mono animate-pulse shadow-sm">
                                            >> COMPLETE DATASET ACQUIRED. 
                                            <br/>>> HISTORICAL RECONSTRUCTION AVAILABLE.
                                        </div>
                                    )}
                                </div>
                            </div>
                         </div>
                    </div>
                </div>
            )}
        </>
      )}

      {view === AppView.EDITOR && activePuzzle && (
        <ImageEditor 
            activePuzzle={activePuzzle} 
            onBack={handleEditorBack} 
            onComplete={handleImageComplete}
            onSideMissionProgress={handleSideMissionProgress}
            onFieldSolved={handleFieldSolved}
            initialState={puzzleProgress[activePuzzle.id]}
            isCompleted={completedPuzzleIds.includes(activePuzzle.id)}
        />
      )}

    </div>
  );
};

export default App;
