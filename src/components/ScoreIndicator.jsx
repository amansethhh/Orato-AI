import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const scoreColors = {
  low: 'bg-amber-100 text-amber-700 border-amber-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  high: 'bg-green-100 text-green-700 border-green-200'
};

const scoreLabels = {
  low: 'Developing',
  medium: 'Good',
  high: 'Strong'
};

export default function ScoreIndicator({ label, score, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, type: "spring", stiffness: 300 }}
      className="flex items-center justify-between py-2"
    >
      <span className="text-sm text-gray-600 font-medium">{label}</span>
      <span className={cn(
        "px-3 py-1 rounded-full text-xs font-semibold border",
        scoreColors[score]
      )}>
        {scoreLabels[score]}
      </span>
    </motion.div>
  );
}