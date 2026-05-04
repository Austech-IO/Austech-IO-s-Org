import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Download, Share2 } from 'lucide-react';

mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'JetBrains Mono, monospace',
  themeVariables: {
    primaryColor: '#f97316',
    primaryTextColor: '#fff',
    lineColor: '#444',
    secondaryColor: '#222',
    tertiaryColor: '#111',
  }
});

interface MermaidProps {
  chart: string;
}

export const Mermaid = ({ chart }: MermaidProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const renderChart = async () => {
      try {
        let processedChart = chart.trim();
        
        // Basic AI correction: If it starts with subgraph, wrap it in graph TD
        if (processedChart.startsWith('subgraph') && !processedChart.includes('graph ') && !processedChart.includes('flowchart ')) {
          processedChart = `graph TD\n${processedChart}`;
        }

        // Fix quoted IDs (e.g., "Node"["Label"] -> Node["Label"])
        processedChart = processedChart.replace(/"([^"\[\(\{\>]+)"\s*([\[\(\{\>])/g, (_, id, bracket) => {
          return id.trim().replace(/[^a-zA-Z0-9]/g, '_') + bracket;
        });

        // Quote subgraph titles if they have spaces and are not quoted
        processedChart = processedChart.replace(/^(\s*)subgraph\s+([^"\r\n\[\]\(\)\{\}]+)$/gm, (match, space, title) => {
          const trimmed = title.trim();
          if (trimmed.includes(' ') && !trimmed.startsWith('"')) {
            // Check if it's already an ID + Title pattern: subgraph ID [Title]
            if (trimmed.includes('[') || trimmed.includes('(') || trimmed.includes('{')) return match;
            return `${space}subgraph "${trimmed}"`;
          }
          return match;
        });

        // Ensure all labels with special characters are quoted
        processedChart = processedChart.replace(/([\[\(\{\>])([^"\]\)\}\r\n]+)([\]\)\}\r\n])/g, (match, open, content, close) => {
          const trimmed = content.trim();
          if (trimmed.startsWith('"') && trimmed.endsWith('"')) return match;
          // If it contains spaces or special chars, quote it
          if (/[^a-zA-Z0-9\s]/.test(trimmed) || trimmed.includes(' ') || trimmed.includes('/') || trimmed.includes('(') || trimmed.includes(')')) {
            // Escape any existing double quotes in the content
            const escaped = trimmed.replace(/"/g, '\"');
            return `${open}"${escaped}"${close}`;
          }
          return match;
        });

        // Catch naked IDs with spaces (e.g., App Server["Desc"] -> App_Server["Desc"])
        // We exclude reserved keywords at the start to avoid merging "graph TD" or "subgraph"
        const keywords = ['graph', 'flowchart', 'subgraph', 'end', 'stateDiagram', 'sequenceDiagram', 'classDiagram', 'erDiagram', 'gantt', 'pie', 'gitGraph', 'classDef', 'style', 'class'];
        processedChart = processedChart.replace(/^(\s*)([a-zA-Z0-9][a-zA-Z0-9\s-]+)(\[|\{|\(|\>)/gm, (_, space, id, bracket) => {
          const trimmedId = id.trim();
          const firstWord = trimmedId.split(/\s+/)[0].toLowerCase();
          if (keywords.includes(firstWord)) return _; // Skip keywords
          return space + trimmedId.replace(/\s+/g, '_') + bracket;
        });
        
        // Ensure no stray markdown code block markers
        processedChart = processedChart.replace(/^```mermaid\n?/, '').replace(/\n?```$/, '');

        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, processedChart);
        setSvg(svg);
      } catch (error) {
        console.error('Mermaid render error:', error);
        setSvg(`<div class="text-red-500 font-mono text-[10px] p-4 bg-red-500/10 border border-red-500/20 rounded-xl relative group/error">
          <p class="font-bold mb-1 flex items-center gap-2">
            <span class="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Diagram Syntax Error
          </p>
          <pre class="whitespace-pre-wrap mb-2 opacity-80">${error instanceof Error ? error.message : 'Invalid Mermaid syntax'}</pre>
          <div className="hidden group-hover/error:block border-t border-red-500/10 pt-2">
            <p class="text-[9px] uppercase tracking-wider mb-1 opacity-40">Raw Input:</p>
            <pre class="bg-black/40 p-2 rounded text-[9px] overflow-x-auto">${chart}</pre>
          </div>
        </div>`);
      }
    };

    if (chart) {
      renderChart();
    }
  }, [chart]);

  const downloadImage = (format: 'svg' | 'png') => {
    if (!svg) return;
    
    if (format === 'svg') {
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `architecture-diagram.svg`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      // PNG Export via Canvas
      const parser = new DOMParser();
      const doc = parser.parseFromString(svg, 'image/svg+xml');
      const svgElement = doc.documentElement;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        canvas.width = img.width * 2; // High DPI
        canvas.height = img.height * 2;
        if (ctx) {
          ctx.fillStyle = '#111'; // Match dark theme
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const pngUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = `architecture-diagram.png`;
          link.click();
        }
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
  };

  return (
    <div className="relative group/mermaid w-full max-w-full overflow-hidden">
      <div 
        className="mermaid-container bg-black/40 p-6 rounded-2xl border border-white/5 my-4 flex justify-center overflow-x-auto"
        ref={ref}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      
      <div className="absolute top-6 right-6 opacity-0 group-hover/mermaid:opacity-100 transition-all flex gap-2">
        <div className="relative">
          <button 
            onClick={() => setIsExporting(!isExporting)}
            className="p-2 bg-black/80 border border-white/10 rounded-lg text-white/40 hover:text-orange-500 transition-all hover:bg-black"
          >
            <Download className="w-4 h-4" />
          </button>
          
          {isExporting && (
            <div className="absolute right-0 top-full mt-1 bg-black border border-white/10 rounded-lg shadow-2xl z-20 overflow-hidden min-w-[80px]">
              <button 
                onClick={() => { downloadImage('svg'); setIsExporting(false); }}
                className="w-full px-3 py-1.5 text-[10px] font-mono text-white/60 hover:bg-white/5 hover:text-white transition-all text-left"
              >
                SVG
              </button>
              <button 
                onClick={() => { downloadImage('png'); setIsExporting(false); }}
                className="w-full px-3 py-1.5 text-[10px] font-mono text-white/60 hover:bg-white/5 hover:text-white transition-all text-left"
              >
                PNG
              </button>
            </div>
          )}
        </div>
        <button className="p-2 bg-black/80 border border-white/10 rounded-lg text-white/40 hover:text-orange-500 transition-all hover:bg-black" title="Share Diagram">
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
