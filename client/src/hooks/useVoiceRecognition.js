import { useCallback, useMemo, useRef, useState } from "react";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export function useVoiceRecognition(defaultLanguage = "en-US") {
  const recognitionRef = useRef(null);
  const [supported] = useState(Boolean(SpeechRecognition));
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [language, setLanguage] = useState(defaultLanguage);
  const [attempts, setAttempts] = useState(0);

  const start = useCallback(() => {
    if (!SpeechRecognition) {
      setError("Speech Recognition API is not supported in this browser.");
      return;
    }

    setError("");
    setTranscript("");
    setAttempts((value) => value + 1);
    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);
    recognition.onerror = (event) => {
      setListening(false);
      setError(event.error === "not-allowed" ? "Microphone permission denied." : "Unable to capture voice command.");
    };
    recognition.onend = () => setListening(false);
    recognition.onresult = (event) => {
      const result = event.results?.[0]?.[0];
      setTranscript(result?.transcript || "");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [language]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return useMemo(() => ({
    supported,
    listening,
    transcript,
    error,
    language,
    attempts,
    setLanguage,
    start,
    stop
  }), [attempts, error, language, listening, start, stop, supported, transcript]);
}
