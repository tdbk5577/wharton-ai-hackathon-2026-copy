import { Mic, MicOff } from 'lucide-react';
import { useRef } from 'react';

interface VoiceButtonProps {
  isRecording: boolean;
  onToggle: () => void;
  onTranscript: (text: string) => void;
  onBeforeRecord?: () => Promise<void>;
}

export function VoiceButton({ isRecording, onToggle, onTranscript, onBeforeRecord }: VoiceButtonProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const handleClick = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      onToggle();
    } else {
      // Start recording
      try {
        if (onBeforeRecord) {
          await onBeforeRecord();
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const res = await fetch('/api/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioBase64: reader.result }),
              });
              const data = await res.json();
              if (res.ok && data.transcript) {
                onTranscript(data.transcript);
              }
            } catch {
              // transcription failed silently
            }
          };
          reader.readAsDataURL(audioBlob);
        };

        mediaRecorder.start();
        onToggle();
      } catch {
        // microphone denied — do nothing
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`
        relative w-14 h-14 rounded-full flex items-center justify-center
        transition-all duration-300
        ${isRecording
          ? 'bg-primary text-primary-foreground shadow-[0_0_24px_rgba(238,194,24,0.5)]'
          : 'bg-white text-foreground shadow-[0_2px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_16px_rgba(238,194,24,0.2)]'
        }
      `}
    >
      {isRecording ? (
        <MicOff className="w-5 h-5" />
      ) : (
        <Mic className="w-5 h-5" />
      )}

      {isRecording && (
        <>
          <span className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-75" />
          <span className="absolute inset-0 rounded-full border border-primary animate-pulse" />
        </>
      )}
    </button>
  );
}
