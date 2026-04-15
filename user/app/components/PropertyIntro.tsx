import { Star, MapPin, Calendar } from 'lucide-react';

interface PropertyIntroProps {
  onStartReview: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function PropertyIntro({ onStartReview, isLoading = false, error }: PropertyIntroProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-[32px] leading-[1.2] mb-2">
          Review your stay
        </h1>
        <p className="text-[15px] text-muted-foreground">
          Your feedback helps future travelers
        </p>
      </div>

      {/* Property card */}
      <div className="px-6 mb-6">
        <div
          className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)]
                     transition-all duration-300 hover:shadow-[0_6px_24px_rgba(0,0,0,0.12)]"
        >
          {/* Property image */}
          <div className="relative h-48 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1723465308831-29da05e011f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3RlbCUyMGV4dGVyaW9yJTIwYnVpbGRpbmd8ZW58MXx8fHwxNzc2MTc5MDQ1fDA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Grand Plaza Hotel & Suites"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <div className="absolute top-4 right-4 bg-foreground text-background px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-primary text-primary" />
              <span className="text-[14px] font-medium">4.2</span>
            </div>
          </div>

          {/* Property details */}
          <div className="p-5">
            <h2 className="text-[22px] mb-3">
              Grand Plaza Hotel & Suites
            </h2>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-[14px] text-muted-foreground">
                  Downtown San Francisco, CA
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-[14px] text-muted-foreground">
                  March 10-14, 2026 · 4 nights
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info section */}
      <div className="px-6 mb-6">
        <div className="bg-primary/5 rounded-2xl p-5 border border-primary/20">
          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-[18px]">✦</span>
              </div>
            </div>
            <div>
              <h3 className="text-[16px] font-medium mb-1.5">
                Got a minute? Share quick feedback.
              </h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Your experience can help others make better decisions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-6 mb-4">
          <p className="text-[13px] text-red-500 text-center">{error}</p>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* CTA button */}
      <div className="px-6 pb-6">
        <button
          onClick={onStartReview}
          disabled={isLoading}
          className="w-full bg-primary text-primary-foreground py-4 rounded-2xl
                   disabled:opacity-70 disabled:cursor-not-allowed
                   transition-all duration-300
                   shadow-[0_4px_16px_rgba(238,194,24,0.24)]
                   hover:shadow-[0_6px_20px_rgba(238,194,24,0.32)]
                   hover:scale-[1.02]
                   active:scale-[0.98]
                   disabled:hover:scale-100"
        >
          {isLoading ? 'Preparing your question…' : 'Start your review'}
        </button>
      </div>

      {/* Decorative gradient orb */}
      <div
        className="fixed bottom-0 left-0 w-72 h-72 rounded-full opacity-15 blur-3xl pointer-events-none -z-10"
        style={{
          background: 'radial-gradient(circle, #EEC218 0%, transparent 70%)',
          animation: 'float 8s ease-in-out infinite',
        }}
      />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(-20%, 20%); }
          50% { transform: translate(-10%, 10%); }
        }
      `}</style>
    </div>
  );
}
