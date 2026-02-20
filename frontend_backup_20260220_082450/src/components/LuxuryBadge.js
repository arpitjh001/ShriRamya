import React from 'react';
import { Sparkles } from 'lucide-react';

const LuxuryBadge = ({ className = '' }) => {
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-secondary/20 to-primary/10 border border-secondary/30 rounded-full ${className}`}>
      <Sparkles className="h-3.5 w-3.5 text-secondary" />
      <span className="text-xs font-medium text-foreground tracking-wider">LUXURY</span>
    </div>
  );
};

export default LuxuryBadge;