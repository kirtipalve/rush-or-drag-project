import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AnalysisResults from "@/components/AnalysisResults";
import TimeSeriesChart from "@/components/TimeSeriesChart";
import { useEffect, useState } from "react";

type Analysis = {
  overallScore?: number;
  onBeatPercentage?: number;
  rushingPercentage?: number;
  draggingPercentage?: number;
  segments?: Array<{ time: string; issue: string; severity: string }>;
  timeseries?: Array<any>;
};

const Results = () => {
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("beatBuddyAnalysis");
      if (raw) {
        setAnalysis(JSON.parse(raw) as Analysis);
      }
    } catch (e) {
      console.warn("Failed to load analysis from localStorage", e);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="container mx-auto px-8 py-8">
          <div className="flex items-center justify-between animate-fade-in">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="text-center flex-1">
              <h1 className="text-3xl font-light tracking-wide text-foreground mb-2">
                Your Timing Report
              </h1>
              <p className="text-sm text-muted-foreground font-light">
                Detailed analysis of your performance
              </p>
            </div>
            <div className="w-[100px]"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-8 py-16">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Time Series Chart */}
          <div className="animate-slide-up" style={{ animationDelay: "0.1s", opacity: 0, animationFillMode: "forwards" }}>
            <TimeSeriesChart data={analysis?.timeseries} />
          </div>

          {/* Analysis Results */}
          <div className="animate-slide-up" style={{ animationDelay: "0.3s", opacity: 0, animationFillMode: "forwards" }}>
            <AnalysisResults analysis={analysis} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Results;
