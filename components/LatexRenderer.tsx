
import React, { useEffect, useRef } from 'react';
import katex from 'katex';

interface LatexRendererProps {
  content: string;
  className?: string;
  displayMode?: boolean;
}

export const LatexRenderer: React.FC<LatexRendererProps> = ({ content, className = "", displayMode = false }) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        // Find segments between $...$ or $$...$$
        // For simplicity, we'll try to render the whole block if it's math mode,
        // or just render the whole thing. Gemini usually outputs LaTeX inside $$.
        
        const hasLatex = content.includes('$') || content.includes('\\(') || content.includes('\\[');
        
        if (hasLatex) {
          katex.render(content, containerRef.current, {
            throwOnError: false,
            displayMode: displayMode,
            trust: true
          });
        } else {
          containerRef.current.textContent = content;
        }
      } catch (e) {
        containerRef.current.textContent = content;
      }
    }
  }, [content, displayMode]);

  return <span ref={containerRef} className={className} />;
};
