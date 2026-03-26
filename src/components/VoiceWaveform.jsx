import React from 'react';
import { motion } from 'framer-motion';

export default function VoiceWaveform({ isRecording, barCount = 5 }) {
  return (
    <div className="flex items-center justify-center gap-1 h-8">
      {Array.from({ length: barCount }).map((_, i) => (
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
      ))}
    </div>
  );
}