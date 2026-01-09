
export enum AppStep {
  LANDING = 'LANDING',
  LISTENING = 'LISTENING',
  EMOTION_INPUT = 'EMOTION_INPUT',
  BOARD = 'BOARD',
  GENERATING = 'GENERATING',
  RESULT = 'RESULT'
}

export interface UserEmotion {
  id: string;
  text: string;
  sentiment: 'positive' | 'neutral' | 'calm' | 'excited' | 'sad';
}

export interface SongResult {
  title: string;
  lyrics: string;
  audioBase64?: string;
}
