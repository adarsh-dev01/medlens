"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  0: SpeechRecognitionAlternativeLike;
  isFinal?: boolean;
};

type SpeechRecognitionResultListLike = ArrayLike<SpeechRecognitionResultLike>;

type SpeechRecognitionEventLike = {
  resultIndex?: number;
  results: SpeechRecognitionResultListLike;
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onnomatch?: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type VoiceInputProps = {
  language: "en" | "es" | "fr" | "hi" | "sw" | "ar";
  onTranscript: (transcript: string) => void;
};

const speechLanguageMap: Record<VoiceInputProps["language"], string> = {
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  hi: "hi-IN",
  sw: "sw-KE",
  ar: "ar-SA"
};

function getRecognitionConstructor() {
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

function mapRecognitionError(errorCode?: string) {
  switch (errorCode) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access was blocked. Allow microphone permission and try again.";
    case "audio-capture":
      return "No microphone was found. Check your device microphone and try again.";
    case "no-speech":
      return "No speech was detected. Please try again.";
    case "network":
      return "Voice input could not reach the speech service. Check your connection and try again.";
    default:
      return "Could not recognize speech. Please try again.";
  }
}

export function VoiceInput({ language, onTranscript }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const receivedTranscriptRef = useRef(false);
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort?.();
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  function stopRecording() {
    recognitionRef.current?.stop();
  }

  function handleClick() {
    if (isRecording) {
      stopRecording();
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setError("Voice input requires a secure browser context. Open this app over HTTPS or localhost.");
      return;
    }

    const Recognition = getRecognitionConstructor();
    if (!Recognition) {
      setError("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    setError(null);
    receivedTranscriptRef.current = false;
    lastErrorRef.current = null;

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = speechLanguageMap[language];
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      const results = Array.from(event.results ?? []);
      const transcript = results
        .slice(event.resultIndex ?? 0)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (transcript) {
        receivedTranscriptRef.current = true;
        onTranscript(transcript);
      }
    };

    recognition.onnomatch = () => {
      lastErrorRef.current = "Could not recognize speech. Please try again.";
      setError(lastErrorRef.current);
    };

    recognition.onerror = (event) => {
      const message = mapRecognitionError(event.error);
      lastErrorRef.current = message;
      setError(message);
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;

      if (!receivedTranscriptRef.current && !lastErrorRef.current) {
        setError("Could not recognize speech. Please try again.");
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setIsRecording(false);
      recognitionRef.current = null;
      setError("Voice input could not start. Check microphone permission and try again.");
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        aria-label={isRecording ? "Stop voice recording" : "Start voice recording"}
        className={cn(
          "inline-flex w-full items-center justify-center gap-3 rounded-full border px-5 py-3 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
          isRecording
            ? "border-red-300 bg-red-50 text-red-700"
            : "border-slate-200 bg-white text-slate-700 hover:border-brand-300"
        )}
      >
        {isRecording ? (
          <>
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
            </span>
            <span>Recording... Click to stop</span>
          </>
        ) : (
          <span>{"\u{1F3A4}"} Speak your symptoms</span>
        )}
      </button>
      <p className="text-xs leading-6 text-slate-500">
        Voice input works best in Chrome or Edge and appends recognized speech to your current symptom text.
      </p>
      {error ? (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          {error}
        </div>
      ) : null}
    </div>
  );
}

