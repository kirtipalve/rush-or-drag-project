import React from "react";

type TTStatus = "on-beat" | "rushing" | "dragging" | "unknown";

const classifyOffset = (offset_ms: number, thresh = 70) => {
  if (Math.abs(offset_ms) <= thresh) return "on-beat";
  if (offset_ms < -thresh) return "rushing";
  if (offset_ms > thresh) return "dragging";
  return "unknown" as TTStatus;
};

interface TimeseriesPoint {
  time: number;
  offset_ms: number;
}

type TimingTimelineProps = {
  timeseries?: TimeseriesPoint[] | null;
  segments?: Array<{ time: string; issue: string; severity: string }> | null;
};

const TimingTimeline: React.FC<TimingTimelineProps> = ({ timeseries, segments }) => {
  // If timeseries/segments are not passed, try loading from localStorage (same key UploadInterface uses)
  if ((!timeseries || timeseries.length === 0) && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("beatBuddyAnalysis");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!timeseries && parsed?.timeseries) {
          timeseries = parsed.timeseries as TimeseriesPoint[];
        }
        if ((!segments || segments.length === 0) && parsed?.segments) {
          segments = parsed.segments as Array<{ time: string; issue: string; severity: string }>;
        }
      }
    } catch (e) {
      // ignore parse errors
    }
  }
  // Build timeline from timeseries if available, otherwise fallback to mock data
  let timelineData: Array<{ start: number; end: number; status: TTStatus }> = [];

  if (timeseries && timeseries.length > 0) {
    const pts = timeseries.slice().sort((a, b) => a.time - b.time);
    const duration = (pts[pts.length - 1].time || 0) + 1;

    // classify each second
    const perSecond: TTStatus[] = [];
    for (let s = 0; s < duration; s++) {
      const found = pts.find((p) => Math.round(p.time) === s);
      if (found) {
        perSecond.push(classifyOffset(found.offset_ms));
      } else {
        perSecond.push("on-beat");
      }
    }

    // compress into segments
    let curStatus = perSecond[0] || "on-beat";
    let curStart = 0;
    for (let i = 1; i <= perSecond.length; i++) {
      const s = perSecond[i];
      if (s !== curStatus) {
        timelineData.push({ start: curStart, end: i, status: curStatus });
        curStatus = s || "on-beat";
        curStart = i;
      }
    }
  } else if (segments && segments.length > 0) {
    // crude fallback: mark 3s windows around segment times
    const parsed = segments
      .map((seg) => {
        // try parse mm:ss or m:ss
        const parts = seg.time.split(":").map((p) => parseInt(p, 10));
        let seconds = 0;
        if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
        else seconds = parts[0] || 0;
        const status = seg.issue.toLowerCase().includes("rush") ? "rushing" : seg.issue.toLowerCase().includes("drag") ? "dragging" : "on-beat";
        return { start: Math.max(0, seconds - 2), end: seconds + 2, status: status as TTStatus };
      })
      .sort((a, b) => a.start - b.start);

    timelineData = parsed;
  } else {
    // Mock timeline data - replace with actual analysis
    timelineData = [
      { start: 0, end: 15, status: "on-beat" },
      { start: 15, end: 23, status: "rushing" },
      { start: 23, end: 35, status: "on-beat" },
      { start: 35, end: 45, status: "on-beat" },
      { start: 45, end: 52, status: "dragging" },
      { start: 52, end: 75, status: "on-beat" },
      { start: 75, end: 85, status: "rushing" },
      { start: 85, end: 100, status: "on-beat" },
    ];
  }

  const getColor = (status: string) => {
    switch (status) {
      case "on-beat":
        return "bg-on-beat";
      case "rushing":
        return "bg-rushing";
      case "dragging":
        return "bg-dragging";
      default:
        return "bg-muted";
    }
  };

  // determine total span for percent widths
  const total = timelineData.reduce((acc, s) => Math.max(acc, s.end), 0) || 1;

  return (
    <div className="space-y-4">
      <div className="h-16 bg-secondary/30 rounded-lg border border-border flex overflow-hidden">
        {timelineData.map((segment, index) => {
          const widthPct = ((segment.end - segment.start) / total) * 100;
          return (
            <div
              key={index}
              className={`${getColor(segment.status)} transition-all hover:brightness-110`}
              style={{ width: `${widthPct}%` }}
              title={`${segment.start}s - ${segment.end}s: ${segment.status}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-on-beat" />
          <span className="text-muted-foreground">On Beat</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-rushing" />
          <span className="text-muted-foreground">Rushing</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-dragging" />
          <span className="text-muted-foreground">Dragging</span>
        </div>
      </div>

      {/* Time markers */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0:00</span>
        <span>0:30</span>
        <span>1:00</span>
        <span>1:30</span>
      </div>
    </div>
  );
};

export default TimingTimeline;
