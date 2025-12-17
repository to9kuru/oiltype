import React, { useState, useEffect } from 'react';
import { WordItem, GameMode } from './types';
import TypingGame from './components/TypingGame';
import WordSettings from './components/WordSettings';
import { generateWordList } from './services/geminiService';
import { Keyboard, Swords, Sparkles, Edit3, Loader2, ChevronLeft } from 'lucide-react';

const DEFAULT_WORDS: WordItem[] = [
  { id: '1', display: 'こんにちは', romaji: 'konnichiwa' },
  { id: '2', display: 'ありがとう', romaji: 'arigatou' },
  { id: '3', display: '油', romaji: 'abura' },
];

function App() {
  const [words, setWords] = useState<WordItem[]>(DEFAULT_WORDS);
  const [gameMode, setGameMode] = useState<GameMode>('tomato');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasSetup, setHasSetup] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTopic, setCurrentTopic] = useState("");
  const [showThemePrompt, setShowThemePrompt] = useState<{ mode: GameMode } | null>(null);
  const [tempTheme, setTempTheme] = useState("");

  useEffect(() => {
    const savedWords = localStorage.getItem('oil_type_manual_words');
    if (savedWords) {
      try {
        setWords(JSON.parse(savedWords));
      } catch (e) {}
    }
  }, []);

  const handleUpdateWords = (newWords: WordItem[], isManual: boolean) => {
    setWords(newWords);
    if (isManual) {
      localStorage.setItem('oil_type_manual_words', JSON.stringify(newWords));
    }
    setHasSetup(true);
  };

  const startAiMode = async (topic: string, mode: GameMode) => {
    const finalTopic = topic.trim() || (mode === 'pro' ? "最高難度の日本語、四字熟語、難読漢字、哲学用語" : "一般的な日本語");
    setIsGenerating(true);
    setCurrentTopic(finalTopic);
    try {
      const newList = await generateWordList(finalTopic, 30);
      if (newList.length === 0) throw new Error("No words generated");
      setWords(newList);
      setGameMode(mode);
      setHasSetup(true);
      setShowThemePrompt(null);
      setTempTheme("");
    } catch (e) {
      console.error(e);
      alert("AI生成に失敗しました。環境変数のAPI_KEY設定を確認してください。");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetry = async () => {
    if (gameMode === 'pro') {
        setIsGenerating(true);
        try {
          const newList = await generateWordList(currentTopic, 30);
          setWords(newList);
        } catch (e) {
          console.error("Retry generation failed", e);
        } finally {
          setIsGenerating(false);
        }
    }
  };

  const handleBackToTop = () => {
    setHasSetup(false);
    if (gameMode === 'pro') setWords([]); 
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-amber-500/30 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-amber-500/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-zinc-500/5 blur-[120px] rounded-full"></div>
      </div>

      <header className="relative z-50 p-6 flex items-center justify-between border-b border-white/5 backdrop-blur-md bg-black/20">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
            <Keyboard className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase flex items-center gap-2">
                oil type <span className="text-[10px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded font-mono">3.5</span>
            </h1>
            <p className="text-[9px] text-zinc-600 font-mono tracking-widest uppercase">Smooth & Viscous Typing</p>
          </div>
        </div>
        
        {hasSetup && (
           <button 
             onClick={handleBackToTop} 
             className="group flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-all bg-white/5 px-4 py-2 rounded-full border border-white/10"
           >
             <ChevronLeft className="w-4 h-4" />
             メニューに戻る
           </button>
        )}
      </header>

      <main className="relative z-10 container mx-auto px-4 py-12">
        {isGenerating ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center gap-8 animate-in fade-in duration-500">
             <div className="relative">
                <div className="w-16 h-16 border-t-2 border-amber-500 rounded-full animate-spin"></div>
                <Loader2 className="absolute inset-0 m-auto w-6 h-6 text-amber-500 animate-pulse" />
             </div>
             <div className="text-center">
                <h3 className="text-xl font-black text-white animate-pulse mb-1 tracking-widest uppercase">Target Generating...</h3>
                <p className="text-[10px] text-zinc-500 font-mono uppercase">Analyzing Viscous Lexicon</p>
             </div>
          </div>
        ) : !hasSetup ? (
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-black text-white mb-4 tracking-tighter uppercase">Initial Sequence</h2>
              <div className="w-20 h-1 bg-amber-500 mx-auto rounded-full"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <button 
                onClick={() => startAiMode("", 'pro')}
                className="group relative bg-zinc-900/40 border border-white/5 rounded-[2rem] p-10 text-left transition-all hover:border-amber-500/50 hover:bg-zinc-900 hover:scale-[1.01] shadow-xl overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><Swords className="w-24 h-24" /></div>
                <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-[10px] font-black mb-6 border border-amber-500/20">
                    🏆 COMPETITION
                </div>
                <h3 className="text-2xl font-black text-white mb-4">競技 (PRO)</h3>
                <p className="text-zinc-500 text-sm leading-relaxed mb-8">AIが生成する難問に挑む真剣勝負。テーマ入力なしで即座に開始します。リトライするたびに新たな単語が生成されます。</p>
                <div className="text-[10px] font-mono text-zinc-600">NO INPUT // REALTIME GEN // HARDCORE</div>
              </button>

              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="group relative bg-zinc-900/40 border border-white/5 rounded-[2rem] p-10 text-left transition-all hover:border-emerald-500/50 hover:bg-zinc-900 hover:scale-[1.01] shadow-xl"
              >
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-black mb-6 border border-emerald-500/20">
                    ✏️ CUSTOM
                </div>
                <h3 className="text-2xl font-black text-white mb-4">単語設定</h3>
                <p className="text-zinc-500 text-sm leading-relaxed mb-8">自分の設定した単語を繰り返し練習。特定の苦手ワードや独自のリストを永続保存し、集中して油を注ぎ込みます。</p>
                <div className="text-[10px] font-mono text-zinc-600">MANUAL LIST // USER DATA // SYNCED</div>
              </button>

              <button 
                onClick={() => setShowThemePrompt({ mode: 'tomato' })}
                className="group relative bg-zinc-900/40 border border-white/5 rounded-[2rem] p-10 text-left transition-all hover:border-blue-500/50 hover:bg-zinc-900 hover:scale-[1.01] shadow-xl"
              >
                <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-[10px] font-black mb-6 border border-blue-400/20">
                    ✨ AI GENERATE
                </div>
                <h3 className="text-2xl font-black text-white mb-4">AI生成</h3>
                <p className="text-zinc-500 text-sm leading-relaxed mb-8">好きなテーマを入力し、AIにリストを任せる。30単語完走（TOMATOルール）で、新たな知識と指の動きを同期させます。</p>
                <div className="text-[10px] font-mono text-zinc-600 uppercase">Input Theme // 30 Knocks // Gemini</div>
              </button>
            </div>
          </div>
        ) : (
          <TypingGame 
            words={words} 
            mode={gameMode}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onChangeMode={setGameMode}
            isSettingsOpen={isSettingsOpen}
            onExit={handleBackToTop}
            onRetry={handleRetry}
          />
        )}
      </main>

      {showThemePrompt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 p-8 rounded-[2rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" /> テーマを入力
            </h3>
            <input 
              autoFocus
              type="text" 
              value={tempTheme} 
              onChange={(e) => setTempTheme(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && tempTheme.trim() && startAiMode(tempTheme, showThemePrompt.mode)}
              placeholder="例: IT用語、四字熟語、野菜..." 
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:outline-none mb-6"
            />
            <div className="flex gap-4">
               <button onClick={() => setShowThemePrompt(null)} className="flex-1 py-3 text-zinc-500 font-bold hover:text-zinc-300 transition-colors">キャンセル</button>
               <button 
                 onClick={() => startAiMode(tempTheme, showThemePrompt.mode)} 
                 disabled={!tempTheme.trim() || isGenerating}
                 className="flex-1 py-3 bg-amber-500 text-black font-black rounded-xl hover:bg-amber-400 disabled:opacity-50 transition-all"
               >
                 生成開始
               </button>
            </div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <WordSettings 
          currentWords={words} 
          onUpdateWords={(w) => handleUpdateWords(w, true)} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      )}
    </div>
  );
}

export default App;