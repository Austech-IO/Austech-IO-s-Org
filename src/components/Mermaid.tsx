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
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
      } catch (error) {
        console.error('Mermaid render error:', error);
        setSvg('<div class="text-red-500 font-mono text-xs">Failed to render diagram. Check Mermaid syntax.</div>');
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
