
import React, { useState } from 'react';
import { Scroll, Users, ArrowRight, Terminal, Map, ShieldCheck } from 'lucide-react';

interface IntroScreenProps {
  onStart: (teamName: string) => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onStart }) => {
  const [teamName, setTeamName] = useState('');
  const [step, setStep] = useState<1 | 2>(1); // 1: Story, 2: Login

  return (
    <div className="h-full w-full flex flex-col bg-slate-50 text-slate-800 relative overflow-hidden">
      {/* Background Grid Effect - Light Mode */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(13,148,136,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(13,148,136,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-white/50 pointer-events-none"></div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center relative z-10 max-w-2xl mx-auto w-full">
        
        {/* Header Logo */}
        <div className="mb-8 text-center">
            <div className="w-16 h-16 mx-auto bg-white border-2 border-teal-500 rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(20,184,166,0.2)] animate-pulse">
                <Map className="w-8 h-8 text-teal-600" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2 tracking-tight">
                永春陂地質調查
            </h1>
            <div className="text-xs font-mono text-teal-600 uppercase tracking-[0.3em]">Geological Survey</div>
        </div>

        {step === 1 ? (
          <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-white/80 backdrop-blur-md border border-slate-200 p-6 md:p-8 rounded-xl relative shadow-xl">
                {/* Decorative corners */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-teal-500"></div>
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-teal-500"></div>
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-teal-500"></div>
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-teal-500"></div>

                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <Scroll className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-bold text-amber-600">失落記憶</h2>
                </div>

                <div className="space-y-4 text-slate-600 font-sans leading-relaxed text-base text-justify">
                    <p>
                        村長在整理古老村史時，意外翻到一張泛黃的永春陂老照片。照片裡的山形、地貌、濕地樣貌都與現在不太相同，但卻看起來非常重要。
                    </p>
                    <p>
                        為了破解照片中的線索，村長召集了全村最聰明、最勇敢的 <strong className="text-teal-600">小小地質學家</strong> 前往實地調查。
                    </p>
                    <p>
                        同時，村長也請來村裡的智者（王老師）隨行協助，途中若遇到難題，智者會提供方向，但真正的謎題還是要靠你們解開——因為只有小小地質學家最會觀察大地、閱讀地形、解讀岩石。
                    </p>
                    <div className="bg-teal-50 p-4 border-l-2 border-teal-500 mt-6 rounded-r">
                        <p className="font-bold text-teal-700 mb-1">⚡ 你們的任務</p>
                        <p className="text-sm text-slate-600">走訪永春陂周邊的地形、地層與稜線，找回老照片中的秘密，拼出永春陂的地貌密碼！</p>
                    </div>
                </div>

                <button 
                    onClick={() => setStep(2)}
                    className="w-full mt-8 bg-teal-600 hover:bg-teal-500 text-white py-4 rounded-lg font-mono font-bold text-lg transition-all shadow-lg hover:shadow-teal-500/20 flex items-center justify-center gap-2 group"
                >
                    <span>ACCEPT MISSION</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md animate-in zoom-in-95 duration-300">
            <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-xl">
                <div className="text-center mb-6">
                    <ShieldCheck className="w-12 h-12 text-teal-600 mx-auto mb-2" />
                    <h2 className="text-xl font-mono font-bold text-slate-800">IDENTITY VERIFICATION</h2>
                    <p className="text-xs text-slate-400 font-mono mt-1">SECURE CHANNEL ESTABLISHED</p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-mono text-teal-600 uppercase block">Enter Team Designation</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <Users className="w-5 h-5" />
                            </div>
                            <input 
                                type="text" 
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                placeholder="TEAM NAME..."
                                className="w-full bg-slate-50 border border-slate-300 text-slate-800 px-10 py-3 font-mono rounded-lg focus:border-teal-500 focus:outline-none transition-colors uppercase placeholder-slate-400 focus:ring-1 focus:ring-teal-200"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && teamName.trim() && onStart(teamName)}
                            />
                        </div>
                    </div>

                    <button 
                        onClick={() => teamName.trim() && onStart(teamName)}
                        disabled={!teamName.trim()}
                        className="w-full bg-teal-600 disabled:bg-slate-200 disabled:text-slate-400 hover:bg-teal-500 text-white py-3 rounded-lg font-mono font-bold transition-all flex items-center justify-center gap-2 mt-4 shadow-md"
                    >
                        <Terminal className="w-4 h-4" />
                        INITIALIZE SYSTEM
                    </button>
                </div>
            </div>
            
            <div className="text-center mt-8 text-[10px] font-mono text-slate-400">
                SYSTEM VERSION 2.5.0 // COPYRIGHT © YONGCHUN GEOLAB
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
