import { CheckCircle2 } from "lucide-react";

export function CompletionState() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      {/* Success icon with animation */}
      <div
        className="mb-8 opacity-0"
        style={{
          animation:
            "scale-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s forwards",
        }}
      >
        <div className="relative">
          {/* Icon */}
          <CheckCircle2
            className="w-20 h-20 text-primary"
            strokeWidth={1.5}
          />

          {/* Expanding circle background */}
          <div
            className="absolute inset-0 -z-10 bg-primary/10 rounded-full"
            style={{
              animation: "expand-fade 1s ease-out 0.3s",
            }}
          />
        </div>
      </div>

      {/* Main message */}
      <h2
        className="text-[28px] mb-3 text-center opacity-0"
        style={{
          animation: "fade-in 0.5s ease-out 0.5s forwards",
        }}
      >
        Thanks! Your review has been submitted.
      </h2>

      {/* Subtext */}
      <p
        className="text-[15px] text-muted-foreground text-center max-w-[300px] leading-relaxed opacity-0"
        style={{
          animation: "fade-in 0.5s ease-out 0.7s forwards",
        }}
      >
        Your feedback helps improve property information for
        future guests.
      </p>

      {/* Decorative elements */}
      <div
        className="fixed top-0 left-0 w-72 h-72 rounded-full opacity-10 blur-3xl pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(circle, #EEC218 0%, transparent 70%)",
          animation: "float-gentle 8s ease-in-out infinite",
        }}
      />
      <div
        className="fixed bottom-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(circle, #EEC218 0%, transparent 70%)",
          animation:
            "float-gentle 10s ease-in-out infinite reverse",
        }}
      />

      {/* Subtle confetti effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary/20"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `confetti 2s ease-out ${i * 0.1}s`,
              animationFillMode: "both",
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes expand-fade {
          0% {
            transform: scale(1);
            opacity: 0.3;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
        @keyframes float-gentle {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -30px); }
        }
        @keyframes confetti {
          0% {
            opacity: 0;
            transform: translateY(-20px) rotate(0deg);
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(100vh) rotate(720deg);
          }
        }
      `}</style>
    </div>
  );
}