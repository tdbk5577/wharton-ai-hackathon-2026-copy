import { useState } from "react";
import { VoiceButton } from "./VoiceButton";

interface ReviewInputProps {
  onSubmit: (review: string) => void;
}

export function ReviewInput({ onSubmit }: ReviewInputProps) {
  const [review, setReview] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const handleSubmit = () => {
      onSubmit(review);
  };

  const handleVoiceInput = (transcript: string) => {
    setReview((prev) =>
      prev ? `${prev} ${transcript}` : transcript,
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with subtle gradient */}
      <div className="px-6 pt-8 pb-6">
        <h1 className="text-[32px] leading-[1.2] bg-gradient-to-br from-[#000000] to-[#333333] bg-clip-text text-transparent">
          Share your experience
        </h1>
      </div>

      {/* Main content area */}
      <div className="flex-1 px-6 pb-6 flex flex-col">
        {/* Review textarea */}
        <div className="relative flex-1 mb-6">
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Write your hotel review (or click the voice button for a 'hands-free experience')"
            className="w-full h-full resize-none bg-input-background rounded-2xl px-6 py-5
                     placeholder:text-muted-foreground/50
                     focus:outline-none focus:ring-2 focus:ring-primary/20
                     transition-all duration-300
                     shadow-[0_2px_12px_rgba(238,194,24,0.08)]
                     hover:shadow-[0_4px_16px_rgba(238,194,24,0.12)]"
            style={{
              minHeight: "240px",
              fontFamily: "var(--font-sans)",
            }}
          />

          {/* Voice button overlay */}
          <div className="absolute top-4 right-4">
            <VoiceButton
              isRecording={isRecording}
              onToggle={() => setIsRecording(!isRecording)}
              onTranscript={handleVoiceInput}
            />
          </div>
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
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
          background:
            "radial-gradient(circle, #EEC218 0%, transparent 70%)",
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