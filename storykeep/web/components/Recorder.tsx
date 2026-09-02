"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The microphone.
 *
 * This is the single most important control in the product, so it does two
 * things at once and never depends on either alone:
 *
 *  1. MediaRecorder captures the audio, which is uploaded and transcribed
 *     server-side when a transcription key is configured. Better accuracy,
 *     works in every browser, handles accents and old voices.
 *  2. The browser's own SpeechRecognition, where it exists, produces a live
 *     transcript as the person speaks — so they can see they are being heard,
 *     which is what stops someone talking into an apparent void and giving up.
 *
 * If the browser has no SpeechRecognition (Firefox), the live caption is
 * simply absent and the recording still works. If audio capture is refused,
 * typing still works. Nothing here is a single point of failure, because the
 * person on the other end may only ever try this once.
 */

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
}

function speechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export interface RecordingResult {
  blob: Blob | null;
  transcript: string;
  seconds: number;
}

export function Recorder({
  onFinish,
  disabled,
  busy,
}: {
  onFinish: (result: RecordingResult) => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [live, setLive] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => cleanup, [cleanup]);

  async function start() {
    setError(null);
    finalRef.current = "";
    setLive("");
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(
        "We couldn't reach your microphone. Check the browser's permission, or just type your answer below — it works exactly the same.",
      );
      return;
    }

    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.start();

    const recognition = speechRecognition();
    if (recognition) {
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || "en-US";
      recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) finalRef.current += result[0].transcript;
          else interim += result[0].transcript;
        }
        setLive((finalRef.current + interim).trim());
      };
      // A recognition error is never surfaced: the audio is still recording,
      // and telling someone mid-sentence that something failed is the fastest
      // way to make them stop talking.
      recognition.onerror = () => undefined;
      recognition.onend = () => undefined;
      try {
        recognition.start();
        recognitionRef.current = recognition;
      } catch {
        recognitionRef.current = null;
      }
    }

    startedAtRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(
      () => setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000)),
      500,
    );
    setRecording(true);
  }

  function stop() {
    const recorder = recorderRef.current;
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    recognitionRef.current?.stop();

    const seconds = Math.round((Date.now() - startedAtRef.current) / 1000);
    const transcript = (finalRef.current || live).trim();

    if (!recorder) {
      onFinish({ blob: null, transcript, seconds });
      return;
    }
    recorder.onstop = () => {
      const blob = chunksRef.current.length
        ? new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
        : null;
      recorder.stream.getTracks().forEach((track) => track.stop());
      onFinish({ blob, transcript, seconds });
    };
    recorder.stop();
  }

  return (
    <div className="stack">
      {error ? <div className="notice warn">{error}</div> : null}

      {recording || live ? (
        <div className="live-transcript" aria-live="polite">
          {live || "Listening…"}
        </div>
      ) : null}

      <div className="row">
        <button
          type="button"
          className={`mic${recording ? " recording" : ""}`}
          onClick={recording ? stop : start}
          disabled={disabled || busy}
          aria-label={recording ? "Stop and send my answer" : "Start talking"}
        >
          {recording ? "■" : "●"}
        </button>
        <div>
          <strong>
            {busy
              ? "Writing that down…"
              : recording
                ? `Listening — ${formatTime(elapsed)}`
                : "Press to answer out loud"}
          </strong>
          <p className="faint" style={{ margin: 0 }}>
            {recording
              ? "Take your time. Press the square when you're finished."
              : "Or type your answer below instead. It makes no difference to the book."}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
