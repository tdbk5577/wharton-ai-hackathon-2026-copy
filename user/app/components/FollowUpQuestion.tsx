import { useState } from 'react';
import { VoiceButton } from './VoiceButton';
import { Send, Star } from 'lucide-react';

interface FollowUpQuestionProps {
  question: string;
  context: string;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: string) => void;
}

export function FollowUpQuestion({
  question,
  context,
  questionNumber,
  totalQuestions,
  onAnswer
}: FollowUpQuestionProps) {
  const [answer, setAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [starRating, setStarRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);

  const handleSubmit = () => {
    if (answer.trim() || starRating > 0) {
      const fullAnswer = starRating > 0
        ? `${answer}${answer.trim() ? ' ' : ''}(Rating: ${starRating}/5 stars)`
        : answer;
      onAnswer(fullAnswer);
      setAnswer('');
      setStarRating(0);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleVoiceInput = (transcript: string) => {
    setAnswer(transcript);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Context indicator */}
      <div className="px-6 pt-6 pb-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-muted-foreground">
            {context}
          </p>
          <div className="flex gap-1">
            {Array.from({ length: totalQuestions }).map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                  i < questionNumber
                    ? 'bg-primary w-5'
                    : i === questionNumber
                    ? 'bg-primary'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        {/* AI question bubble */}
        <div
          className="mb-6 opacity-0 animate-slide-in"
          style={{
            animationDelay: '200ms',
            animationFillMode: 'forwards',
          }}
        >
          <div className="flex gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-foreground text-[14px]">✦</span>
            </div>

            {/* Message bubble */}
            <div className="flex-1">
              <div className="bg-white rounded-2xl rounded-tl-md px-5 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
                <p className="text-[15px] leading-relaxed">
                  {question}
                </p>
              </div>

              {/* Star rating below bubble */}
              <div className="mt-3 flex flex-col items-center">
                <p className="text-[13px] text-muted-foreground mb-2.5">leave rating</p>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const starValue = i + 1;
                    const isActive = starValue <= (hoveredStar || starRating);

                    return (
                      <button
                        key={i}
                        onClick={() => setStarRating(starValue)}
                        onMouseEnter={() => setHoveredStar(starValue)}
                        onMouseLeave={() => setHoveredStar(0)}
                        className="transition-all duration-200 hover:scale-110 active:scale-95"
                      >
                        <Star
                          className={`w-9 h-9 transition-colors duration-200 ${
                            isActive
                              ? 'fill-primary text-primary'
                              : 'fill-none text-muted stroke-[2]'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Input area */}
      <div className="px-6 pb-6 pt-4 border-t border-border/50">
        <div className="relative flex items-end gap-3">
          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your answer..."
              rows={1}
              className="w-full resize-none bg-input-background rounded-2xl px-5 py-4 pr-14
                       placeholder:text-muted-foreground/50
                       focus:outline-none focus:ring-2 focus:ring-primary/20
                       transition-all duration-300
                       shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                       max-h-32"
              style={{
                fontFamily: 'var(--font-sans)',
              }}
            />

            {/* Voice button in input */}
            <div className="absolute right-2 bottom-2">
              <div className="scale-75 origin-center">
                <VoiceButton
                  isRecording={isRecording}
                  onToggle={() => setIsRecording(!isRecording)}
                  onTranscript={handleVoiceInput}
                />
              </div>
            </div>
          </div>

          {/* Send button */}
          <button
            onClick={handleSubmit}
            disabled={!answer.trim() && starRating === 0}
            className="w-12 h-12 rounded-full bg-primary text-primary-foreground
                     flex items-center justify-center flex-shrink-0
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all duration-300
                     shadow-[0_4px_12px_rgba(238,194,24,0.24)]
                     hover:shadow-[0_6px_16px_rgba(238,194,24,0.32)]
                     hover:scale-110
                     active:scale-95
                     disabled:hover:scale-100"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
