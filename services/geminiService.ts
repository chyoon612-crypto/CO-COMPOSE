
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { UserEmotion, SongResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateLyrics = async (emotions: UserEmotion[]): Promise<{ title: string; lyrics: string }> => {
  const emotionTexts = emotions.map(e => e.text).join(", ");
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      다음은 학생들이 연주를 듣고 느낀 감정들입니다: [${emotionTexts}]
      이 감정들을 하나로 엮어 서정적이고 시적인 노래 가사를 만들어주세요.
      
      가사의 형식과 어조는 다음 예시를 참고하세요:
      "이제 모두 세월 따라 흔적도 없이 변해갔지만
      덕수궁 돌담길엔 아직 남아 있어요
      다정히 걸어가는 연인들
      언젠가는 우리 모두 세월을 따라 떠나가지만
      언덕 밑 정동길엔 아직 남아있어요
      눈 덮인 조그만 교회당..."
      
      [요구사항]
      1. '1절', '후렴' 같은 명시적인 구분 기호는 넣지 마세요.
      2. 문장이 자연스럽게 이어지는 서사적인 발라드 형식으로 작성하세요.
      3. 학생들이 쓴 단어와 감정들을 가사의 중심 소재로 사용하여 그들의 마음이 느껴지게 하세요.
      4. 특정한 장소나 시각적 이미지를 묘사하여 한 편의 그림 같은 가사를 만드세요.
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

  return JSON.parse(response.text);
};

export const generateSongAudio = async (lyrics: string): Promise<string> => {
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
  if (!base64Audio) throw new Error("Audio generation failed");
  return base64Audio;
};

// Utils for Audio Processing
export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
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
