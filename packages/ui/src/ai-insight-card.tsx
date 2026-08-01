import { ArrowUpRight, CheckCircle2, Sparkles } from "lucide-react";

export interface AIInsightCardProps {
  title: string;
  category: string;
  reasoning: string;
  confidenceScore: number;
  actionText: string;
  onAction?: () => void;
  impactLevel?: "High Impact" | "Medium Impact" | "Quick Win";
}

export function AIInsightCard({
  title,
  category,
  reasoning,
  confidenceScore,
  actionText,
  onAction,
  impactLevel = "High Impact",
}: AIInsightCardProps) {
  const impactColors = {
    "High Impact": "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    "Medium Impact": "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    "Quick Win": "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  };

  return (
    <div className="group relative rounded-xl border border-slate-800/80 bg-slate-900/80 p-5 transition-all duration-300 hover:border-indigo-500/40 hover:bg-slate-900 hover:shadow-lg hover:shadow-indigo-500/5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            {category}
          </span>
        </div>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${impactColors[impactLevel]}`}
        >
          {impactLevel}
        </span>
      </div>

      <h4 className="text-base font-semibold text-slate-100 group-hover:text-indigo-300">
        {title}
      </h4>

      <p className="mt-2 text-xs leading-relaxed text-slate-400">{reasoning}</p>

      <div className="mt-4 flex items-center justify-between border-t border-slate-800/60 pt-3">
        <div className="flex items-center space-x-1.5 text-xs text-slate-400">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span>AI Match Confidence: {confidenceScore}%</span>
        </div>

        <button
          onClick={onAction}
          className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <span>{actionText}</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
