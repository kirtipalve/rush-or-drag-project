import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Music } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

const UploadInterface = () => {
  const navigate = useNavigate();
  const [fileName, setFileName] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.includes("audio")) {
        toast({
          title: "Invalid file",
          description: "Please upload an audio file",
          variant: "destructive",
        });
        return;
      }

      setFileName(file.name);
      setIsProcessing(true);

      // Upload to analysis backend
      const form = new FormData();
      form.append("file", file);

      fetch("http://localhost:8000/analyze", {
        method: "POST",
        body: form,
      })
        .then(async (res) => {
          if (!res.ok) {
            const text = await res.text();
            throw new Error(text || "Analysis failed");
          }
          return res.json();
        })
        .then((data) => {
          // store analysis locally for the results page
          try {
            localStorage.setItem("beatBuddyAnalysis", JSON.stringify(data));
          } catch (e) {
            // ignore storage errors
          }

          toast({
            title: "Analysis complete",
            description: "Your timing report is ready",
          });
          navigate("/results");
        })
        .catch((err) => {
          console.error(err);
          toast({
            title: "Analysis failed",
            description: String(err.message || err),
            variant: "destructive",
          });
        })
        .finally(() => setIsProcessing(false));
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="p-12 bg-card border border-border/50 shadow-[var(--shadow-card)] transition-all duration-700 hover:shadow-[var(--shadow-soft)]">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex p-6 rounded-full bg-secondary/50 animate-float">
            <Music className="w-12 h-12 text-foreground/60" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-light text-foreground tracking-wide">
            Upload Your Audio
          </h2>
          <p className="text-muted-foreground font-light max-w-md mx-auto leading-relaxed">
            Upload your vocal performance and receive detailed timing analysis
          </p>
        </div>

        {/* Upload Area */}
        <div className="flex flex-col items-center gap-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <Button
            onClick={handleUploadClick}
            disabled={isProcessing}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-500 hover:scale-105 px-8 py-6 text-base font-light tracking-wide"
          >
            <Upload className="w-5 h-5 mr-3" strokeWidth={1.5} />
            {isProcessing ? "Processing..." : "Select Audio File"}
          </Button>

          {fileName && (
            <div className="animate-fade-in text-center">
              <p className="text-sm text-muted-foreground font-light">
                Selected: <span className="text-foreground">{fileName}</span>
              </p>
            </div>
          )}
        </div>

        {/* Supported Formats */}
        <div className="text-center pt-4 border-t border-border/30">
          <p className="text-xs text-muted-foreground font-light">
            Supports MP3, WAV, M4A, and other audio formats
          </p>
        </div>
      </div>
    </Card>
  );
};

export default UploadInterface;
