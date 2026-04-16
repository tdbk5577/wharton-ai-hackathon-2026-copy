import { useState } from "react";
import { VoiceReviewMode } from "./VoiceReviewMode";
import { Star } from "lucide-react";
import { VoiceButton } from "./VoiceButton";

interface ReviewFormProps {
  questionText: string;
  questionTargetTopic: string | null;
  audioUrl: string | null;
  onSubmit: (answer: string, answerSource: string) => void;
}

function playAudio(audioUrl: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(audioUrl);
    audio.onended = resolve;
    audio.onerror = () => resolve();
    audio.play().catch(() => resolve());
  });
}

export function ReviewForm({ questionText, questionTargetTopic, audioUrl, onSubmit }: ReviewFormProps) {
  const [answer, setAnswer] = useState("");
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [overallRating, setOverallRating] = useState(0);
  const [hoveredOverallStar, setHoveredOverallStar] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  const handleSubmit = () => {
    const fullAnswer = overallRating > 0
      ? `${answer}${answer.trim() ? ' ' : ''}(Rating: ${overallRating}/5 stars)`
      : answer;
    onSubmit(fullAnswer.trim() || `Rating: ${overallRating}/5 stars`, 'text');
  };

  const canSubmit = answer.trim().length > 0 || overallRating > 0;

  const topicLabel = questionTargetTopic
    ? questionTargetTopic.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'Your Experience';

  if (isVoiceMode) {
    return (
      <VoiceReviewMode
        questionText={questionText}
        audioUrl={audioUrl}
        onSubmit={(answer: string) => onSubmit(answer, 'voice')}
        onBackToText={() => setIsVoiceMode(false)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 pt-8 pb-6 sticky top-0 bg-background z-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-[32px] leading-[1.2] bg-gradient-to-br from-[#000000] to-[#333333] bg-clip-text text-transparent">
            Share your experience
          </h1>

          {/* Voice mode toggle */}
          <button
            onClick={async () => {
              if (audioUrl) await playAudio(audioUrl);
              setIsVoiceMode(true);
            }}
            className="px-4 py-2 rounded-full transition-all duration-300 flex items-center gap-2
                       bg-white text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" />
            </svg>
            <span className="text-[13px] font-medium">Voice</span>
          </button>
        </div>
        <p className="text-[15px] text-muted-foreground">
          Write your review below or tap Voice for a hands-free experience
        </p>
      </div>

      {/* Question card */}
      <div className="px-6 pb-8">
        {/* Topic indicator */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-[13px] font-medium">✦</span>
          </div>
          <span className="text-[13px] text-muted-foreground">{topicLabel}</span>
        </div>

        <div className="bg-white rounded-2xl px-5 py-5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          {/* Dynamic question */}
          <p className="text-[15px] leading-relaxed mb-4">
            {questionText}
          </p>

          {/* Star rating */}
          <div className="flex flex-col items-center mb-4">
            <p className="text-[13px] text-muted-foreground mb-2.5">Leave a rating</p>
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => {
                const starValue = i + 1;
                const isActive = starValue <= (hoveredOverallStar || overallRating);
                return (
                  <button
                    key={i}
                    onClick={() => setOverallRating(starValue)}
                    onMouseEnter={() => setHoveredOverallStar(starValue)}
                    onMouseLeave={() => setHoveredOverallStar(0)}
                    className="transition-all duration-200 hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={`w-9 h-9 transition-colors duration-200 ${
                        isActive
                          ? "fill-primary text-primary"
                          : "fill-none text-foreground/40 stroke-[2.5]"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border/50 mb-4" />

          {/* Answer input with voice button */}
          <div className="relative">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Share your thoughts..."
              className="w-full resize-none bg-muted/30 rounded-xl px-4 py-3 pr-16
                       placeholder:text-muted-foreground/50
                       focus:outline-none focus:ring-2 focus:ring-primary/20
                       transition-all duration-300"
              rows={4}
              style={{ fontFamily: "var(--font-sans)" }}
            />
            <div className="absolute right-2 bottom-2 scale-75 origin-bottom-right">
              <VoiceButton
                isRecording={isRecording}
                onToggle={() => setIsRecording(!isRecording)}
                onTranscript={(text) => {
                  setAnswer(text);
                  setIsRecording(false);
                }}
                onBeforeRecord={audioUrl ? () => playAudio(audioUrl) : undefined}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Submit button */}
      <div className="px-6 pb-6 pt-4 sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full bg-primary text-primary-foreground py-4 rounded-2xl
                   disabled:opacity-40 disabled:cursor-not-allowed
                   transition-all duration-300
                   shadow-[0_4px_16px_rgba(238,194,24,0.24)]
                   hover:shadow-[0_6px_20px_rgba(238,194,24,0.32)]
                   hover:scale-[1.02]
                   active:scale-[0.98]
                   disabled:hover:scale-100 disabled:hover:shadow-[0_4px_16px_rgba(238,194,24,0.24)]"
        >
          Submit review
        </button>
      </div>

      {/* Decorative gradient orb */}
      <div
        className="fixed top-0 right-0 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none -z-10"
        style={{
          background: "radial-gradient(circle, #EEC218 0%, transparent 70%)",
          animation: "float 8s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(20%, -20%); }
          50% { transform: translate(10%, -30%); }
        }
      `}</style>
    </div>
  );
}
