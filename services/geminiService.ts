
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { UserEmotion, SongResult } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "") {
    throw new Error("API_KEY가 설정되지 않았습니다. Vercel 환경 변수 설정을 확인해주세요.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateLyrics = async (emotions: UserEmotion[]): Promise<{ title: string; lyrics: string }> => {
  const ai = getAIClient();
  const emotionTexts = emotions.map(e => e.text).join(", ");
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      다음은 학생들이 연주를 듣고 느낀 감정들입니다: [${emotionTexts}]
      이 감정들을 하나로 엮어 서정적이고 시적인 노래 가사를 만들어주세요.
      가사의 형식과 어조는 다음 예시를 참고하세요:
      "이제 모두 세월 따라 흔적도 없이 변해갔지만
      덕수궁 돌담길엔 아직 남아 있어요
      다정히 걸어가는 연인들..."
      
      [요구사항]
      1. '1절', '후렴' 같은 구분 기호 없이 서사적인 발라드 형식으로 작성하세요.
      2. 반드시 JSON 형식으로만 응답하세요.
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          lyrics: { type: Type.STRING }
        },
        required: ["title", "lyrics"]
      }
    }
  });

  try {
    // 마크다운 코드 블록 제거 및 순수 JSON 추출
    const cleanText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON 파싱 에러:", response.text);
    throw new Error("AI 응답 형식이 올바르지 않습니다.");
  }
};

export const generateSongAudio = async (lyrics: string): Promise<string> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `아름답고 감성적인 목소리로 이 가사를 노래하듯 읽어주세요: ${lyrics}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("음성 생성에 실패했습니다 (AI 응답 누락).");
  return base64Audio;
};

export function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
