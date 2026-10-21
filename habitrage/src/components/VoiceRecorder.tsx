import React, { useState, useRef } from 'react';
import { Mic, Square } from 'lucide-react';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  openRouterKey: string;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onTranscription, openRouterKey }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    audioChunksRef.current = [];
    
    mediaRecorderRef.current.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result;
        
        const response = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            audio: base64Audio, 
            openRouterKey 
          })
        });

        if (!response.ok) {
          console.error('Transcription failed');
          return;
        }

        const data = await response.json();
        onTranscription(data.text);
      };
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <button 
      onClick={isRecording ? stopRecording : startRecording}
      className={`p-4 rounded-[22px] transition-all ${isRecording ? 'bg-red-500 text-white' : 'bg-white border border-[#E2E8F0] text-[#718096] hover:text-[#2D34FB]'}`}
    >
      {isRecording ? <Square className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
    </button>
  );
};
