import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { WordItem, GameMode, GameState, GameStats } from '../types';
import StatsChart from './StatsChart';
import { RotateCcw, Play, Trophy, Swords, Keyboard, Info, Timer, Heart, Infinity, Utensils, Droplet, Cherry } from 'lucide-react';

interface TypingGameProps {
  words: WordItem[];
  mode: GameMode;
  onOpenSettings: () => void;
  onChangeMode: (mode: GameMode) => void;
  isSettingsOpen: boolean;
  onExit: () => void;
  onRetry: () => void;
}

const expandRomaji = (text: string): string[] => {
  if (!text) return [""];
  const cleanText = text.replace(/\s/g, '').toLowerCase();
  const mappings = [
    { src: 'shi', dst: 'si' }, { src: 'chi', dst: 'ti' }, { src: 'tsu', dst: 'tu' },
    { src: 'fu',  dst: 'hu' }, { src: 'sha', dst: 'sya' }, { src: 'shu', dst: 'syu' },
    { src: 'sho', dst: 'syo' }, { src: 'cha', dst: 'tya' }, { src: 'chu', dst: 'tyu' },
    { src: 'cho', dst: 'tyo' }, { src: 'ja',  dst: 'zya' }, { src: 'ju',  dst: 'zyu' },
    { src: 'jo',  dst: 'zyo' }, { src: 'ji',  dst: 'zi' }, { src: 'ka',  dst: 'ca' },
    { src: 'n',   dst: 'nn' }
  ];
  let results: string[] = [];
  let matchedPrefix = false;
  for (const m of mappings) {
    if (cleanText.startsWith(m.src)) {
      matchedPrefix = true;
      const suffixes = expandRomaji(cleanText.slice(m.src.length));
      suffixes.forEach(s => { results.push(m.src + s); results.push(m.dst + s); });
    }
  }
  if (!matchedPrefix && cleanText.length > 0) {
    const head = cleanText[0];
    const suffixes = expandRomaji(cleanText.slice(1));
    suffixes.forEach(s => results.push(head + s));
  } else if (cleanText.length === 0) { results = [""]; }
  return Array.from(new Set(results));
};

const normalizeKeystroke = (str: string) => {
  let s = str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  const hiraMap: {[key:string]: string} = {
    'あ':'a','い':'i','う':'u','え':'e','お':'o','か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko',
    'さ':'sa','し':'shi','す':'su','せ':'se','そ':'so','た':'ta','ち':'chi','つ':'tsu','て':'te','と':'to',
    'な':'na','に':'ni','ぬ':'nu','ね':'ne','の':'no','は':'ha','ひ':'hi','ふ':'fu','へ':'he','ほ':'ho',
    'ま':'ma','み':'mi','む':'mu','め':'me','も':'mo','や':'ya','ゆ':'yo','ら':'ra','り':'ri',
    'る':'ru','れ':'re','ろ':'ro','わ':'wa','を':'wo','ん':'n','ー':'-'
  };
  let result = "";
  for (let char of s) { result += hiraMap[char] || char; }
  return result.toLowerCase();
};

const getModeInfo = (mode: GameMode) => {
  switch(mode) {
    case 'onion': return { icon: <Timer className="w-4 h-4" />, name: 'ONION (タイムアタック)', rule: '60秒間の限界に挑戦。単語リストはループ。速度こそ正義。' };
    case 'carrot': return { icon: <Heart className="w-4 h-4" />, name: 'CARROT (サバイバル)', rule: '初期時間7秒。正解ごとに [文字数 × 0.1秒] 回復。止まれば終わり。' };
    case 'grape': return { icon: <Cherry className="w-4 h-4" />, name: 'GRAPE (突然死)', rule: '1文字でもミスしたら即終了。リストは無限ループ。究極の精度。' };
    case 'water': return { icon: <Droplet className="w-4 h-4" />, name: 'WATER (無限)', rule: '時間制限も何もないです。油のように、なる。' };
    case 'tomato': return { icon: <Utensils className="w-4 h-4" />, name: 'TOMATO (30連打)', rule: 'リストをループして合計30ワードを打ち抜くタイムアタック。' };
    case 'pro': return { icon: <Swords className="w-4 h-4" />, name: 'PRO (競技)', rule: '60秒間。AIが毎回生成する難読漢字。初見での対応力を。' };
    default: return { icon: <Info className="w-4 h-4" />, name: 'NORMAL', rule: '正確にタイピングしてください。' };
  }
};

const TypingGame: React.FC<TypingGameProps> = ({ words, mode, onOpenSettings, onChangeMode, isSettingsOpen, onExit, onRetry }) => {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [typedString, setTypedString] = useState('');
  const [wordQueue, setWordQueue] = useState<WordItem[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [correctChars, setCorrectChars] = useState(0);
  const [incorrectChars, setIncorrectChars] = useState(0);
  const [wpmHistory, setWpmHistory] = useState<{ timestamp: number; wpm: number }[]>([]);
  const [timeLeft, setTimeLeft] = useState(0); 
  const [targetRomaji, setTargetRomaji] = useState('');
  const [isImeActive, setIsImeActive] = useState(false);
  const [totalWordsTyped, setTotalWordsTyped] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentWord = wordQueue[currentWordIndex];
  const validVariations = useMemo(() => currentWord ? expandRomaji(currentWord.romaji) : [], [currentWord]);
  const modeInfo = getModeInfo(mode);

  useEffect(() => {
    if (currentWord) setTargetRomaji(currentWord.romaji.replace(/\s/g, '').toLowerCase());
  }, [currentWord]);

  useEffect(() => {
    if (!isSettingsOpen && gameState !== 'finished') inputRef.current?.focus();
  }, [isSettingsOpen, gameState]);

  const initializeGame = useCallback(() => {
    if (words.length === 0) return;
    setWordQueue(words);
    setCurrentWordIndex(0);
    setTypedString('');
    setGameState('idle');
    setStartTime(null);
    setEndTime(null);
    setCorrectChars(0);
    setIncorrectChars(0);
    setWpmHistory([]);
    setTotalWordsTyped(0);
    if (mode === 'carrot') setTimeLeft(7); // 初期時間7秒
    else if (mode === 'onion' || mode === 'pro') setTimeLeft(60);
    if (inputRef.current) inputRef.current.value = "";
  }, [words, mode]);

  useEffect(() => { initializeGame(); }, [initializeGame]);

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const rawValue = e.currentTarget.value;
    if (!rawValue) return;
    setIsImeActive(/[ぁ-んァ-ン一-龠]/.test(rawValue));
    const normalized = normalizeKeystroke(rawValue);
    e.currentTarget.value = "";
    if (gameState === 'finished' || isSettingsOpen || !currentWord) return;
    if (gameState === 'idle') { setGameState('playing'); setStartTime(Date.now()); }
    const testString = typedString + normalized;
    let matchedVariation = targetRomaji.startsWith(testString) ? targetRomaji : validVariations.find(v => v.startsWith(testString));
    if (matchedVariation) {
      if (matchedVariation !== targetRomaji) setTargetRomaji(matchedVariation);
      setCorrectChars(prev => prev + normalized.length);
      if (testString === matchedVariation) handleWordComplete();
      else setTypedString(testString);
    } else {
      setIncorrectChars(prev => prev + 1);
      if (mode === 'grape') finishGame();
      if (containerRef.current) {
        containerRef.current.classList.remove('animate-shake');
        void containerRef.current.offsetWidth; 
        containerRef.current.classList.add('animate-shake');
      }
    }
  };

  const handleWordComplete = () => {
    const now = Date.now();
    if (startTime) {
      const elapsedMin = (now - startTime) / 60000;
      setWpmHistory(prev => [...prev, { timestamp: now, wpm: (correctChars / 5) / (elapsedMin || 1) }]);
    }

    if (mode === 'carrot' && currentWord) {
      // 百本CARROT: 正解ごとに文字数*0.1秒回復
      const recovery = currentWord.romaji.length * 0.1;
      setTimeLeft(prev => Math.min(prev + recovery, 999));
    }

    const nextTotalTyped = totalWordsTyped + 1;
    setTotalWordsTyped(nextTotalTyped);
    
    // TOMATOモード: 30回固定
    if (mode === 'tomato' && nextTotalTyped >= 30) {
      finishGame();
      return;
    }

    // 単語ループ
    if (currentWordIndex + 1 >= wordQueue.length) {
        setCurrentWordIndex(0);
        setTypedString('');
    } else {
      setCurrentWordIndex(prev => prev + 1);
      setTypedString('');
    }
  };

  const finishGame = () => { setGameState('finished'); setEndTime(Date.now()); };

  useEffect(() => {
    if (gameState !== 'playing') return;
    if (mode === 'onion' || mode === 'carrot' || mode === 'pro') {
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 0) { finishGame(); clearInterval(interval); return 0; }
          return prev - 0.1;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [mode, gameState]);

  if (gameState === 'finished') {
    const end = endTime || Date.now();
    const start = startTime || Date.now();
    let dur = (end - start) / 60000 || 0.0001;
    const stats = {
      wpm: (correctChars / 5) / dur,
      accuracy: (correctChars + incorrectChars) > 0 ? (correctChars / (correctChars + incorrectChars)) * 100 : 100,
      correctChars, incorrectChars, elapsedTime: (end - start) / 1000,
    };
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-5xl mx-auto w-full p-6 animate-in zoom-in-95 duration-500">
        <div className="bg-[#0c0c0c] border border-white/10 rounded-[3rem] p-12 w-full shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-amber-200 to-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)]"></div>
          <div className="text-center mb-10">
            <Trophy className="text-amber-500 w-16 h-16 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
            <h2 className="text-5xl font-black text-white tracking-tighter mb-2 uppercase">Result</h2>
            <p className="text-zinc-500 tracking-[0.5em] text-[10px] font-mono uppercase italic">{mode} protocol finalized</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
            {[
                { label: '打鍵数', val: stats.correctChars, color: 'text-white' },
                { label: 'WPM', val: Math.round(stats.wpm), color: 'text-amber-500' },
                { label: '正確性', val: `${Math.round(stats.accuracy)}%`, color: 'text-emerald-400' },
                { label: '経過時間', val: `${stats.elapsedTime.toFixed(1)}s`, color: 'text-white' }
            ].map((stat, i) => (
                <div key={i} className="bg-white/5 p-6 rounded-3xl border border-white/5 flex flex-col items-center group hover:bg-white/10 transition-colors">
                  <span className="text-zinc-600 text-[9px] uppercase font-mono mb-2 tracking-widest">{stat.label}</span>
                  <span className={`text-4xl font-black ${stat.color} tracking-tighter`}>{stat.val}</span>
                </div>
            ))}
          </div>
          <div className="bg-black/60 rounded-[2.5rem] p-6 border border-white/5 shadow-inner">
            <StatsChart data={wpmHistory} />
          </div>
          <div className="mt-12 flex flex-col sm:flex-row justify-center gap-6">
            <button onClick={() => { onRetry(); initializeGame(); }} className="px-12 py-5 bg-amber-500 text-black font-black rounded-2xl hover:bg-amber-400 transition-all flex items-center justify-center gap-3 text-xl shadow-xl shadow-amber-500/10 active:scale-95">
              <RotateCcw className="w-6 h-6" /> RE-INITIALIZE
            </button>
            <button onClick={onExit} className="px-12 py-5 bg-white/5 border border-white/10 text-white font-black rounded-2xl hover:bg-white/10 transition-all text-xl">
              MAIN MENU
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
      <input ref={inputRef} type="text" onInput={handleInput} className="opacity-0 absolute inset-0 cursor-default" autoFocus spellCheck="false" autoComplete="off" />

      {/* HUD Header */}
      <div className="absolute top-0 left-0 w-full flex justify-between items-start px-8 z-20">
        <div className="flex flex-col gap-4">
           {mode !== 'pro' ? (
             <div className="flex gap-2 bg-black/80 p-2 rounded-2xl border border-white/5 backdrop-blur-3xl shadow-2xl">
               {['onion', 'carrot', 'grape', 'water', 'tomato'].map(m => (
                 <button key={m} onClick={() => onChangeMode(m as GameMode)} className={`px-5 py-2.5 text-[10px] font-black rounded-xl uppercase transition-all flex items-center gap-2 ${mode === m ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-zinc-600 hover:text-white hover:bg-white/5'}`}>
                   {getModeInfo(m as GameMode).icon} {m}
                 </button>
               ))}
             </div>
           ) : (
             <div className="flex items-center gap-4 bg-amber-500/10 px-6 py-4 rounded-[1.5rem] border border-amber-500/30 text-amber-500 font-black text-xs shadow-xl backdrop-blur-md">
                <Swords className="w-5 h-5" /> <span>🏆 PRO PROTOCOL ACTIVE</span>
             </div>
           )}
           <div className="px-5 py-3 bg-zinc-900/50 rounded-[1.5rem] border border-white/5 flex items-start gap-4 max-w-lg backdrop-blur-md shadow-lg">
             <div className="mt-0.5 p-1.5 bg-amber-500/10 rounded-lg text-amber-500">{modeInfo.icon}</div>
             <div className="flex flex-col gap-0.5">
               <span className="text-[10px] text-amber-500 font-black uppercase tracking-widest">{modeInfo.name}</span>
               <span className="text-[11px] text-zinc-400 font-medium leading-relaxed italic">
                 {modeInfo.rule}
               </span>
             </div>
           </div>
        </div>
        
        <div className="flex items-center gap-10 font-mono bg-black/60 p-6 rounded-[2rem] border border-white/5 backdrop-blur-xl shadow-2xl">
           {(mode === 'onion' || mode === 'carrot' || mode === 'pro') && (
             <div className="flex flex-col items-end">
               <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-black mb-1">Time Left</span>
               <span className={`text-4xl font-black tabular-nums ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft.toFixed(1)}s</span>
             </div>
           )}
           <div className="flex flex-col items-end">
             <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-black mb-1">Progress</span>
             <div className="flex items-baseline gap-1">
               <span className="text-4xl font-black text-white tabular-nums">
                 {mode === 'tomato' ? totalWordsTyped + 1 : currentWordIndex + 1}
               </span>
               <span className="text-zinc-700 text-lg font-bold">
                 /{mode === 'tomato' ? 30 : wordQueue.length}
               </span>
             </div>
           </div>
        </div>
      </div>

      <div ref={containerRef} className="text-center w-full relative z-10 pointer-events-none mt-24">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-40 w-full flex justify-center z-[200]">
             {isImeActive && (
               <div className="px-12 py-6 rounded-[2.5rem] border-2 bg-red-600/40 border-red-400 text-white scale-110 shadow-[0_0_80px_rgba(220,38,38,0.6)] flex items-center gap-8 animate-pulse backdrop-blur-xl">
                 <div className="p-4 bg-white/20 rounded-2xl"><Keyboard className="w-12 h-12 text-white" /></div>
                 <div className="text-left">
                   <p className="text-3xl font-black tracking-tighter uppercase mb-1">日本語入力：ON</p>
                   <p className="text-sm font-bold opacity-90 tracking-wide italic">Please switch to Half-width Alphanumeric</p>
                 </div>
               </div>
             )}
        </div>

        {currentWord ? (
            <div className="flex flex-col items-center gap-12 py-10">
                <div className="text-8xl md:text-9xl font-black text-white tracking-tighter transition-all animate-in fade-in slide-in-from-bottom-8 duration-700 select-none drop-shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
                  {currentWord.display}
                </div>
                
                <div className="text-5xl md:text-6xl font-mono relative tracking-tight h-28 flex items-center justify-center px-12 rounded-[2.5rem] bg-black/40 border border-white/20 backdrop-blur-sm shadow-[inset_0_2px_20px_rgba(0,0,0,0.8)]">
                   {/* 入力済み文字: エメラルド */}
                   <span className="text-emerald-500 drop-shadow-[0_0_20px_rgba(16,185,129,0.8)] font-black">
                     {typedString}
                   </span>
                   {/* カーソル */}
                   <div className="relative mx-1">
                      <div className="w-1.5 h-14 bg-amber-500 animate-caret shadow-[0_0_25px_rgba(245,158,11,1)] rounded-full"></div>
                   </div>
                   {/* 未入力文字: 不透明度100%の白で視認性最大化 */}
                   <span className="text-white font-bold opacity-100 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                     {targetRomaji.slice(typedString.length)}
                   </span>
                </div>
            </div>
        ) : (
          <div className="py-20 flex flex-col items-center gap-6">
            <div className="w-12 h-12 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin"></div>
          </div>
        )}

        {gameState === 'idle' && !isImeActive && (
          <div className="mt-20 flex flex-col items-center gap-8 animate-in fade-in duration-1000">
            <div className="bg-amber-500/10 border border-amber-500/30 px-12 py-5 rounded-[2rem] flex items-center gap-6 text-amber-500 font-black tracking-[0.4em] text-lg shadow-2xl backdrop-blur-md hover:bg-amber-500/20 transition-all active:scale-95">
              <Play className="w-8 h-8 fill-current" /> ANY KEY TO INITIALIZE
            </div>
            <p className="text-zinc-600 text-[10px] font-mono tracking-widest uppercase animate-pulse italic">Awaiting manual interaction sequence...</p>
          </div>
        )}
      </div>

      {gameState === 'playing' && (
        <div className="fixed bottom-12 flex gap-16 text-zinc-600 font-mono bg-black/70 px-16 py-8 rounded-[3rem] border border-white/10 backdrop-blur-3xl shadow-2xl transition-all">
          <div className="flex flex-col items-center gap-2">
            <span className="opacity-30 text-[9px] font-black uppercase tracking-[0.3em]">Net Velocity</span>
            <span className="text-amber-500 text-3xl font-black tabular-nums">{Math.round((correctChars / 5) / ((Date.now() - (startTime || Date.now())) / 60000) || 0)} <span className="text-[10px] text-zinc-700 font-normal">WPM</span></span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="opacity-30 text-[9px] font-black uppercase tracking-[0.3em]">Keystrokes</span>
            <span className="text-white text-3xl font-black tabular-nums">{correctChars}</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="opacity-30 text-[9px] font-black uppercase tracking-[0.3em]">Violations</span>
            <span className={`${incorrectChars > 0 ? 'text-red-500' : 'text-zinc-800'} text-3xl font-black tabular-nums transition-colors`}>{incorrectChars}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TypingGame;