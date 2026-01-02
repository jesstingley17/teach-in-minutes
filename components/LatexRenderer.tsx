
import React, { useMemo } from 'react';
import katex from 'katex';

interface LatexRendererProps {
  content: string;
  className?: string;
  displayMode?: boolean;
}

export const LatexRenderer: React.FC<LatexRendererProps> = ({ content, className = "", displayMode = false }) => {
  const parts = useMemo(() => {
    if (!content) return [];
    
    // Improved regex to find $...$, $$...$$, or strings that look like raw LaTeX commands
    // Pattern catches $...$, $$...$$, or sequences starting with \ followed by common commands
    const regex = /(\$\$[\s\S]*?\$\$|\$.*?\$|\\(?:frac|sqrt|cdot|times|sum|int|infty|alpha|beta|gamma)\{?.*?\}?)/g;
    return content.split(regex).filter(p => p !== '');
  }, [content]);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isMathDelimited = (part.startsWith('$') && part.endsWith('$')) || 
                                (part.startsWith('$$') && part.endsWith('$$'));
        const isRawLatexPattern = part.startsWith('\\');
        
        if (isMathDelimited || isRawLatexPattern) {
          try {
            // Remove delimiters if they exist
            const math = part.replace(/^\$\$?|\$\$?$/g, '');
            const html = katex.renderToString(math, {
              throwOnError: false,
              displayMode: part.startsWith('$$'),
              trust: true
            });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
          } catch (e) {
            return <span key={index}>{part}</span>;
          }
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};
