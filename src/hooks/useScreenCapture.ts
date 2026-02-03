import { useState, useCallback, useRef } from "react";

export interface TranscriptionSegment {
  text: string;
  speaker?: string;
  timestamp: number;
  isFinal: boolean;
}

interface UseScreenCaptureOptions {
  onTranscription?: (segment: TranscriptionSegment) => void;
  onError?: (error: string) => void;
}

export function useScreenCapture({ onTranscription, onError }: UseScreenCaptureOptions = {}) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcriptions, setTranscriptions] = useState<TranscriptionSegment[]>([]);
  
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Start screen capture with audio transcription
  const startCapture = useCallback(async () => {
    try {
      // Request screen sharing with audio
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
        },
        audio: true,
      });

      screenStreamRef.current = screenStream;

      // Also get microphone audio for the user's voice
      let micStream: MediaStream | null = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        console.log("Microphone not available, continuing with screen audio only");
      }

      // Set up speech recognition for real-time transcription
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const segment: TranscriptionSegment = {
              text: result[0].transcript,
              timestamp: Date.now(),
              isFinal: result.isFinal,
            };

            if (result.isFinal) {
              setTranscriptions(prev => [...prev, segment]);
            }
            
            onTranscription?.(segment);
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          if (event.error !== "aborted") {
            onError?.(`Transcription error: ${event.error}`);
          }
        };

        recognition.onend = () => {
          // Restart recognition if still capturing
          if (isCapturing && !isPaused && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              // Already started, ignore
            }
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      }

      // Set up MediaRecorder for saving the recording
      const tracks = [...screenStream.getTracks()];
      if (micStream) {
        tracks.push(...micStream.getTracks());
      }
      
      const combinedStream = new MediaStream(tracks);
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: "video/webm;codecs=vp9,opus",
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second

      // Handle stream end
      screenStream.getVideoTracks()[0].onended = () => {
        stopCapture();
      };

      setIsCapturing(true);
      setIsPaused(false);
      setTranscriptions([]);
      chunksRef.current = [];

      return true;
    } catch (error: any) {
      console.error("Failed to start screen capture:", error);
      onError?.(error.message || "Failed to start screen capture");
      return false;
    }
  }, [onTranscription, onError, isCapturing, isPaused]);

  // Stop screen capture
  const stopCapture = useCallback(() => {
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    // Stop all tracks
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsCapturing(false);
    setIsPaused(false);
  }, []);

  // Pause/resume capture
  const togglePause = useCallback(() => {
    if (!isCapturing) return;

    if (isPaused) {
      // Resume
      if (mediaRecorderRef.current?.state === "paused") {
        mediaRecorderRef.current.resume();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // Already running
        }
      }
      setIsPaused(false);
    } else {
      // Pause
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.pause();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsPaused(true);
    }
  }, [isCapturing, isPaused]);

  // Get recording as blob
  const getRecording = useCallback((): Blob | null => {
    if (chunksRef.current.length === 0) return null;
    return new Blob(chunksRef.current, { type: "video/webm" });
  }, []);

  // Generate meeting summary from transcriptions
  const generateSummary = useCallback(() => {
    const allText = transcriptions
      .filter(t => t.isFinal)
      .map(t => t.text)
      .join(" ");

    return {
      fullTranscript: allText,
      duration: transcriptions.length > 0 
        ? (transcriptions[transcriptions.length - 1].timestamp - transcriptions[0].timestamp) / 1000
        : 0,
      segmentCount: transcriptions.length,
    };
  }, [transcriptions]);

  // Clear transcriptions
  const clearTranscriptions = useCallback(() => {
    setTranscriptions([]);
  }, []);

  return {
    isCapturing,
    isPaused,
    transcriptions,
    startCapture,
    stopCapture,
    togglePause,
    getRecording,
    generateSummary,
    clearTranscriptions,
  };
}
