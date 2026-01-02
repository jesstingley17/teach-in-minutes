
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
    
    // Regex to find math delimiters: $...$ or $$...$$
    // We split the string into segments of text and math
    const regex = /(\$\$[\s\S]*?\$\$|\$.*?\$)/g;
    return content.split(regex).filter(p => p !== '');
  }, [content]);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isMath = (part.startsWith('$') && part.endsWith('$')) || 
                       (part.startsWith('$$') && part.endsWith('$$'));
        
        if (isMath) {
          try {
            // Remove delimiters for KaTeX
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
