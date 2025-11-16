import UploadInterface from "@/components/UploadInterface";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="container mx-auto px-8 py-8">
          <div className="text-center animate-fade-in">
            <h1 className="text-3xl font-light tracking-wide text-foreground mb-2">
              Rush or Drag
            </h1>
            <p className="text-sm text-muted-foreground font-light">
              Analyze your vocal timing
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-8 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="animate-slide-up" style={{ animationDelay: "0.2s", opacity: 0, animationFillMode: "forwards" }}>
            <UploadInterface />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
