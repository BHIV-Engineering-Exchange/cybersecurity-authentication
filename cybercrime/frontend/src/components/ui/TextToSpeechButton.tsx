/**
 * Text-to-Speech Button Component
 * Reusable button for reading text content
 */

import { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "./button";
import { ttsService } from "@/utils/textToSpeech";

interface TextToSpeechButtonProps {
  text: string;
  label?: string;
  autoRead?: boolean;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "lg" | "icon" | "default";
  disabled?: boolean;
}

export function TextToSpeechButton({
  text,
  label = "Read Aloud",
  autoRead = false,
  className = "",
  variant = "ghost",
  size = "sm" as const,
  disabled = false
}: TextToSpeechButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(ttsService.isTTSSupported());
  }, []);

  useEffect(() => {
    if (autoRead && text && isSupported) {
      handleSpeak();
    }
  }, [autoRead, text, isSupported]);

  const handleSpeak = async () => {
    if (!text || !isSupported || disabled) return;

    if (isPlaying) {
      ttsService.stop();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      try {
        await ttsService.speak(text);
      } catch (error) {
        console.error("TTS Error:", error);
      } finally {
        setIsPlaying(false);
      }
    }
  };

  if (!isSupported) {
    return null; // Don't show button if TTS not supported
  }

  return (
    <Button
      onClick={handleSpeak}
      disabled={disabled || !text}
      variant={variant}
      size={size}
      className={`${className} font-mono`}
      title={isPlaying ? "Stop Reading" : label}
    >
      {isPlaying ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          <span>Reading...</span>
        </>
      ) : (
        <>
          <Volume2 className="w-4 h-4 mr-2" />
          <span>{label}</span>
        </>
      )}
    </Button>
  );
}

/**
 * Compact TTS Icon Button (just icon, no text)
 */
export function TextToSpeechIconButton({
  text,
  autoRead = false,
  className = "",
  disabled = false
}: Omit<TextToSpeechButtonProps, "label" | "variant" | "size">) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(ttsService.isTTSSupported());
  }, []);

  useEffect(() => {
    if (autoRead && text && isSupported) {
      handleSpeak();
    }
  }, [autoRead, text, isSupported]);

  const handleSpeak = async () => {
    if (!text || !isSupported || disabled) return;

    if (isPlaying) {
      ttsService.stop();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      try {
        await ttsService.speak(text);
      } catch (error) {
        console.error("TTS Error:", error);
      } finally {
        setIsPlaying(false);
      }
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <button
      onClick={handleSpeak}
      disabled={disabled || !text}
      className={`p-2 rounded-lg transition-colors ${
        isPlaying
          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
          : "text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10"
      } ${className}`}
      title={isPlaying ? "Stop Reading" : "Read Aloud"}
    >
      {isPlaying ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Volume2 className="w-4 h-4" />
      )}
    </button>
  );
}
