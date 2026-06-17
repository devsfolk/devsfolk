import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ChevronLeft, ChevronRight, Move, Maximize2 } from 'lucide-react';
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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const positions = [
    { value: 'front', label: 'Front' },
    { value: 'back', label: 'Back' },
    { value: 'side', label: 'Side' },
    { value: 'label', label: 'Label' },
    { value: 'sleeve_left', label: 'Left Sleeve' },
    { value: 'sleeve_right', label: 'Right Sleeve' },
  ];

  // Auto-prefill position names based on image index
  const getDefaultPositionForIndex = (index: number): string => {
    const defaultPositions = ['front', 'back', 'side', 'label'];
    return defaultPositions[index] || 'front';
  };

  const getDefaultNameForIndex = (index: number): string => {
    const defaultNames = ['Front Design Area', 'Back Design Area', 'Side Design Area', 'Label Area'];
    return defaultNames[index] || `Design Area ${index + 1}`;
  };

  const currentImage = formData.images[currentImageIndex];
  const currentPrintArea = formData.printAreas.find((_, idx) => idx === currentImageIndex);

  const addPrintArea = () => {
    // Auto-use default name and position if not provided
    const areaName = newAreaName.trim() || getDefaultNameForIndex(formData.printAreas.length);
    const areaPosition = newAreaPosition || getDefaultPositionForIndex(formData.printAreas.length);
    
    setFormData(prev => ({
      ...prev,
      printAreas: [
        ...prev.printAreas,
        {
          name: areaName,
          position: areaPosition,
          width: 40, // Start with 40% width
          height: 50, // Start with 50% height
          x: 30, // Center-ish
          y: 25, // Center-ish
          dpi: 300,
        },
      ],
    }));
    setNewAreaName('');
    setNewAreaPosition(getDefaultPositionForIndex(formData.printAreas.length + 1));
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

  // Visual editor handlers
  const handleMouseDown = (e: React.MouseEvent, action: 'drag' | 'resize', corner?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (action === 'drag') {
      setDragging(true);
    } else if (action === 'resize' && corner) {
      setResizing(corner);
    }
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!currentPrintArea || currentImageIndex >= formData.printAreas.length) return;

    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;

    if (dragging) {
      // Move the box
      const newX = Math.max(0, Math.min(100 - currentPrintArea.width, currentPrintArea.x + deltaX));
      const newY = Math.max(0, Math.min(100 - currentPrintArea.height, currentPrintArea.y + deltaY));
      
      updatePrintArea(currentImageIndex, 'x', Math.round(newX * 10) / 10);
      updatePrintArea(currentImageIndex, 'y', Math.round(newY * 10) / 10);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (resizing) {
      // Resize the box based on corner
      let newWidth = currentPrintArea.width;
      let newHeight = currentPrintArea.height;
      let newX = currentPrintArea.x;
      let newY = currentPrintArea.y;

      if (resizing.includes('e')) {
        newWidth = Math.max(10, Math.min(100 - currentPrintArea.x, currentPrintArea.width + deltaX));
      }
      if (resizing.includes('w')) {
        const widthChange = -deltaX;
        newWidth = Math.max(10, currentPrintArea.width + widthChange);
        newX = Math.max(0, currentPrintArea.x - widthChange);
      }
      if (resizing.includes('s')) {
        newHeight = Math.max(10, Math.min(100 - currentPrintArea.y, currentPrintArea.height + deltaY));
      }
      if (resizing.includes('n')) {
        const heightChange = -deltaY;
        newHeight = Math.max(10, currentPrintArea.height + heightChange);
        newY = Math.max(0, currentPrintArea.y - heightChange);
      }

      updatePrintArea(currentImageIndex, 'width', Math.round(newWidth * 10) / 10);
      updatePrintArea(currentImageIndex, 'height', Math.round(newHeight * 10) / 10);
      updatePrintArea(currentImageIndex, 'x', Math.round(newX * 10) / 10);
      updatePrintArea(currentImageIndex, 'y', Math.round(newY * 10) / 10);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setDragging(false);
    setResizing(null);
  };

  const goToPreviousImage = () => {
    setCurrentImageIndex(prev => Math.max(0, prev - 1));
  };

  const goToNextImage = () => {
    setCurrentImageIndex(prev => Math.min(formData.images.length - 1, prev + 1));
  };

  return (
    <div className="space-y-6">
      {formData.images.length > 0 ? (
        <>
          {/* Visual Print Area Editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">
                Visual Print Area Editor
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousImage}
                  disabled={currentImageIndex === 0}
                  className="h-8 px-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-bold">
                  {currentImageIndex + 1} / {formData.images.length}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={goToNextImage}
                  disabled={currentImageIndex >= formData.images.length - 1}
                  className="h-8 px-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div 
              className="relative w-full bg-gray-100 rounded-2xl border-2 border-gray-300 overflow-hidden cursor-crosshair"
              style={{ height: '400px' }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Template Image */}
              {currentImage && (
                <img
                  src={currentImage}
                  alt={`Template ${currentImageIndex + 1}`}
                  className="absolute inset-0 pointer-events-none"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={(e) => {
                    e.currentTarget.src = '/custom-tee-mockup.png';
                  }}
                />
              )}

              {/* Draggable Print Area Bounding Box */}
              {currentPrintArea && (
                <div
                  className="absolute border-4 border-blue-500 bg-blue-500/10 cursor-move"
                  style={{
                    left: `${currentPrintArea.x}%`,
                    top: `${currentPrintArea.y}%`,
                    width: `${currentPrintArea.width}%`,
                    height: `${currentPrintArea.height}%`,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, 'drag')}
                >
                  {/* Corner Resize Handles */}
                  {['nw', 'ne', 'sw', 'se'].map((corner) => (
                    <div
                      key={corner}
                      className={`absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-${corner}-resize hover:scale-125 transition-transform`}
                      style={{
                        top: corner.includes('n') ? '-8px' : 'auto',
                        bottom: corner.includes('s') ? '-8px' : 'auto',
                        left: corner.includes('w') ? '-8px' : 'auto',
                        right: corner.includes('e') ? '-8px' : 'auto',
                      }}
                      onMouseDown={(e) => handleMouseDown(e, 'resize', corner)}
                    />
                  ))}

                  {/* Center Icon */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-blue-500 text-white rounded-full p-2">
                      <Move className="h-4 w-4" />
                    </div>
                  </div>

                  {/* Dimensions Label */}
                  <div className="absolute -top-8 left-0 bg-blue-500 text-white text-[10px] font-black px-2 py-1 rounded whitespace-nowrap">
                    {currentPrintArea.width.toFixed(1)}% × {currentPrintArea.height.toFixed(1)}%
                  </div>
                </div>
              )}

              {/* Instructions Overlay */}
              {!currentPrintArea && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-center p-4">
                  <div>
                    <Maximize2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-bold">No print area defined for this image</p>
                    <p className="text-xs mt-1 opacity-75">Add a print area below to start marking</p>
                  </div>
                </div>
              )}
            </div>

            {/* Current Print Area Info */}
            {currentPrintArea && (
              <div className="space-y-2">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-[10px] font-black uppercase text-blue-900 mb-1">
                    {currentPrintArea.name} - {currentPrintArea.position}
                  </p>
                  <div className="grid grid-cols-4 gap-2 text-[9px]">
                    <div>
                      <span className="text-blue-700">X:</span>{' '}
                      <span className="font-bold text-blue-900">{currentPrintArea.x.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Y:</span>{' '}
                      <span className="font-bold text-blue-900">{currentPrintArea.y.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-blue-700">W:</span>{' '}
                      <span className="font-bold text-blue-900">{currentPrintArea.width.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-blue-700">H:</span>{' '}
                      <span className="font-bold text-blue-900">{currentPrintArea.height.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                
                {/* Save Confirmation Button */}
                <Button
                  type="button"
                  onClick={() => {
                    alert(`✓ Print area for "${currentPrintArea.name}" saved!\n\nPosition: ${currentPrintArea.position}\nArea: ${currentPrintArea.width.toFixed(1)}% × ${currentPrintArea.height.toFixed(1)}%\nCoordinates: (${currentPrintArea.x.toFixed(1)}%, ${currentPrintArea.y.toFixed(1)}%)`);
                  }}
                  className="w-full rounded-xl h-11 text-[10px] font-black uppercase bg-green-600 hover:bg-green-700 text-white"
                >
                  ✓ Save Print Area for {currentPrintArea.position}
                </Button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center">
          <p className="text-xs font-bold text-amber-900">No template images available</p>
          <p className="text-[10px] text-amber-700 mt-1">
            Go to Display Tab → Add product images to enable visual print area editor
          </p>
        </div>
      )}

      {/* Add Print Area */}
      <div className="space-y-3">
        <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">
          Add Print Area for Image #{currentImageIndex + 1}
        </Label>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5">
            <Input
              type="text"
              placeholder={getDefaultNameForIndex(formData.printAreas.length)}
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              className="rounded-xl h-11 text-xs"
            />
          </div>

          <div className="md:col-span-4">
            <Select 
              value={newAreaPosition || getDefaultPositionForIndex(formData.printAreas.length)} 
              onValueChange={setNewAreaPosition}
            >
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
        
        <p className="text-[9px] text-gray-500 pl-1">
          Position auto-filled: {getDefaultPositionForIndex(formData.printAreas.length)} • You can edit before adding
        </p>
      </div>

      {/* Print Areas List */}
      {formData.printAreas.length > 0 && (
        <div className="space-y-3">
          <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">
            Configured Print Areas ({formData.printAreas.length})
          </Label>

          <div className="space-y-2">
            {formData.printAreas.map((area, index) => (
              <div
                key={index}
                className={`p-3 rounded-xl border-2 transition-colors ${
                  index === currentImageIndex 
                    ? 'bg-blue-50 border-blue-500' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-black">{area.name}</p>
                    <p className="text-[9px] text-gray-600">
                      Position: {area.position} • 
                      Area: {area.width.toFixed(1)}% × {area.height.toFixed(1)}% • 
                      DPI: {area.dpi || 300}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {index === currentImageIndex && (
                      <span className="text-[9px] bg-blue-500 text-white px-2 py-1 rounded font-black">
                        ACTIVE
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentImageIndex(index)}
                      className="h-8 w-8 text-blue-600 hover:bg-blue-100"
                      title="Edit this print area"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
