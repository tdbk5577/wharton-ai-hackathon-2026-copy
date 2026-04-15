export function ProcessingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      {/* Animated loader */}
      <div className="relative mb-8">
        {/* Outer rotating ring */}
        <div
          className="w-20 h-20 rounded-full border-2 border-primary/20 border-t-primary"
          style={{
            animation: 'spin 1.5s linear infinite',
          }}
        />

        {/* Inner pulsing dot */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full"
          style={{
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      </div>

      {/* Main message */}
      <h2 className="text-[26px] mb-3 text-center">
        Submitting your review…
      </h2>

      {/* Decorative gradient orbs */}
      <div
        className="fixed top-1/4 left-0 w-48 h-48 rounded-full opacity-15 blur-3xl pointer-events-none -z-10"
        style={{
          background: 'radial-gradient(circle, #EEC218 0%, transparent 70%)',
          animation: 'float-slow 10s ease-in-out infinite',
        }}
      />
      <div
        className="fixed bottom-1/4 right-0 w-56 h-56 rounded-full opacity-15 blur-3xl pointer-events-none -z-10"
        style={{
          background: 'radial-gradient(circle, #EEC218 0%, transparent 70%)',
          animation: 'float-slow 12s ease-in-out infinite reverse',
        }}
      />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.5; transform: translate(-50%, -50%) scale(1.5); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translate(-20%, 0); }
          50% { transform: translate(20%, 20%); }
        }
      `}</style>
    </div>
  );
}
