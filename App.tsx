
import React, { useState, useEffect, useCallback } from 'react';
import { AppStep, UserEmotion, SongResult } from './types';
import { generateLyrics, generateSongAudio, decode, decodeAudioData } from './services/geminiService';
import { Music, MessageSquare, Share2, Sparkles, Users, ArrowRight, Play, Heart, Star, Cloud } from 'lucide-react';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.LANDING);
  const [emotions, setEmotions] = useState<UserEmotion[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [songResult, setSongResult] = useState<SongResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  const startFlow = () => setStep(AppStep.LISTENING);

  const addEmotion = () => {
    if (!currentInput.trim()) return;
    const sentiments: ('positive' | 'neutral' | 'calm' | 'excited' | 'sad')[] = ['positive', 'calm', 'excited', 'sad', 'neutral'];
    const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    const newEmotion: UserEmotion = {
      id: Date.now().toString(),
      text: currentInput.trim(),
      sentiment: randomSentiment,
    };
    setEmotions([...emotions, newEmotion]);
    setCurrentInput('');
  };

  const finalizeEmotions = () => {
    if (emotions.length === 0) {
      alert("먼저 감정을 입력해주세요!");
      return;
    }
    setStep(AppStep.BOARD);
  };

  const createMusic = async () => {
    setIsProcessing(true);
    setStep(AppStep.GENERATING);
    try {
      const lyricsData = await generateLyrics(emotions);
      const audioBase64 = await generateSongAudio(lyricsData.lyrics);
      setSongResult({
        ...lyricsData,
        audioBase64
      });
      setStep(AppStep.RESULT);
    } catch (error) {
      console.error(error);
      alert("음악 생성 중 오류가 발생했습니다.");
      setStep(AppStep.BOARD);
    } finally {
      setIsProcessing(false);
    }
  };

  const playSong = async () => {
    if (!songResult?.audioBase64) return;
    
    let ctx = audioContext;
    if (!ctx) {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      setAudioContext(ctx);
    }
    
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const audioBuffer = await decodeAudioData(
      decode(songResult.audioBase64),
      ctx,
      24000,
      1
    );

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start();
  };

  // Render Step Components
  const renderLanding = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <div className="bg-white/30 backdrop-blur-md p-8 rounded-full mb-8 border border-white/50 shadow-xl">
        <Music className="w-20 h-20 text-indigo-600 animate-pulse" />
      </div>
      <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">공감으로 만드는 음악</h1>
      <p className="text-xl text-gray-700 max-w-xl mb-10">
        연주자의 음악을 감상하고, 우리의 감정을 모아 세상에 하나뿐인 곡을 완성해보세요.
      </p>
      <button 
        onClick={startFlow}
        className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-indigo-600 font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 hover:bg-indigo-700 shadow-lg"
      >
        시작하기
        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );

  const renderListening = () => (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      <div className="relative">
        <div className="absolute inset-0 bg-indigo-400 rounded-full animate-ping opacity-25"></div>
        <div className="relative bg-white p-10 rounded-full shadow-2xl border-4 border-indigo-100">
          <Play className="w-16 h-16 text-indigo-600 ml-1" fill="currentColor" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mt-12 mb-4">음악을 감상하고 있습니다</h2>
      <p className="text-gray-600 mb-8">연주자의 연주에 귀를 기울이며 어떤 감정이 느껴지는지 생각해보세요.</p>
      <div className="flex space-x-2">
        <span className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
        <span className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
        <span className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
      </div>
      <button 
        onClick={() => setStep(AppStep.EMOTION_INPUT)}
        className="mt-16 text-indigo-600 font-semibold hover:underline"
      >
        연주가 끝났나요? 감정 표현하기
      </button>
    </div>
  );

  const renderEmotionInput = () => (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="flex items-center space-x-3 mb-6">
        <MessageSquare className="w-8 h-8 text-indigo-600" />
        <h2 className="text-2xl font-bold text-gray-800">지금 어떤 감정이 느껴지나요?</h2>
      </div>
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-indigo-50">
        <p className="text-gray-600 mb-4">단어나 짧은 문장으로 당신의 마음을 적어주세요.</p>
        <div className="flex space-x-2">
          <input 
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addEmotion()}
            placeholder="예: 따뜻해요, 별이 떠오르는 기분이에요..."
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
          />
          <button 
            onClick={addEmotion}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
          >
            기록하기
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-500 flex items-center">
          <Users className="w-4 h-4 mr-2" /> 내가 남긴 소중한 생각들 ({emotions.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {emotions.map(e => (
            <span key={e.id} className="inline-flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 shadow-sm animate-in slide-in-from-bottom-2">
              {e.text}
              <button 
                onClick={() => setEmotions(emotions.filter(item => item.id !== e.id))}
                className="ml-2 text-indigo-300 hover:text-indigo-600"
              >
                &times;
              </button>
            </span>
          ))}
          {emotions.length === 0 && <p className="text-gray-400 italic">아직 기록된 감정이 없습니다.</p>}
        </div>
      </div>

      <div className="mt-12 flex justify-end">
        <button 
          onClick={finalizeEmotions}
          className="flex items-center bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg"
        >
          공유 보드로 이동 <ArrowRight className="ml-2 w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderBoard = () => (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">우리의 감정 보드</h2>
        <p className="text-gray-600">모든 친구들의 소감을 모아보았습니다. 서로의 마음이 연결되고 있어요.</p>
      </div>
      
      <div className="relative bg-white/60 backdrop-blur-sm rounded-3xl p-10 min-h-[400px] border border-white/50 shadow-inner flex flex-wrap items-center justify-center gap-6">
        {/* Placeholder emotions to simulate a "class" environment */}
        <div className="p-4 bg-pink-100 text-pink-700 rounded-lg shadow-sm rotate-2">바다에 온 기분이 들어요 🌊</div>
        <div className="p-4 bg-yellow-100 text-yellow-700 rounded-lg shadow-sm -rotate-1">따뜻한 햇살 같아요 ☀️</div>
        <div className="p-4 bg-blue-100 text-blue-700 rounded-lg shadow-sm rotate-3">조금 슬프지만 아름다워요..</div>
        
        {emotions.map(e => (
          <div 
            key={e.id}
            className={`p-6 bg-white border-2 border-indigo-100 rounded-2xl shadow-lg transition-transform hover:scale-105 cursor-default ${
              e.sentiment === 'excited' ? 'bg-orange-50' : 
              e.sentiment === 'sad' ? 'bg-indigo-50' : 
              e.sentiment === 'calm' ? 'bg-green-50' : ''
            }`}
          >
            <div className="flex items-center space-x-2 mb-2">
              {e.sentiment === 'positive' && <Star className="w-4 h-4 text-yellow-400 fill-current" />}
              {e.sentiment === 'excited' && <Sparkles className="w-4 h-4 text-orange-400" />}
              {e.sentiment === 'calm' && <Cloud className="w-4 h-4 text-blue-300" />}
              {e.sentiment === 'sad' && <Heart className="w-4 h-4 text-pink-400" />}
              {e.sentiment === 'neutral' && <MessageSquare className="w-4 h-4 text-gray-400" />}
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{e.sentiment}</span>
            </div>
            <p className="text-xl font-semibold text-gray-800">{e.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-col items-center space-y-4">
        <button 
          onClick={createMusic}
          className="flex items-center bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-xl hover:bg-indigo-700 transition-all shadow-xl hover:-translate-y-1 active:translate-y-0"
        >
          <Sparkles className="mr-3 w-6 h-6" /> 이 감정들로 노래 만들기
        </button>
        <p className="text-gray-500 text-sm">AI가 학생들의 소감을 분석하여 가사와 곡을 생성합니다.</p>
      </div>
    </div>
  );

  const renderGenerating = () => (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6">
      <div className="w-32 h-32 relative mb-10">
        <div className="absolute inset-0 border-8 border-indigo-100 rounded-full"></div>
        <div className="absolute inset-0 border-8 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-4">노래를 짓고 있어요</h2>
      <p className="text-gray-600 max-w-md">
        "여러분의 감정들을 조화롭게 섞어 아름다운 선율과 가사를 만들고 있습니다. 잠시만 기다려주세요."
      </p>
      <div className="mt-10 space-y-2 w-full max-w-xs">
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 w-3/4 animate-pulse"></div>
        </div>
        <p className="text-xs text-indigo-500 font-bold uppercase tracking-widest">AI Composition in progress</p>
      </div>
    </div>
  );

  const renderResult = () => (
    <div className="max-w-3xl mx-auto py-10 px-4 pb-32">
      <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-indigo-50">
        <div className="bg-indigo-600 p-10 text-center text-white relative">
          <div className="absolute top-4 right-6 opacity-20">
            <Sparkles className="w-20 h-20" />
          </div>
          <h3 className="text-sm font-bold tracking-[0.2em] uppercase mb-4 opacity-80">우리의 공동 창작곡</h3>
          <h2 className="text-4xl font-black mb-6">{songResult?.title}</h2>
          <button 
            onClick={playSong}
            className="inline-flex items-center bg-white text-indigo-600 px-8 py-4 rounded-full font-bold shadow-xl hover:scale-105 transition-transform"
          >
            <Play className="mr-2 w-5 h-5 fill-current" /> 노래 듣기
          </button>
        </div>
        
        <div className="p-10 md:p-16 text-center bg-indigo-50/20">
          <h4 className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-8">Lyrics</h4>
          <div className="whitespace-pre-line text-lg md:text-2xl text-gray-800 leading-[1.8] font-medium italic">
            {songResult?.lyrics.split('\n').map((line, i) => (
              <p key={i} className="mb-2">
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <button 
          onClick={() => window.print()}
          className="flex items-center px-6 py-3 bg-white text-gray-700 rounded-xl border border-gray-200 font-bold hover:bg-gray-50 shadow-sm"
        >
          <Share2 className="mr-2 w-5 h-5" /> 악보 저장하기
        </button>
        <button 
          onClick={() => setStep(AppStep.LANDING)}
          className="flex items-center px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black shadow-lg"
        >
          다시 시작하기
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Music className="text-white w-5 h-5" />
          </div>
          <span className="font-black text-xl tracking-tight text-gray-900">CO-COMPOSE</span>
        </div>
        <div className="text-xs font-bold text-gray-400 px-3 py-1 border border-gray-200 rounded-full uppercase tracking-widest">
          {step}
        </div>
      </header>

      {/* Main Flow */}
      <main className="container mx-auto">
        {step === AppStep.LANDING && renderLanding()}
        {step === AppStep.LISTENING && renderListening()}
        {step === AppStep.EMOTION_INPUT && renderEmotionInput()}
        {step === AppStep.BOARD && renderBoard()}
        {step === AppStep.GENERATING && renderGenerating()}
        {step === AppStep.RESULT && renderResult()}
      </main>

      {/* Step Indicator (Desktop) */}
      {step !== AppStep.LANDING && step !== AppStep.GENERATING && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur shadow-2xl rounded-2xl px-8 py-4 border border-indigo-100 flex items-center space-x-4 z-50">
          <div className="flex space-x-2">
            {[AppStep.LISTENING, AppStep.EMOTION_INPUT, AppStep.BOARD, AppStep.RESULT].map((s, idx) => (
              <div 
                key={s} 
                className={`w-3 h-3 rounded-full ${
                  step === s ? 'bg-indigo-600 w-8' : 
                  (idx < [AppStep.LISTENING, AppStep.EMOTION_INPUT, AppStep.BOARD, AppStep.RESULT].indexOf(step)) ? 'bg-indigo-200' : 'bg-gray-200'
                } transition-all duration-300`}
              />
            ))}
          </div>
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Workflow</span>
        </div>
      )}
    </div>
  );
};

export default App;
