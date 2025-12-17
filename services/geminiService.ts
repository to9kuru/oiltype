import { GoogleGenAI, Type } from "@google/genai";
import { WordItem } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateWordList = async (topic: string, count: number = 30): Promise<WordItem[]> => {
  try {
    const ai = getAiClient();
    
    const prompt = `テーマ: "${topic}" に関する日本語単語を${count}個生成。
    条件: 
    1. 日本語(漢字/かな)のみ。英字・記号・句読点・引用符は一切禁止。
    2. romajiはヘボン式、小文字、スペースなし。
    出力形式: JSON配列 [{display: "単語", romaji: "tango"}]`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              display: { type: Type.STRING },
              romaji: { type: Type.STRING }
            },
            required: ["display", "romaji"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];

    const rawData = JSON.parse(text);
    
    return rawData.slice(0, count).map((item: any, index: number) => ({
      id: `gen-${Date.now()}-${index}`,
      display: item.display.replace(/[a-zA-Z0-9'""''、。！？!?,.・()（）\s]/g, ''),
      romaji: item.romaji.toLowerCase().replace(/[^a-z]/g, '')
    }));

  } catch (error) {
    console.error("AI Generation failed:", error);
    throw error;
  }
};

export const generateRomajiForList = async (words: string[]): Promise<string[]> => {
  try {
    const ai = getAiClient();
    const prompt = `変換: ${JSON.stringify(words)} をローマ字に。小文字JSON配列。`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    const list = JSON.parse(response.text || "[]");
    return list.map((r: string) => r.toLowerCase().replace(/[^a-z]/g, ''));
  } catch (error) {
    return words;
  }
};