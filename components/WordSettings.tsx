import React, { useState } from 'react';
import { WordItem } from '../types';
import { generateWordList, generateRomajiForList } from '../services/geminiService';
import { Sparkles, Save, Trash2, List, Plus, X, Wand2 } from 'lucide-react';

interface WordSettingsProps {
  currentWords: WordItem[];
  onUpdateWords: (words: WordItem[]) => void;
  onClose: () => void;
}

const WordSettings: React.FC<WordSettingsProps> = ({ currentWords, onUpdateWords, onClose }) => {
  const [activeTab, setActiveTab] = useState<'custom' | 'ai'>('custom');
  const [rows, setRows] = useState<{ display: string; romaji: string }[]>(
    currentWords.length > 0 
      ? currentWords.map(w => ({ display: w.display, romaji: w.romaji }))
      : [{ display: '', romaji: '' }]
  );
  const [aiTopic, setAiTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddRow = () => setRows([...rows, { display: '', romaji: '' }]);
  const handleRowChange = (index: number, field: 'display' | 'romaji', value: string) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    setRows(newRows);
  };
  const handleDeleteRow = (index: number) => {
    if (rows.length === 1) {
      setRows([{ display: '', romaji: '' }]);
      return;
    }
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleAutoFillRomaji = async () => {
    const targetIndices = rows.map((r, i) => (r.display.trim() && !r.romaji.trim()) ? i : -1).filter(i => i !== -1);
    if (targetIndices.length === 0) return;
    setIsGenerating(true);
    setError(null);
    try {
      const wordsToConvert = targetIndices.map(i => rows[i].display);
      const romajiList = await generateRomajiForList(wordsToConvert);
      const newRows = [...rows];
      targetIndices.forEach((rowIndex, i) => {
        if (romajiList[i]) newRows[rowIndex].romaji = romajiList[i];
      });
      setRows(newRows);
    } catch (e) {
      setError("ローマ字の生成に失敗しました。");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveCustom = () => {
    const validRows = rows.filter(r => r.display.trim() !== '');
    if (validRows.length === 0) {
      setError("少なくとも1つの単語を入力してください。");
      return;
    }
    const missingRomaji = validRows.some(r => r.romaji.trim() === '');
    if (missingRomaji) {
      setError("すべての単語にローマ字を入力してください。");
      return;
    }
    const newWords: WordItem[] = validRows.map((r, i) => ({
      id: `custom-${Date.now()}-${i}`,
      display: r.display,
      romaji: r.romaji.toLowerCase().replace(/\s/g, '')
    }));
    onUpdateWords(newWords);
    onClose();
  };

  const handleGenerateAi = async () => {
    if (!aiTopic.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const words = await generateWordList(aiTopic);
      onUpdateWords(words);
      onClose();
    } catch (e) {
      setError("AI生成に失敗しました。別のテーマを試してください。");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
      <div className="bg-[#111] border border-white/10 rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
          <h2 className="text-2xl font-black text-emerald-500 flex items-center gap-3 tracking-tighter">
            <List className="w-8 h-8" /> 単語リスト設定
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex border-b border-white/5">
          <button onClick={() => setActiveTab('custom')} className={`flex-1 py-4 font-bold transition-all ${activeTab === 'custom' ? 'bg-emerald-500/10 text-emerald-500 border-b-4 border-emerald-500' : 'text-zinc-500 hover:text-zinc-300'}`}>手動入力</button>
          <button onClick={() => setActiveTab('ai')} className={`flex-1 py-4 font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'ai' ? 'bg-blue-500/10 text-blue-400 border-b-4 border-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}><Sparkles className="w-5 h-5" /> AI生成 (Gemini 3 Pro)</button>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {error && (
            <div className="absolute top-4 left-4 right-4 z-50 p-4 bg-red-500/20 border border-red-500/50 text-red-400 rounded-2xl flex justify-between items-center backdrop-blur-md">
              <span className="font-bold">{error}</span>
              <button onClick={() => setError(null)}><X className="w-5 h-5" /></button>
            </div>
          )}

          {activeTab === 'custom' ? (
            <div className="h-full flex flex-col p-8">
              <div className="flex-1 overflow-y-auto space-y-4 pr-4">
                <div className="flex justify-between items-center">
                   <span className="text-zinc-500 font-mono text-xs uppercase tracking-widest">現在の単語数: {rows.length}</span>
                   <button onClick={handleAutoFillRomaji} disabled={isGenerating} className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 hover:bg-blue-500/20 transition-all flex items-center gap-2 text-xs font-bold">
                      <Wand2 className="w-4 h-4" /> AIローマ字補完
                   </button>
                </div>
                {rows.map((row, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_50px] gap-4 items-center">
                    <input type="text" value={row.display} onChange={(e) => handleRowChange(index, 'display', e.target.value)} className="bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none" placeholder="日本語" />
                    <input type="text" value={row.romaji} onChange={(e) => handleRowChange(index, 'romaji', e.target.value)} className="bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white font-mono focus:border-emerald-500 focus:outline-none" placeholder="romaji" />
                    <button onClick={() => handleDeleteRow(index)} className="text-zinc-600 hover:text-red-500 p-2"><Trash2 className="w-5 h-5" /></button>
                  </div>
                ))}
                <button onClick={handleAddRow} className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-zinc-600 hover:text-emerald-500 hover:border-emerald-500/50 transition-all font-bold flex items-center justify-center gap-2"><Plus className="w-5 h-5" /> 単語を追加</button>
              </div>
              <div className="pt-8 flex justify-end">
                <button onClick={handleSaveCustom} className="px-10 py-4 bg-emerald-500 text-black font-black rounded-2xl hover:bg-emerald-400 shadow-xl">保存して練習開始</button>
              </div>
            </div>
          ) : (
            <div className="p-12 flex flex-col items-center justify-center h-full">
               <div className="w-full max-w-lg space-y-10 text-center">
                 <div className="space-y-4">
                   <h3 className="text-3xl font-black text-white tracking-tighter">どんなテーマで練習しますか？</h3>
                   <p className="text-zinc-500">AIが30個の最適な単語を選び出します。</p>
                 </div>
                 <div className="relative">
                   <input type="text" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="例：IT用語、漫画のセリフ、京都の地名..." className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl px-6 py-5 text-xl focus:border-blue-500 focus:outline-none transition-all" onKeyDown={(e) => e.key === 'Enter' && handleGenerateAi()} />
                   <button onClick={handleGenerateAi} disabled={isGenerating || !aiTopic.trim()} className="absolute right-3 top-3 bottom-3 px-8 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 disabled:opacity-50 transition-all">{isGenerating ? '生成中...' : '生成'}</button>
                 </div>
                 <div className="flex flex-wrap gap-3 justify-center">
                    {['プログラミング', '歴史上の人物', '料理メニュー', '最新ニュース'].map(p => (
                      <button key={p} onClick={() => setAiTopic(p)} className="px-4 py-2 bg-white/5 border border-white/5 rounded-full text-xs text-zinc-400 hover:text-blue-400 hover:border-blue-400/50 transition-all">#{p}</button>
                    ))}
                 </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WordSettings;