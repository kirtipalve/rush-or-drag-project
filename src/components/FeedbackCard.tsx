import { Card } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";

interface FeedbackItem {
  time: string;
  issue: string;
  severity: "high" | "medium" | "low" | "positive";
}

interface FeedbackCardProps {
  title: string;
  items: FeedbackItem[];
}

const FeedbackCard = ({ title, items }: FeedbackCardProps) => {
  const getIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return <AlertCircle className="w-4 h-4 text-rushing" />;
      case "medium":
        return <AlertTriangle className="w-4 h-4 text-dragging" />;
      case "positive":
        return <CheckCircle2 className="w-4 h-4 text-on-beat" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className="p-6 bg-card border-border shadow-[var(--shadow-card)]">
      <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50 hover:bg-secondary/50 transition-colors"
          >
            {getIcon(item.severity)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{item.issue}</p>
              <p className="text-xs text-muted-foreground mt-1">at {item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default FeedbackCard;
