import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

// Accept `data` prop produced by analysis endpoint. If not provided, fall back to mock.
type SeriesPoint = {
  time: number; // seconds
  backtrack?: number;
  voice?: number;
  offset_ms?: number; // vocal offset relative to nearest beat (ms)
};

const generateTimeSeriesData = () => {
  const data: SeriesPoint[] = [];
  for (let i = 0; i <= 60; i++) {
    data.push({
      time: i,
      backtrack: 50 + Math.sin(i / 5) * 10 + Math.random() * 5,
      voice: 50 + Math.sin(i / 5 + 0.5) * 12 + Math.random() * 8,
    });
  }
  return data;
};

const TimeSeriesChart = ({ data }: { data?: SeriesPoint[] }) => {
  const plot = data && data.length ? data : generateTimeSeriesData();
  const hasOffset = plot.length > 0 && Object.prototype.hasOwnProperty.call(plot[0], "offset_ms");

  return (
    <Card className="p-6 bg-card border-border shadow-[var(--shadow-card)]">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-light text-foreground mb-2">Time Series Analysis</h2>
          <p className="text-sm text-muted-foreground font-light">
            Visual comparison of backtrack timing and vocal performance
          </p>
        </div>

        <div className="w-full h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={plot}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="time"
                label={{ value: "Time (seconds)", position: "insideBottom", offset: -5 }}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis
                label={{ value: hasOffset ? "Offset (ms)" : "Amplitude", angle: -90, position: "insideLeft" }}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend
                wrapperStyle={{ paddingTop: "20px" }}
                iconType="line"
              />
              {hasOffset ? (
                <>
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="offset_ms"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    dot={false}
                    name="Offset (ms)"
                  />
                </>
              ) : (
                <>
                  <Line
                    type="monotone"
                    dataKey="backtrack"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    name="Backtrack"
                  />
                  <Line
                    type="monotone"
                    dataKey="voice"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    dot={false}
                    name="Voice"
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-center gap-8 pt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-primary"></div>
            <span className="font-light">Backtrack Reference</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-accent"></div>
            <span className="font-light">Your Voice</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TimeSeriesChart;
