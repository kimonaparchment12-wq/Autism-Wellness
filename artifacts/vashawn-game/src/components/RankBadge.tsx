import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Shield, Zap, Crown } from 'lucide-react';
import { getRankDetails } from '@/hooks/use-game-logic';

export function RankBadge({ count }: { count: number }) {
  const { rank, progress, nextAt } = getRankDetails(count);
  const percentage = Math.min(100, Math.max(0, (progress / nextAt) * 100));

  const rankConfig = {
    Noob: { color: "text-zinc-400", bg: "bg-zinc-100", icon: Shield },
    Rookie: { color: "text-emerald-500", bg: "bg-emerald-50", icon: Zap },
    Beginner: { color: "text-blue-500", bg: "bg-blue-50", icon: Star },
    Pro: { color: "text-purple-500", bg: "bg-purple-50", icon: Trophy },
    Legendary: { color: "text-amber-500", bg: "bg-amber-50", icon: Crown },
  };

  const config = rankConfig[rank];
  const Icon = config.icon;

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-3 bg-white/80 backdrop-blur-md rounded-2xl p-2 pr-4 shadow-sm border border-white/50"
    >
      <div className={`p-2 rounded-xl ${config.bg} ${config.color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex flex-col min-w-[100px]">
        <div className="flex justify-between items-center text-xs font-bold mb-1">
          <span className={config.color}>{rank}</span>
          <span className="text-muted-foreground">{progress}/{nextAt}</span>
        </div>
        <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
          <motion.div 
            className={`h-full rounded-full ${config.color.replace('text-', 'bg-')}`}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}
