import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { TemplateFormData, PrintArea } from '@/hooks/useTemplateForm';

interface PrintAreasTabProps {
  formData: TemplateFormData;
  setFormData: React.Dispatch<React.SetStateAction<TemplateFormData>>;
}

export const PrintAreasTab: React.FC<PrintAreasTabProps> = ({
  formData,
  setFormData,
}) => {
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaPosition, setNewAreaPosition] = useState('front');

  const positions = [
    { value: 'front', label: 'Front' },
    { value: 'back', label: 'Back' },
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
    { value: 'sleeve_left', label: 'Left Sleeve' },
    { value: 'sleeve_right', label: 'Right Sleeve' },
  ];

  const addPrintArea = () => {
    if (newAreaName.trim()) {
      setFormData(prev => ({
        ...prev,
        printAreas: [
          ...prev.printAreas,
          {
            name: newAreaName.trim(),
            position: newAreaPosition,
            width: 0,
            height: 0,
            x: 0,
            y: 0,
            dpi: 300,
          },
        ],
      }));
      setNewAreaName('');
      setNewAreaPosition('front');
    }
  };

  const removePrintArea = (index: number) => {
    setFormData(prev => ({
      ...prev,
      printAreas: prev.printAreas.filter((_, i) => i !== index),
    }));
  };

  const updatePrintArea = (index: number, field: keyof PrintArea, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      printAreas: prev.printAreas.map((area, i) =>
        i === index ? { ...area, [field]: value } : area
      ),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Add Print Area */}
      <div className="space-y-3">
        <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">
          Add Print Area
        </Label>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5">
            <Input
              type="text"
              placeholder="e.g., Main Design Area"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              className="rounded-xl h-11 text-xs"
            />
          </div>

          <div className="md:col-span-4">
            <Select value={newAreaPosition} onValueChange={setNewAreaPosition}>
              <SelectTrigger className="rounded-xl h-11 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {positions.map(pos => (
                  <SelectItem key={pos.value} value={pos.value}>{pos.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-3">
            <Button
              type="button"
              onClick={addPrintArea}
              className="w-full rounded-xl h-11 text-[10px] font-black uppercase"
            >
              <Plus className="h-3 w-3 mr-2" />
              Add Area
            </Button>
          </div>
        </div>
      </div>

      {/* Print Areas List */}
      {formData.printAreas.length > 0 ? (
        <div className="space-y-3">
          <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">
            Configured Print Areas ({formData.printAreas.length})
          </Label>

          <div className="space-y-4">
            {formData.printAreas.map((area, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 rounded-2xl border space-y-3"
              >
                {/* Area Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black">{area.name}</p>
                    <p className="text-[10px] text-gray-500 capitalize">
                      Position: {area.position.replace('_', ' ')}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePrintArea(index)}
                    className="h-8 w-8 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Dimensions */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <Label className="text-[9px] font-black uppercase text-gray-400">
                      Width (px)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={area.width}
                      onChange={(e) => updatePrintArea(index, 'width', parseInt(e.target.value) || 0)}
                      className="rounded-xl h-10 text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-[9px] font-black uppercase text-gray-400">
                      Height (px)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={area.height}
                      onChange={(e) => updatePrintArea(index, 'height', parseInt(e.target.value) || 0)}
                      className="rounded-xl h-10 text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-[9px] font-black uppercase text-gray-400">
                      X Offset
                    </Label>
                    <Input
                      type="number"
                      value={area.x}
                      onChange={(e) => updatePrintArea(index, 'x', parseInt(e.target.value) || 0)}
                      className="rounded-xl h-10 text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-[9px] font-black uppercase text-gray-400">
                      Y Offset
                    </Label>
                    <Input
                      type="number"
                      value={area.y}
                      onChange={(e) => updatePrintArea(index, 'y', parseInt(e.target.value) || 0)}
                      className="rounded-xl h-10 text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-[9px] font-black uppercase text-gray-400">
                      DPI
                    </Label>
                    <Input
                      type="number"
                      min="72"
                      value={area.dpi || 300}
                      onChange={(e) => updatePrintArea(index, 'dpi', parseInt(e.target.value) || 300)}
                      className="rounded-xl h-10 text-xs mt-1"
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="text-[9px] text-gray-500 bg-white border rounded-xl p-2">
                  Printable Area: {area.width}×{area.height}px at {area.dpi || 300} DPI
                  {area.width > 0 && area.height > 0 && (
                    <span className="ml-2">
                      ≈ {(area.width / (area.dpi || 300)).toFixed(2)}" × {(area.height / (area.dpi || 300)).toFixed(2)}"
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed rounded-2xl">
          <p className="text-xs text-gray-400">No print areas configured</p>
          <p className="text-[10px] text-gray-500 mt-1">
            Add print areas to define where customers can place designs
          </p>
        </div>
      )}
    </div>
  );
};
