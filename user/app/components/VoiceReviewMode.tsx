import { useState, useRef } from 'react';
import { Mic, MicOff, ArrowLeft, Send } from 'lucide-react';

interface VoiceReviewModeProps {
  questionText: string;
  onSubmit: (answer: string) => void;
  onBackToText: () => void;
}

interface ConversationMessage {
  id: number;
  type: 'ai' | 'user';
  text: string;
}

export function VoiceReviewMode({ questionText, onSubmit, onBackToText }: VoiceReviewModeProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([
    { id: 1, type: 'ai', text: questionText }
  ]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const addMessage = (type: 'ai' | 'user', text: string) => {
    setMessages(prev => [...prev, { id: prev.length + 1, type, text }]);
  };

  const handleAnswer = (answer: string) => {
    if (!answer.trim()) return;
    addMessage('user', answer);
    setTimeout(() => {
      addMessage('ai', "Thank you! Your feedback has been saved.");
      setTimeout(() => onSubmit(answer), 1500);
    }, 600);
  };

  const handleSendText = () => {
    const answer = textInput.trim();
    if (!answer) return;
    setTextInput('');
    handleAnswer(answer);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsTranscribing(true);
        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: reader.result }),
            });
            const data = await res.json();
            setIsTranscribing(false);
            if (res.ok && data.transcript) {
              handleAnswer(data.transcript);
            }
          };
          reader.readAsDataURL(audioBlob);
        } catch {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      // microphone denied — do nothing
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-[32px] leading-[1.2] bg-gradient-to-br from-[#000000] to-[#333333] bg-clip-text text-transparent">
            Voice Review
          </h1>
          <button
            onClick={onBackToText}
            className="px-4 py-2 rounded-full transition-all duration-300 flex items-center gap-2
                     bg-white text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.08)]
                     hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[13px] font-medium">Text mode</span>
          </button>
        </div>
        <p className="text-[15px] text-muted-foreground">
          Tap the mic to speak your answer
        </p>
      </div>

      {/* Conversation area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 opacity-0 animate-slide-in ${message.type === 'user' ? 'flex-row-reverse' : ''}`}
            style={{ animationFillMode: 'forwards' }}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${
              message.type === 'ai' ? 'bg-gradient-to-br from-primary to-primary' : 'bg-foreground'
            }`}>
              <span className={message.type === 'ai' ? 'text-foreground text-[14px]' : 'text-background text-[14px]'}>
                {message.type === 'ai' ? '✦' : '👤'}
              </span>
            </div>
            <div className={`flex-1 max-w-[75%] ${message.type === 'user' ? 'flex justify-end' : ''}`}>
              <div className={`rounded-2xl px-5 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)] ${
                message.type === 'ai' ? 'bg-white rounded-tl-md' : 'bg-foreground text-background rounded-tr-md'
              }`}>
                <p className="text-[15px] leading-relaxed">{message.text}</p>
              </div>
            </div>
          </div>
        ))}

        {isTranscribing && (
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-[14px] animate-pulse">…</span>
            </div>
            <div className="bg-white rounded-2xl rounded-tl-md px-5 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <p className="text-[14px] text-muted-foreground animate-pulse">Transcribing…</p>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="px-6 pb-6 pt-4 border-t border-border/50">
        {/* Text input row */}
        <div className="flex items-end gap-3 mb-4">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
            placeholder="Or type your answer..."
            rows={1}
            className="flex-1 resize-none bg-muted/30 rounded-2xl px-4 py-3
                     placeholder:text-muted-foreground/50
                     focus:outline-none focus:ring-2 focus:ring-primary/20
                     transition-all duration-300 max-h-32"
            style={{ fontFamily: 'var(--font-sans)' }}
          />
          <button
            onClick={handleSendText}
            disabled={!textInput.trim()}
            className="w-12 h-12 rounded-full bg-primary text-primary-foreground
                     flex items-center justify-center flex-shrink-0
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all duration-300
                     shadow-[0_4px_12px_rgba(238,194,24,0.24)]
                     hover:scale-110 active:scale-95 disabled:hover:scale-100"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Mic button */}
        <div className="flex flex-col items-center">
          {isRecording && (
            <p className="text-[14px] text-muted-foreground mb-3 animate-pulse">Listening… tap to stop</p>
          )}
          <button
            onClick={toggleRecording}
            disabled={isTranscribing}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 relative ${
              isRecording
                ? 'bg-primary text-primary-foreground shadow-[0_0_32px_rgba(238,194,24,0.6)] scale-110'
                : 'bg-primary text-primary-foreground shadow-[0_4px_20px_rgba(238,194,24,0.3)]'
            } disabled:opacity-50`}
          >
            {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            {isRecording && (
              <>
                <span className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-75" />
                <span className="absolute inset-0 rounded-full border border-primary animate-pulse" />
              </>
            )}
          </button>
        </div>
      </div>

      <div
        className="fixed top-1/4 right-0 w-64 h-64 rounded-full opacity-15 blur-3xl pointer-events-none -z-10"
        style={{ background: 'radial-gradient(circle, #EEC218 0%, transparent 70%)', animation: 'float-slow 10s ease-in-out infinite' }}
      />

      <style>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in { animation: slide-in 0.5s ease-out; }
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-20px, 20px); }
        }
      `}</style>
    </div>
  );
}
