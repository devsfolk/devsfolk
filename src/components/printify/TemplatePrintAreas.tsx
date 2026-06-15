import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Maximize2, MapPin, Layers } from 'lucide-react';

interface TemplatePrintAreasProps {
  printAreas: any[];
  syncDetails?: any;
}

export const TemplatePrintAreas: React.FC<TemplatePrintAreasProps> = ({
  printAreas,
  syncDetails,
}) => {
  const designConstraints = syncDetails?.designConstraints || [];
  const areasToDisplay = designConstraints.length > 0 ? designConstraints : printAreas;

  if (areasToDisplay.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-gray-400 border border-dashed rounded-xl">
        No print area information available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {areasToDisplay.map((area: any, idx: number) => {
        const position = area?.position || area?.name || `Area ${idx + 1}`;
        const width = area?.width || area?.pixel_width || 0;
        const height = area?.height || area?.pixel_height || 0;
        const widthInches = width > 0 ? (width / 300).toFixed(2) : '—';
        const heightInches = height > 0 ? (height / 300).toFixed(2) : '—';
        const dpi = area?.dpi || area?.dpi_requirement || 300;
        const decorationMethod = area?.decorationMethod || area?.decoration_method || area?.method || 'N/A';

        return (
          <Card key={idx} className="p-4 border-2 hover:border-black transition-colors">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-sm font-black uppercase text-gray-800 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {position}
                </h4>
                <p className="text-[10px] text-gray-500 mt-0.5">Print Area {idx + 1}</p>
              </div>
              <Badge variant="secondary" className="text-[9px] font-bold uppercase">
                {decorationMethod}
              </Badge>
            </div>

            {/* Dimensions */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <div className="flex items-center gap-2 mb-1">
                    <Maximize2 className="h-3.5 w-3.5 text-gray-400" />
                    <p className="text-[9px] font-black uppercase text-gray-400">Dimensions</p>
                  </div>
                  <p className="text-xs font-bold text-gray-800">
                    {width} × {height} px
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {widthInches}" × {heightInches}"
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 border">
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="h-3.5 w-3.5 text-gray-400" />
                    <p className="text-[9px] font-black uppercase text-gray-400">Resolution</p>
                  </div>
                  <p className="text-xs font-bold text-gray-800">{dpi} DPI</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Required</p>
                </div>
              </div>

              {/* Safe Area & Bleed */}
              {(area?.safeArea || area?.bleedArea) && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-[9px] font-black uppercase text-blue-600 mb-2">Print Specifications</p>
                  <div className="space-y-1.5">
                    {area?.safeArea && (
                      <div className="flex justify-between text-[10px]">
                        <span className="text-blue-700 font-bold">Safe Area:</span>
                        <span className="font-mono text-blue-900">
                          {typeof area.safeArea === 'object' 
                            ? `${area.safeArea.width || 0}×${area.safeArea.height || 0}px` 
                            : String(area.safeArea)}
                        </span>
                      </div>
                    )}
                    {area?.bleedArea && (
                      <div className="flex justify-between text-[10px]">
                        <span className="text-blue-700 font-bold">Bleed Area:</span>
                        <span className="font-mono text-blue-900">
                          {typeof area.bleedArea === 'object'
                            ? `${area.bleedArea.width || 0}×${area.bleedArea.height || 0}px`
                            : String(area.bleedArea)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Info */}
              {(area?.offset_x !== undefined || area?.offset_y !== undefined) && (
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {area?.offset_x !== undefined && (
                    <div className="bg-gray-50 rounded px-2 py-1.5 border">
                      <span className="text-gray-500 font-bold">X Offset:</span>
                      <span className="ml-1 font-mono text-gray-700">{area.offset_x}px</span>
                    </div>
                  )}
                  {area?.offset_y !== undefined && (
                    <div className="bg-gray-50 rounded px-2 py-1.5 border">
                      <span className="text-gray-500 font-bold">Y Offset:</span>
                      <span className="ml-1 font-mono text-gray-700">{area.offset_y}px</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
