import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";
import TimingTimeline from "./TimingTimeline";
import FeedbackCard from "./FeedbackCard";

type Segment = { time: string; issue: string; severity: "high" | "medium" | "low" | "positive" };

const AnalysisResults = ({
  analysis,
}: {
  analysis?: {
    overallScore?: number;
    onBeatPercentage?: number;
    rushingPercentage?: number;
    draggingPercentage?: number;
    segments?: Segment[];
    timeseries?: Array<{ time: number; offset_ms: number }>;
    strong_moments?: Segment[];
  };
}) => {
  // Use values from analysis (from backend) or fall back to mocks
  const overallScore = analysis?.overallScore ?? 78;
  const onBeatPercentage = analysis?.onBeatPercentage ?? 65;
  const rushingPercentage = analysis?.rushingPercentage ?? 25;
  const draggingPercentage = analysis?.draggingPercentage ?? 10;
  const segments: Segment[] =
    analysis?.segments ?? [
      { time: "0:15-0:23", issue: "Rushing the chorus entry", severity: "high" },
      { time: "0:45-0:52", issue: "Slight dragging on sustained notes", severity: "medium" },
      { time: "1:20-1:28", issue: "Inconsistent timing on runs", severity: "medium" },
    ];

  // Derive strong moments from timeseries: contiguous regions where abs(offset_ms) <= threshold
  const strongMoments: Segment[] = (() => {
    const ts = analysis?.timeseries;
    if (!ts || ts.length === 0) return [];

    const threshold = 30; // ms considered "very on-beat"
    const pts = (ts as Array<any>).slice().sort((a, b) => a.time - b.time);
    const flags = pts.map((p) => ({ time: p.time, ok: Math.abs(p.offset_ms) <= threshold, offset: p.offset_ms }));

    const groups: Array<{ start: number; end: number; values: number[] }> = [];
    let cur: { start: number; end: number; values: number[] } | null = null;
    for (const f of flags) {
      if (f.ok) {
        if (!cur) cur = { start: f.time, end: f.time + 1, values: [f.offset] };
        else {
          cur.end = f.time + 1;
          cur.values.push(f.offset);
        }
      } else {
        if (cur) {
          groups.push(cur);
          cur = null;
        }
      }
    }
    if (cur) groups.push(cur);

    // Only keep groups longer than 1s
    return groups
      .filter((g) => g.end - g.start >= 1)
      .map((g) => {
        const avg = Math.round((g.values.reduce((a, b) => a + b, 0) / g.values.length) || 0);
        const startMin = Math.floor(g.start / 60);
        const startSec = Math.floor(g.start % 60)
          .toString()
          .padStart(2, "0");
        const endMin = Math.floor((g.end - 1) / 60);
        const endSec = Math.floor((g.end - 1) % 60)
          .toString()
          .padStart(2, "0");
        return {
          time: `${startMin}:${startSec}-${endMin}:${endSec}`,
          issue: `Consistently on-beat (avg ${avg}ms)`,
          severity: "positive" as const,
        };
      });
  })();

  // prefer server-provided strong moments when available
  const serverStrong: Segment[] | undefined = analysis?.strong_moments;
  const strongToShow: Segment[] = serverStrong && serverStrong.length > 0 ? serverStrong : strongMoments;


  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card className="p-6 bg-card border-border shadow-[var(--shadow-card)]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Analysis Results</h2>
            <Badge className="bg-primary/20 text-primary border-primary/30">
              Overall Score: {overallScore}%
            </Badge>
          </div>

          {/* Timing Breakdown */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-on-beat" />
                <span>On Beat</span>
              </div>
              <Progress value={onBeatPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">{onBeatPercentage}% of performance</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4 text-rushing" />
                <span>Rushing</span>
              </div>
              <Progress value={rushingPercentage} className="h-2 [&>div]:bg-rushing" />
              <p className="text-xs text-muted-foreground">{rushingPercentage}% of performance</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingDown className="w-4 h-4 text-dragging" />
                <span>Dragging</span>
              </div>
              <Progress value={draggingPercentage} className="h-2 [&>div]:bg-dragging" />
              <p className="text-xs text-muted-foreground">{draggingPercentage}% of performance</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Timeline Visualization */}
      <Card className="p-6 bg-card border-border shadow-[var(--shadow-card)]">
  <h3 className="text-lg font-semibold text-foreground mb-4">Timing Timeline</h3>
  <TimingTimeline />
      </Card>

      {/* Feedback Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <FeedbackCard title="Areas for Improvement" items={segments} />
        <FeedbackCard title="Strong Moments" items={strongToShow} />
      </div>
    </div>
  );
};

export default AnalysisResults;
