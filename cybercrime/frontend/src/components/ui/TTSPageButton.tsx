import { useState, useEffect } from "react";
import { Volume2, VolumeX, Loader2, Play, Square } from "lucide-react";
import { Button } from "./button";
import { ttsService } from "@/utils/textToSpeech";

interface TTSPageButtonProps {
  className?: string;
  containerSelector?: string;
}

export function TTSPageButton({ 
  className = "", 
  containerSelector = "main, .content-area, .dashboard-content" 
}: TTSPageButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const extractPageContent = () => {
    // Select the main content container(s)
    const containers = document.querySelectorAll(containerSelector);
    if (!containers || containers.length === 0) return "";

    let fullText = "";
    containers.forEach((container) => {
      // Get all text-bearing elements
      const elements = container.querySelectorAll("h1, h2, h3, h4, p, li, .content-text, .card-title, .data-label, .data-value");
      
      elements.forEach((el) => {
        // Skip elements that are likely part of nav/actions
        if (
          el.closest("nav") || 
          el.closest("button") || 
          el.closest(".sidebar") || 
          el.closest(".actions") ||
          el.classList.contains("sr-only")
        ) {
          return;
        }

        const text = el.textContent?.trim();
        if (text && text.length > 1) {
          // Add a pause (period) if it doesn't end with punctuation
          const punctuation = [".", "!", "?", ":", ";"];
          const endsWithPunctuation = punctuation.some(p => text.endsWith(p));
          fullText += text + (endsWithPunctuation ? " " : ". ");
        }
      });
    });

    return fullText.trim();
  };

  const handleToggleSpeak = async () => {
    if (isPlaying) {
      ttsService.stop();
      setIsPlaying(false);
      return;
    }

    const text = extractPageContent();
    if (!text) {
      console.warn("No meaningful content found to read.");
      return;
    }

    setIsLoading(true);
    setIsPlaying(true);

    try {
      // Use the backend TTS service we just implemented
      await ttsService.speakBackend(text);
    } catch (error) {
      console.error("Failed to read page content:", error);
    } finally {
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        onClick={handleToggleSpeak}
        variant="outline"
        size="sm"
        className={`relative overflow-hidden transition-all duration-300 group border-emerald-500/30 font-mono text-xs ${
          isPlaying 
            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" 
            : "bg-black/40 text-emerald-500 hover:bg-emerald-500/10"
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
        ) : isPlaying ? (
          <Square className="w-3.5 h-3.5 mr-2 fill-current" />
        ) : (
          <Play className="w-3.5 h-3.5 mr-2 fill-current" />
        )}
        
        <span className="relative z-10">
          {isLoading ? "PREPARING AUDIO..." : isPlaying ? "STOP READING" : "LISTEN TO PAGE"}
        </span>

        {/* Premium visual cues */}
        {isPlaying && (
          <div className="absolute bottom-0 left-0 h-[2px] bg-emerald-400 animate-pulse w-full"></div>
        )}
      </Button>

      {/* Visual audio bars when playing */}
      {isPlaying && !isLoading && (
        <div className="flex items-end gap-0.5 h-3 px-1">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i}
              className="w-1 bg-emerald-400 rounded-full animate-bounce"
              style={{ 
                height: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: "0.8s"
              }}
            ></div>
          ))}
        </div>
      )}
    </div>
  );
}
