import { useState, useEffect } from 'react';
import { ReviewForm } from './components/ReviewForm';
import { ProcessingState } from './components/ProcessingState';
import { CompletionState } from './components/CompletionState';

const PROPERTY_ID = 'db38b19b897dbece3e34919c662b3fd66d23b615395d11fb69264dd3a9b17723';

type AppState = 'loading' | 'review' | 'processing' | 'completed';

interface QuestionData {
  questionText: string;
  questionTargetTopic: string | null;
}

export default function App() {
  const [state, setState] = useState<AppState>('loading');
  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadQuestion(); }, []);

  const loadQuestion = async () => {
    setState('loading');
    setError(null);
    try {
      const res = await fetch('/api/generate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: PROPERTY_ID, reviewText: '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const questionText = data.questionAgent?.questionText || data.question;
      if (!questionText) throw new Error('No question was returned.');
      setQuestionData({
        questionText,
        questionTargetTopic: data.gapAnalysisAgent?.targetTopic || data.questionTargetTopic || null,
      });
      setState('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load question.');
      setState('loading'); // stay on loading so error is visible with a retry
    }
  };

  const handleReviewSubmit = async (answer: string, answerSource: string) => {
    if (!questionData) return;
    setState('processing');
    try {
      const res = await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: PROPERTY_ID,
          reviewText: '',
          question: questionData.questionText,
          answer,
          answerSource,
          questionTargetTopic: questionData.questionTargetTopic,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Save failed.');
      }
    } catch {
      // fall through to completed regardless — don't block the user
    }
    setState('completed');
  };

  return (
    <div className="size-full flex items-center justify-center bg-background">
      {/* Mobile container */}
      <div className="w-full h-full max-w-md mx-auto relative overflow-hidden">
        {/* Background texture */}
        <div
          className="absolute inset-0 opacity-[0.015] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/G%3E%3C/svg%3E")`,
          }}
        />

        {/* Main content with smooth transitions */}
        <div className="relative h-full">
          {state === 'loading' && (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <div
                className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary"
                style={{ animation: 'spin 1.5s linear infinite' }}
              />
              {error && (
                <div className="px-6 text-center">
                  <p className="text-[14px] text-red-500 mb-3">{error}</p>
                  <button
                    onClick={loadQuestion}
                    className="px-5 py-2 bg-primary text-primary-foreground rounded-full text-[14px]"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}

          {state === 'review' && questionData && (
            <div
              className="h-full opacity-0 animate-fade-in"
              style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
            >
              <ReviewForm
                questionText={questionData.questionText}
                questionTargetTopic={questionData.questionTargetTopic}
                onSubmit={handleReviewSubmit}
              />
            </div>
          )}

          {state === 'processing' && (
            <div
              className="h-full opacity-0 animate-fade-in"
              style={{ animationFillMode: 'forwards' }}
            >
              <ProcessingState />
            </div>
          )}

          {state === 'completed' && (
            <div
              className="h-full opacity-0 animate-fade-in"
              style={{ animationFillMode: 'forwards' }}
            >
              <CompletionState />
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
