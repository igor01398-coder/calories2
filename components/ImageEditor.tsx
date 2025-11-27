
import React, { useState, useRef, useEffect } from 'react';
import { editImageWithGemini, fileToGenerativePart } from '../services/geminiService';
import { Loader2, ArrowLeft, Upload, Camera, RefreshCw, Terminal, ChevronRight, CheckCircle, HelpCircle, AlertTriangle, ClipboardList, PartyPopper, Image as ImageIcon, ShieldCheck, Check } from 'lucide-react';
import { Puzzle, PuzzleProgress } from '../types';

interface ImageEditorProps {
  activePuzzle: Puzzle | null;
  onBack: (progress: PuzzleProgress) => void;
  onComplete?: (data?: PuzzleProgress) => void;
  onSideMissionProgress?: () => void;
  onFieldSolved?: () => void;
  initialState?: PuzzleProgress;
  isCompleted?: boolean;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ activePuzzle, onBack, onComplete, onSideMissionProgress, onFieldSolved, initialState, isCompleted }) => {
  const [originalImage, setOriginalImage] = useState<string | null>(null); // Base64
  const [resultImage, setResultImage] = useState<string | null>(null); // Base64
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Quiz State
  const [quizInput, setQuizInput] = useState<string>('');
  const [quizSelect1, setQuizSelect1] = useState<string>('');
  const [quizSelect2, setQuizSelect2] = useState<string>('');
  
  // Mission 1 State (Four Beasts)
  const [m1Heights, setM1Heights] = useState({ tiger: '', leopard: '', lion: '', elephant: '' });
  const [m1Reason, setM1Reason] = useState<string>('');
  const [m1Part1Solved, setM1Part1Solved] = useState(false);
  const [m1Part2Solved, setM1Part2Solved] = useState(false);
  const [m1Part1Error, setM1Part1Error] = useState(false);
  const [m1Part2Error, setM1Part2Error] = useState(false);

  const [isQuizSolved, setIsQuizSolved] = useState<boolean>(false);
  const [showQuizError, setShowQuizError] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set default prompt hint when puzzle loads
  useEffect(() => {
    if (activePuzzle) {
        setPrompt(activePuzzle.targetPromptHint);
        
        // Load Initial State if Available
        if (initialState) {
            if (initialState.m1Heights) setM1Heights(initialState.m1Heights);
            if (initialState.m1Reason) setM1Reason(initialState.m1Reason);
            if (initialState.quizInput) setQuizInput(initialState.quizInput);
            if (initialState.quizSelect1) setQuizSelect1(initialState.quizSelect1);
            if (initialState.quizSelect2) setQuizSelect2(initialState.quizSelect2);
            // Restore prompt/description
            if (initialState.imageDescription) setPrompt(initialState.imageDescription);
            // Restore image
            if (initialState.uploadedImage) setOriginalImage(initialState.uploadedImage);
            
            // Restore Solved States
            if (initialState.m1Part1Solved) setM1Part1Solved(true);
            if (initialState.m1Part2Solved) setM1Part2Solved(true);
            if (initialState.isQuizSolved) setIsQuizSolved(true);
        }

        // If Completed, force solved states
        if (isCompleted) {
             setIsQuizSolved(true);
             setM1Part1Solved(true);
             setM1Part2Solved(true);
             return; 
        }

        // Reset Quiz state when puzzle changes if NOT completed and NO initial state
        if (!initialState && activePuzzle.quiz) {
            setIsQuizSolved(false);
            setQuizInput('');
            // Default values for dropdowns
            setQuizSelect1('');
            setQuizSelect2('');
            // Reset Mission 1
            setM1Heights({ tiger: '', leopard: '', lion: '', elephant: '' });
            setM1Reason('');
            setM1Part1Solved(false);
            setM1Part2Solved(false);
            setM1Part1Error(false);
            setM1Part2Error(false);

            setShowQuizError(false);
        } else if (!activePuzzle.quiz) {
            // No quiz for this puzzle, auto-solve
            setIsQuizSolved(true);
        }
    } else {
        setPrompt('');
    }
  }, [activePuzzle, initialState, isCompleted]);

  // Handle Back Navigation with State Saving
  const handleBack = () => {
    const progress: PuzzleProgress = {
        m1Heights,
        m1Reason,
        quizInput,
        quizSelect1,
        quizSelect2,
        imageDescription: prompt,
        uploadedImage: originalImage,
        // Save Solved Flags
        m1Part1Solved,
        m1Part2Solved,
        isQuizSolved
    };
    onBack(progress);
  };

  const verifyM1Part1 = () => {
    const checkRange = (val: string, min: number, max: number) => {
        const num = parseInt(val.replace(/[^0-9]/g, ''));
        return !isNaN(num) && num >= min && num <= max;
    };
    // Ranges: Tiger: 135-145 (Aligned with map display 138), Leopard: 139-143, Lion: 147-153, Elephant: 180-188
    if (checkRange(m1Heights.tiger, 135, 145) && 
        checkRange(m1Heights.leopard, 139, 143) && 
        checkRange(m1Heights.lion, 147, 153) && 
        checkRange(m1Heights.elephant, 180, 188)) {
        
        setM1Part1Solved(true);
        setM1Part1Error(false);
        if (onFieldSolved) onFieldSolved();
        
        // Check if both parts are now solved
        if (m1Part2Solved) {
            setIsQuizSolved(true);
        }
    } else {
        setM1Part1Error(true);
    }
  };

  const verifyM1Part2 = () => {
    const r = m1Reason.trim();
    const hasHighConcept = r.includes('高') || r.includes('山');
    const hasLowConcept = r.includes('低') || r.includes('窪') || r.includes('水') || r.includes('凹');

    if (hasHighConcept && hasLowConcept) {
        setM1Part2Solved(true);
        setM1Part2Error(false);
        if (onFieldSolved) onFieldSolved();
        
        // Check if both parts are now solved
        if (m1Part1Solved) {
            setIsQuizSolved(true);
        }
    } else {
        setM1Part2Error(true);
    }
  };

  const handleQuizVerify = () => {
    if (!activePuzzle?.quiz) return;
    
    let isCorrect = false;

    // Mission 3 Logic: Dropdowns
    if (activePuzzle.id === '3') {
         // Allow both logic: Dense=Tired OR Sparse=Not Tired
         if ((quizSelect1 === '密集' && quizSelect2 === '累') || 
             (quizSelect1 === '稀疏' && quizSelect2 === '不累')) {
             isCorrect = true;
         }
    } else {
        // Standard Text Logic for Mission 2
        const input = quizInput.trim();
        const target = activePuzzle.quiz.answer;
        
        isCorrect = input === target || input.includes(target);

        // Rule for Mission 2: Accept "南港" in the answer
        if (activePuzzle.id === '2' && input.includes('南港')) {
            isCorrect = true;
        }
    }
    
    if (isCorrect) {
        setIsQuizSolved(true);
        setShowQuizError(false);
        if (onFieldSolved) onFieldSolved();
    } else {
        setShowQuizError(true);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await fileToGenerativePart(e.target.files[0]);
        setOriginalImage(base64);
        setResultImage(null);
        setError(null);
      } catch (err) {
        setError("Failed to load image.");
      }
    }
  };

  const handleGenerate = async () => {
    if (!originalImage || !prompt) return;

    setLoading(true);
    setError(null);

    try {
      const resultBase64 = await editImageWithGemini(originalImage, prompt);
      setResultImage(resultBase64);
    } catch (err: any) {
      setError(err.message || "Protocol Failed. Re-calibrate sensors.");
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = () => {
    if (isCompleted) return;
    fileInputRef.current?.click();
  };

  // Triggered when user clicks "Transmit Data" or manual pass
  const handlePreComplete = () => {
    setShowSuccessModal(true);
  };

  // Triggered when user clicks "Yay" in modal
  const handleFinalExit = () => {
    if (activePuzzle?.type === 'side' && onSideMissionProgress) {
        onSideMissionProgress(); 
    }
    
    if (onComplete) {
        const progressData: PuzzleProgress = {
            m1Heights: m1Heights,
            m1Reason: m1Reason,
            quizInput: quizInput,
            quizSelect1: quizSelect1,
            quizSelect2: quizSelect2,
            imageDescription: prompt,
            uploadedImage: originalImage,
            m1Part1Solved,
            m1Part2Solved,
            isQuizSolved
        };
        onComplete(progressData);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto bg-slate-50 relative">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
        <button onClick={handleBack} className="p-2 hover:bg-slate-100 rounded-lg border border-slate-300 text-slate-600 hover:text-teal-600 transition-all">
            <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
            <div className={`text-[10px] font-mono uppercase tracking-widest ${activePuzzle?.type === 'side' ? 'text-indigo-600' : 'text-slate-500'}`}>
                {activePuzzle?.type === 'side' ? 'SIDE OPERATION ACTIVE' : 'ACTIVE PROTOCOL'}
            </div>
            <h2 className={`text-base font-bold font-mono truncate max-w-[200px] ${activePuzzle?.type === 'side' ? 'text-indigo-600' : 'text-teal-600'}`}>
            {activePuzzle ? activePuzzle.title : 'Free Explore Mode'}
            </h2>
        </div>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-36 relative z-10">
        
        {/* Instructions */}
        {activePuzzle && !originalImage && (
          <div className={`border p-6 rounded-none relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 ${activePuzzle.type === 'side' ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-teal-200 shadow-sm'}`}>
            <div className={`absolute top-0 left-0 w-1 h-full ${activePuzzle.type === 'side' ? 'bg-indigo-500' : 'bg-teal-500'}`}></div>
            <h3 className={`font-mono text-xs mb-2 flex items-center gap-2 ${activePuzzle.type === 'side' ? 'text-indigo-600' : 'text-teal-600'}`}>
                {activePuzzle.type === 'side' ? <ClipboardList className="w-4 h-4" /> : <Terminal className="w-4 h-4" />}
                {activePuzzle.type === 'side' ? 'SIDE MISSION BRIEFING' : '任務目標'}
            </h3>
            <p className="text-slate-700 mb-4 font-mono text-sm leading-relaxed border-l border-slate-200 pl-4">
                {activePuzzle.description}
            </p>
            {!activePuzzle.quiz && (
                <div className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-wide border ${activePuzzle.type === 'side' ? 'bg-indigo-100/50 border-indigo-200 text-indigo-700' : 'bg-teal-50 border-teal-200 text-teal-700'}`}>
                <Camera className="w-4 h-4" />
                <span>Objective: Acquire Visual Data</span>
                </div>
            )}
          </div>
        )}

        {/* Quiz Section (If applicable) */}
        {activePuzzle?.quiz && (
            <div className={`p-6 rounded-lg border transition-all duration-500 ${isQuizSolved ? 'bg-teal-50 border-teal-200' : 'bg-white border-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.1)]'}`}>
                <div className="flex items-center gap-3 mb-4">
                    {isQuizSolved ? (
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                             <CheckCircle className="w-5 h-5" />
                        </div>
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 animate-pulse">
                             <HelpCircle className="w-5 h-5" />
                        </div>
                    )}
                    <div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                            {isQuizSolved ? 'SECURITY CLEARANCE GRANTED' : 'SECURITY CHALLENGE REQUIRED'}
                        </div>
                        <h3 className={`font-bold font-sans text-lg ${isQuizSolved ? 'text-teal-700' : 'text-slate-800'}`}>
                            {activePuzzle.quiz.question}
                        </h3>
                    </div>
                </div>

                {/* Show inputs if not solved, or if it's Mission 1/2/3 to see answers */}
                <div className="space-y-6">
                        {activePuzzle.id === '1' ? (
                            <div className="space-y-6">
                                {/* Question 1 Section */}
                                <div className={`space-y-3 p-4 border rounded-lg ${m1Part1Solved ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="flex items-center justify-between">
                                        <h4 className={`font-bold text-sm flex items-center gap-2 ${m1Part1Solved ? 'text-teal-700' : 'text-slate-700'}`}>
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${m1Part1Solved ? 'bg-teal-200 text-teal-800' : 'bg-slate-200 text-slate-600'}`}>1</span>
                                            四獸山高度
                                        </h4>
                                        {m1Part1Solved && <CheckCircle className="w-5 h-5 text-teal-500" />}
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        {['tiger', 'leopard', 'lion', 'elephant'].map((mount) => (
                                            <div key={mount} className="space-y-1">
                                                <label className="text-xs font-mono text-slate-500 capitalize">
                                                    {mount === 'tiger' ? '虎山' : mount === 'leopard' ? '豹山' : mount === 'lion' ? '獅山' : '象山'}
                                                </label>
                                                <div className="relative">
                                                    <input 
                                                        type="number" 
                                                        value={(m1Heights as any)[mount]}
                                                        onChange={(e) => setM1Heights({...m1Heights, [mount]: e.target.value})}
                                                        className="w-full bg-white border border-slate-300 text-slate-900 px-3 py-2 rounded font-mono text-sm focus:border-amber-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-900 disabled:border-slate-200 disabled:shadow-none disabled:font-bold"
                                                        placeholder="請輸入數字"
                                                        disabled={m1Part1Solved || isCompleted}
                                                    />
                                                    <span className="absolute right-3 top-2 text-xs text-slate-400">m</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {!m1Part1Solved && !isCompleted && (
                                        <>
                                            {m1Part1Error && (
                                                <div className="text-rose-600 text-xs font-mono flex items-center gap-1 animate-pulse">
                                                    <AlertTriangle className="w-3 h-3" /> 數值不正確，請再檢查。
                                                </div>
                                            )}
                                            <button 
                                                onClick={verifyM1Part1}
                                                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold font-mono py-2 rounded text-xs uppercase tracking-wider transition-all"
                                            >
                                                確認高度
                                            </button>
                                        </>
                                    )}
                                </div>
                                
                                {/* Question 2 Section */}
                                <div className={`space-y-3 p-4 border rounded-lg ${m1Part2Solved ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="flex items-center justify-between">
                                        <h4 className={`font-bold text-sm flex items-center gap-2 ${m1Part2Solved ? 'text-teal-700' : 'text-slate-700'}`}>
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${m1Part2Solved ? 'bg-teal-200 text-teal-800' : 'bg-slate-200 text-slate-600'}`}>2</span>
                                            地形觀察
                                        </h4>
                                        {m1Part2Solved && <CheckCircle className="w-5 h-5 text-teal-500" />}
                                    </div>

                                    <div className="">
                                        <label className="text-xs font-mono text-slate-500 mb-2 block">開啟3D地圖，觀察周遭地形，為何永春陂會是濕地？</label>
                                        <textarea 
                                            value={m1Reason}
                                            onChange={(e) => setM1Reason(e.target.value)}
                                            className="w-full bg-white border border-slate-300 text-slate-900 px-3 py-2 rounded font-mono text-sm focus:border-amber-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-900 disabled:border-slate-200 disabled:resize-none disabled:font-bold"
                                            placeholder="請輸入你的觀察..."
                                            rows={2}
                                            disabled={m1Part2Solved || isCompleted}
                                        />
                                    </div>

                                    {!m1Part2Solved && !isCompleted && (
                                        <>
                                            {m1Part2Error && (
                                                <div className="text-rose-600 text-xs font-mono flex items-center gap-1 animate-pulse">
                                                    <AlertTriangle className="w-3 h-3" /> 觀察方向有誤，請思考「高低」關係。
                                                </div>
                                            )}
                                            <button 
                                                onClick={verifyM1Part2}
                                                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold font-mono py-2 rounded text-xs uppercase tracking-wider transition-all"
                                            >
                                                確認觀察
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : activePuzzle.id === '3' ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 flex-wrap text-slate-700 font-mono text-sm sm:text-base p-2 border border-slate-200 rounded bg-slate-50">
                                    <span>等高線越</span>
                                    <select 
                                        value={quizSelect1}
                                        onChange={(e) => setQuizSelect1(e.target.value)}
                                        className="bg-white border border-slate-300 text-teal-700 px-2 py-1 rounded focus:outline-none focus:border-amber-500 transition-colors disabled:bg-slate-100 disabled:text-slate-900 disabled:border-slate-300 disabled:font-bold"
                                        disabled={isCompleted || isQuizSolved}
                                    >
                                        <option value="" disabled>請選擇</option>
                                        <option value="稀疏">稀疏</option>
                                        <option value="密集">密集</option>
                                    </select>
                                    <span>，爬起來越</span>
                                    <select 
                                        value={quizSelect2}
                                        onChange={(e) => setQuizSelect2(e.target.value)}
                                        className="bg-white border border-slate-300 text-teal-700 px-2 py-1 rounded focus:outline-none focus:border-amber-500 transition-colors disabled:bg-slate-100 disabled:text-slate-900 disabled:border-slate-300 disabled:font-bold"
                                        disabled={isCompleted || isQuizSolved}
                                    >
                                        <option value="" disabled>請選擇</option>
                                        <option value="累">累</option>
                                        <option value="不累">不累</option>
                                    </select>
                                </div>
                                
                                {showQuizError && (
                                    <div className="flex items-center gap-2 text-rose-600 text-xs font-mono animate-pulse">
                                        <AlertTriangle className="w-3 h-3" />
                                        <span>INCORRECT ANSWER. ACCESS DENIED.</span>
                                    </div>
                                )}
                                {!isQuizSolved && !isCompleted && (
                                    <button 
                                        onClick={handleQuizVerify}
                                        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold font-mono py-2.5 rounded uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-amber-500/20"
                                    >
                                        VERIFY ANSWER
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <input 
                                    type="text" 
                                    value={quizInput}
                                    onChange={(e) => setQuizInput(e.target.value)}
                                    placeholder="輸入你的答案..."
                                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded font-mono text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-900 disabled:border-slate-200 disabled:font-bold"
                                    disabled={isCompleted || isQuizSolved}
                                />
                                {showQuizError && (
                                    <div className="flex items-center gap-2 text-rose-600 text-xs font-mono animate-pulse">
                                        <AlertTriangle className="w-3 h-3" />
                                        <span>INCORRECT ANSWER. ACCESS DENIED.</span>
                                    </div>
                                )}
                                {!isQuizSolved && !isCompleted && (
                                    <button 
                                        onClick={handleQuizVerify}
                                        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold font-mono py-2.5 rounded uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-amber-500/20"
                                    >
                                        VERIFY ANSWER
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
            </div>
        )}

        {/* Mission Completion Button for Mission 1 (Since no image upload) */}
        {activePuzzle?.id === '1' && isQuizSolved && !isCompleted && (
            <button
                onClick={handlePreComplete}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white py-4 rounded-lg font-mono font-bold text-lg uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
                <CheckCircle className="w-6 h-6" />
                <span>COMPLETE MISSION</span>
            </button>
        )}
        
        {isCompleted && activePuzzle?.id === '1' && (
             <div className="w-full bg-slate-100 text-slate-500 py-4 rounded-lg font-mono font-bold text-center uppercase tracking-widest border border-slate-200">
                MISSION COMPLETED
            </div>
        )}

        {/* Image Area - Unconditionally shown for Mission 2, conditional for others */}
        {(activePuzzle?.id === '2' || (isQuizSolved && activePuzzle?.id !== '1')) && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-forwards">
                
                {/* Secondary Instruction (If exists) */}
                {!originalImage && activePuzzle?.uploadInstruction && (
                    <div className={`border-l-2 p-4 rounded-r ${activePuzzle.type === 'side' ? 'bg-indigo-50 border-indigo-500' : 'bg-amber-50 border-amber-500'}`}>
                         <h4 className={`font-bold text-sm mb-1 font-mono flex items-center gap-2 ${activePuzzle.type === 'side' ? 'text-indigo-600' : 'text-amber-700'}`}>
                            <ImageIcon className="w-4 h-4" /> 
                            IMAGE REQUIRED
                         </h4>
                         <p className="text-sm text-slate-700">{activePuzzle.uploadInstruction}</p>
                    </div>
                )}

                <div className={`min-h-[300px] border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center p-4 relative bg-slate-100 group transition-colors hover:border-teal-400 hover:bg-slate-50 ${isCompleted ? 'border-solid border-slate-200' : ''}`}>
                {!originalImage ? (
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto shadow-sm border border-slate-200 group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8 text-slate-400 group-hover:text-teal-500 transition-colors" />
                        </div>
                        <div>
                            <p className="text-slate-600 font-mono mb-2">UPLOAD SENSOR DATA</p>
                            {!isCompleted && (
                                <button 
                                    onClick={triggerFileInput}
                                    className={`px-6 py-2 rounded-full font-bold shadow-md transition-all ${activePuzzle?.type === 'side' ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-teal-600 hover:bg-teal-500 text-white'}`}
                                >
                                    ACTIVATE CAMERA / FILE
                                </button>
                            )}
                            {isCompleted && (
                                <p className="text-slate-400 font-mono text-xs">NO IMAGE DATA SAVED</p>
                            )}
                        </div>
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            disabled={isCompleted}
                        />
                    </div>
                ) : (
                    <div className="w-full space-y-4">
                         {/* If resultImage is null (e.g. manual confirm), make original image bigger. Else show grid */}
                         <div className={`grid ${resultImage || loading ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                            <div className="relative group">
                                <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded font-mono backdrop-blur-sm z-10">ORIGINAL</div>
                                <img 
                                    src={`data:image/jpeg;base64,${originalImage}`} 
                                    alt="Original" 
                                    className={`w-full rounded border border-slate-200 shadow-sm object-contain max-h-[50vh] ${!resultImage ? 'mx-auto' : ''}`} 
                                />
                                {!isCompleted && (
                                    <button 
                                        onClick={() => setOriginalImage(null)}
                                        className="absolute top-2 right-2 p-1 bg-white/90 rounded-full text-slate-600 hover:text-rose-600 transition-colors shadow-sm z-10"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            
                            {(loading || resultImage) && (
                                <div className="relative flex items-center justify-center bg-slate-100 rounded border border-slate-200">
                                    {loading ? (
                                        <div className="text-center">
                                            <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-2" />
                                            <p className="text-xs font-mono text-slate-500 animate-pulse">PROCESSING...</p>
                                        </div>
                                    ) : resultImage ? (
                                        <>
                                            <div className="absolute top-2 left-2 bg-teal-600/90 text-white text-[10px] px-2 py-1 rounded font-mono backdrop-blur-sm shadow-sm z-10">
                                                AI ENHANCED
                                            </div>
                                            <img src={`data:image/jpeg;base64,${resultImage}`} alt="Result" className="w-full rounded h-full object-cover max-h-[50vh]" />
                                        </>
                                    ) : null}
                                </div>
                            )}
                         </div>

                         {/* Controls */}
                         <div className="bg-white p-4 rounded border border-slate-200 shadow-sm">
                            <div className="mb-4">
                                <label className="text-xs font-mono text-slate-500 mb-1 block">PROCESSING PROMPT / DESCRIPTION</label>
                                <textarea 
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-sm font-mono focus:border-teal-500 focus:outline-none transition-colors text-slate-800 disabled:bg-slate-100 disabled:text-slate-800 disabled:resize-none disabled:font-bold"
                                    rows={2}
                                    disabled={isCompleted}
                                />
                            </div>
                            
                            {error && (
                                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs font-mono flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            {!isCompleted && (
                                <div className="flex flex-col gap-3">
                                    <button 
                                        onClick={handleGenerate}
                                        disabled={loading || !prompt}
                                        className="w-full bg-slate-800 hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-white py-3 rounded font-mono font-bold flex items-center justify-center gap-2 transition-all shadow-md"
                                    >
                                        {loading ? 'PROCESSING...' : 'RUN AI ANALYSIS'}
                                    </button>

                                    {resultImage && (
                                        <button 
                                            onClick={handlePreComplete}
                                            className={`w-full text-white py-3 rounded font-mono font-bold flex items-center justify-center gap-2 transition-all shadow-md ${activePuzzle?.type === 'side' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-teal-600 hover:bg-teal-500'}`}
                                        >
                                            TRANSMIT DATA <ChevronRight className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            )}
                            {isCompleted && (
                                <div className="text-center text-teal-600 font-mono font-bold text-sm py-2 bg-teal-50 rounded">
                                    DATA ARCHIVED
                                </div>
                            )}
                         </div>
                    </div>
                )}
                </div>

                {/* Manual Confirm Button - Always visible below upload area if image is selected */}
                {originalImage && !isCompleted && (
                     <button
                        onClick={handlePreComplete}
                        className="w-full mt-4 bg-white border border-slate-300 text-slate-500 hover:bg-slate-50 hover:text-teal-600 hover:border-teal-300 py-3 rounded-lg font-mono text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 group shadow-sm"
                    >
                        <ShieldCheck className="w-4 h-4 text-slate-400 group-hover:text-teal-500" />
                        <span>Manual Confirmation</span>
                    </button>
                )}
               
                {/* Geological Map Button for Mission 2 */}
                {activePuzzle?.id === '2' && (
                    <div className="flex justify-end pt-2">
                        <a 
                            href="https://geomap.gsmma.gov.tw/gwh/gsb97-1/sys8a/t3/index1.cfm"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-full font-bold text-xs shadow-md border border-emerald-300 transition-colors"
                        >
                            <span>地質資料整合查詢</span>
                            <ChevronRight className="w-4 h-4" />
                        </a>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-xl p-6 shadow-2xl relative overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-400"></div>
                
                <div className="text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-[bounce_2s_infinite]">
                        <PartyPopper className="w-8 h-8 text-emerald-600" />
                    </div>
                    
                    <h2 className="text-2xl font-bold font-mono text-slate-800 mb-2">恭喜過關🎉</h2>
                    <p className="text-slate-600 text-sm mb-6">
                        {activePuzzle?.type !== 'side' ? '獲得地圖碎片' : '任務回報成功'}
                    </p>
                    
                    <button 
                        onClick={handleFinalExit}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                    >
                        <span>耶咿</span>
                        <Check className="w-5 h-5" />
                    </button>

                    {activePuzzle?.type === 'side' && (
                         <button 
                            onClick={() => {
                                setShowSuccessModal(false);
                                setOriginalImage(null);
                                setResultImage(null);
                                // Trigger progression
                                if (onSideMissionProgress) onSideMissionProgress();
                            }}
                            className="w-full mt-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3 rounded-lg border border-indigo-200 transition-colors"
                         >
                            上傳下一張
                         </button>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};
