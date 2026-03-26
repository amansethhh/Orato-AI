import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * VoiceWaveform — Real-time audio visualization.
 *
 * When `audioStream` (a MediaStream) is provided, uses AudioContext + AnalyserNode
 * to drive bar heights from actual microphone amplitude.
 * Falls back to decorative CSS animation when no stream is available.
 *
 * Props:
 *   isRecording  — boolean — whether recording is active
 *   audioStream  — MediaStream | null — the microphone stream from getUserMedia
 *   barCount     — number (default 5)
 */
export default function VoiceWaveform({ isRecording, audioStream = null, barCount = 5 }) {
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const animFrameRef = useRef(null);
  const [barHeights, setBarHeights] = useState(Array(barCount).fill(8));

  useEffect(() => {
    // If we have a real audio stream, set up the AnalyserNode
    if (isRecording && audioStream) {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(audioStream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64; // small FFT for few bars
        analyser.smoothingTimeConstant = 0.7;
        source.connect(analyser);

        audioCtxRef.current = audioCtx;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(dataArray);

          // Pick `barCount` evenly-spaced bins and map 0-255 → 4-32 px
          const step = Math.max(1, Math.floor(dataArray.length / barCount));
          const heights = [];
          for (let i = 0; i < barCount; i++) {
            const val = dataArray[i * step] || 0;
            heights.push(Math.max(4, (val / 255) * 32));
          }
          setBarHeights(heights);
          animFrameRef.current = requestAnimationFrame(tick);
        };

        tick();
      } catch (err) {
        console.warn('[VoiceWaveform] AudioContext setup failed, using CSS fallback:', err);
      }
    }

    return () => {
      // Cleanup
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
      analyserRef.current = null;
      audioCtxRef.current = null;
    };
  }, [isRecording, audioStream, barCount]);

  // If we have a real analyser running, use the computed barHeights
  const hasRealData = isRecording && audioStream && analyserRef.current;

  return (
    <div className="flex items-center justify-center gap-1 h-8">
      {Array.from({ length: barCount }).map((_, i) => (
        hasRealData ? (
          // Real amplitude-driven bars (no framer-motion animation needed)
          <div
            key={i}
            className="w-1 bg-blue-500 rounded-full transition-all duration-75"
            style={{ height: `${barHeights[i]}px` }}
          />
        ) : (
          // Decorative CSS animation fallback
          <motion.div
            key={i}
            className="w-1 bg-blue-500 rounded-full"
            animate={isRecording ? {
              height: [8, 24, 12, 28, 8],
            } : {
              height: 8
            }}
            transition={isRecording ? {
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeInOut"
            } : {
              duration: 0.3
            }}
          />
        )
      ))}
    </div>
  );
}