
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
    
    // Improved regex to find math delimiters OR common naked LaTeX commands like \frac, \sqrt, \pm
    // This ensures that even if the AI misses the $, the command still renders as math.
    const regex = /(\$\$[\s\S]*?\$\$|\$.*?\$|\\\(.*?\\\)|\\\[.*?\\\]|\\frac\{.*?\}\{.*?\}|\\sqrt\{.*?\}|\\pm|\\times|\\div|\\cdot|\\sum|\\int|\\infty|\\alpha|\\beta|\\gamma|\\delta|\\theta|\\pi|\\sigma|\\omega|\\approx|\\neq|\\leq|\\geq)/g;
    return content.split(regex).filter(p => p !== '');
  }, [content]);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isMathDelimited = (part.startsWith('$') && part.endsWith('$')) || 
                                (part.startsWith('$$') && part.endsWith('$$')) ||
                                (part.startsWith('\\(') && part.endsWith('\\)')) ||
                                (part.startsWith('\\[') && part.endsWith('\\]'));
        
        const isNakedLatex = part.startsWith('\\');
        
        if (isMathDelimited || isNakedLatex) {
          try {
            // Remove delimiters if they exist
            let math = part;
            if (isMathDelimited) {
              math = part.startsWith('$$') ? part.replace(/^\$\$|\$\$$/g, '') : 
                     part.startsWith('$') ? part.replace(/^\$|\$$/g, '') :
                     part.startsWith('\\(') ? part.replace(/^\\\(|\\\)$/g, '') :
                     part.replace(/^\\\[|\\\]$/g, '');
            }
            
            const html = katex.renderToString(math, {
              throwOnError: false,
              displayMode: part.startsWith('$$') || part.startsWith('\\[') || displayMode,
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
