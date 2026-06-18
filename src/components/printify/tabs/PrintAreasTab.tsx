import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Move, Maximize2, Edit2, Save } from 'lucide-react';
import { TemplateFormData, PrintArea } from '@/hooks/useTemplateForm';

interface PrintAreasTabProps {
  formData: TemplateFormData;
  setFormData: React.Dispatch<React.SetStateAction<TemplateFormData>>;
}

type ViewType = 'front' | 'back' | 'side' | 'sleeve_left' | 'sleeve_right' | 'label';

export const PrintAreasTab: React.FC<PrintAreasTabProps> = ({
  formData,
  setFormData,
}) => {
  // Phase 2: View-based state (not image-index-based)
  const [selectedView, setSelectedView] = useState<ViewType>('front');
  const [activePrintAreaId, setActivePrintAreaId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ mouseX: 0, mouseY: 0, areaX: 0, areaY: 0 });

  // Available views with labels
  const availableViews: { value: ViewType; label: string }[] = [
    { value: 'front', label: 'Front' },
    { value: 'back', label: 'Back' },
    { value: 'side', label: 'Side' },
    { value: 'sleeve_left', label: 'Left Sleeve' },
    { value: 'sleeve_right', label: 'Right Sleeve' },
    { value: 'label', label: 'Label' },
  ];

  // Get print areas for the currently selected view
  const viewPrintAreas = useMemo(() => {
    return formData.printAreas.filter(
      (area) => (area.view || area.position)?.toLowerCase() === selectedView.toLowerCase()
    );
  }, [formData.printAreas, selectedView]);

  // Get active print area being edited
  const activePrintArea = useMemo(() => {
    if (!activePrintAreaId) return viewPrintAreas[0] || null;
    return formData.printAreas.find((area) => area.id === activePrintAreaId) || viewPrintAreas[0] || null;
  }, [activePrintAreaId, formData.printAreas, viewPrintAreas]);

  // Select mockup image for current view (from general images or color mockups)
  const mockupOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    
    // Add general template images
    formData.images.forEach((img, idx) => {
      options.push({ value: img, label: `Image ${idx + 1}` });
    });
    
    // Add color-specific mockups for current view
    Object.entries(formData.colorMockups || {}).forEach(([color, views]) => {
      const viewUrl = views[selectedView];
      if (viewUrl) {
        options.push({ value: viewUrl, label: `${color} - ${selectedView}` });
      }
    });
    
    return options;
  }, [formData.images, formData.colorMockups, selectedView]);

  const [selectedMockupUrl, setSelectedMockupUrl] = useState<string>(
    mockupOptions[0]?.value || formData.images[0] || ''
  );

  // Add new print area to current view
  const addPrintArea = () => {
    const viewLabel = availableViews.find((v) => v.value === selectedView)?.label || selectedView;
    const newAreaName = `${viewLabel} Design Area ${viewPrintAreas.length + 1}`;
    const newId = `pa_${selectedView}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newArea: PrintArea = {
      id: newId,
      name: newAreaName,
      view: selectedView,
      position: selectedView, // Keep for backwards compat
      x: 25,
      y: 20,
      width: 50,
      height: 60,
      dpi: 300,
    };
    
    setFormData((prev) => ({
      ...prev,
      printAreas: [...prev.printAreas, newArea],
    }));
    
    setActivePrintAreaId(newId);
  };

  // Remove print area by ID
  const removePrintArea = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      printAreas: prev.printAreas.filter((area) => area.id !== id),
    }));
    
    if (activePrintAreaId === id) {
      setActivePrintAreaId(null);
    }
  };

  // Update specific print area by ID
  const updatePrintArea = (id: string, updates: Partial<PrintArea>) => {
    setFormData((prev) => ({
      ...prev,
      printAreas: prev.printAreas.map((area) =>
        area.id === id ? { ...area, ...updates } : area
      ),
    }));
  };

  // Phase 2: Fixed drag/resize handlers (no jitter)
  const handleMouseDown = (
    e: React.MouseEvent,
    areaId: string,
    action: 'drag' | 'resize',
    corner?: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    const area = formData.printAreas.find((a) => a.id === areaId);
    if (!area) return;
    
    setActivePrintAreaId(areaId);
    
    if (action === 'drag') {
      setDragging(true);
      setDragStartPos({
        mouseX: e.clientX,
        mouseY: e.clientY,
        areaX: area.x,
        areaY: area.y,
      });
    } else if (action === 'resize' && corner) {
      setResizing(corner);
      setDragStartPos({
        mouseX: e.clientX,
        mouseY: e.clientY,
        areaX: area.x,
        areaY: area.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!activePrintArea || (!dragging && !resizing)) return;

    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    
    // Calculate delta from drag start
    const deltaXPercent = ((e.clientX - dragStartPos.mouseX) / rect.width) * 100;
    const deltaYPercent = ((e.clientY - dragStartPos.mouseY) / rect.height) * 100;

    if (dragging) {
      // Calculate new position (absolute from drag start, not cumulative)
      let newX = dragStartPos.areaX + deltaXPercent;
      let newY = dragStartPos.areaY + deltaYPercent;
      
      // Constrain within bounds
      newX = Math.max(0, Math.min(100 - activePrintArea.width, newX));
      newY = Math.max(0, Math.min(100 - activePrintArea.height, newY));
      
      updatePrintArea(activePrintArea.id!, {
        x: Math.round(newX * 10) / 10,
        y: Math.round(newY * 10) / 10,
      });
    } else if (resizing) {
      let newWidth = activePrintArea.width;
      let newHeight = activePrintArea.height;
      let newX = activePrintArea.x;
      let newY = activePrintArea.y;

      // Resize from corners (fixed: use delta from start, not cumulative)
      if (resizing.includes('e')) {
        newWidth = Math.max(10, Math.min(100 - newX, activePrintArea.width + deltaXPercent));
      }
      if (resizing.includes('w')) {
        const newLeft = dragStartPos.areaX + deltaXPercent;
        const maxLeft = dragStartPos.areaX + activePrintArea.width - 10;
        newX = Math.max(0, Math.min(maxLeft, newLeft));
        newWidth = dragStartPos.areaX + activePrintArea.width - newX;
      }
      if (resizing.includes('s')) {
        newHeight = Math.max(10, Math.min(100 - newY, activePrintArea.height + deltaYPercent));
      }
      if (resizing.includes('n')) {
        const newTop = dragStartPos.areaY + deltaYPercent;
        const maxTop = dragStartPos.areaY + activePrintArea.height - 10;
        newY = Math.max(0, Math.min(maxTop, newTop));
        newHeight = dragStartPos.areaY + activePrintArea.height - newY;
      }

      updatePrintArea(activePrintArea.id!, {
        x: Math.round(newX * 10) / 10,
        y: Math.round(newY * 10) / 10,
        width: Math.round(newWidth * 10) / 10,
        height: Math.round(newHeight * 10) / 10,
      });
    }
  };

  const handleMouseUp = () => {
    setDragging(false);
    setResizing(null);
  };

  return (
    <div className="space-y-6">
      {/* Phase 2: Clean View Selector Tabs */}
      <div className="space-y-3">
        <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">
          Select View to Configure
        </Label>
        
        <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as ViewType)}>
          <TabsList className="grid w-full grid-cols-6 h-11">
            {availableViews.map((view) => (
              <TabsTrigger
                key={view.value}
                value={view.value}
                className="text-[10px] font-black uppercase"
              >
                {view.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        
        <p className="text-[9px] text-gray-500 pl-1">
          Viewing: <span className="font-bold">{availableViews.find((v) => v.value === selectedView)?.label}</span> • 
          {viewPrintAreas.length} print area(s) defined
        </p>
      </div>

      {/* Mockup Image Selector */}
      {mockupOptions.length > 0 && (
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">
            Reference Mockup Image
          </Label>
          <Select value={selectedMockupUrl} onValueChange={setSelectedMockupUrl}>
            <SelectTrigger className="rounded-xl h-11 text-xs">
              <SelectValue placeholder="Select mockup image" />
            </SelectTrigger>
            <SelectContent>
              {mockupOptions.map((option, idx) => (
                <SelectItem key={idx} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Phase 2: Visual Canvas Editor with Multi-Area Support */}
      {selectedMockupUrl ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">
              Visual Print Area Editor - {availableViews.find((v) => v.value === selectedView)?.label}
            </Label>
            <Button
              type="button"
              onClick={addPrintArea}
              size="sm"
              className="h-8 text-[9px] font-black uppercase"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Area
            </Button>
          </div>

          <div
            className="relative w-full bg-gray-100 rounded-2xl border-2 border-gray-300 overflow-hidden cursor-crosshair"
            style={{ height: '500px' }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Mockup Image */}
            <img
              src={selectedMockupUrl}
              alt={`${selectedView} view mockup`}
              className="absolute inset-0 pointer-events-none"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => {
                e.currentTarget.src = '/custom-tee-mockup.png';
              }}
            />

            {/* Phase 2: Multi-Area Rendering - Render ALL print areas for this view */}
            {viewPrintAreas.map((area) => (
              <div
                key={area.id}
                className={`absolute border-4 cursor-move transition-colors ${
                  activePrintAreaId === area.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-400 bg-gray-400/5 hover:border-blue-400'
                }`}
                style={{
                  left: `${area.x}%`,
                  top: `${area.y}%`,
                  width: `${area.width}%`,
                  height: `${area.height}%`,
                }}
                onMouseDown={(e) => handleMouseDown(e, area.id!, 'drag')}
                onClick={() => setActivePrintAreaId(area.id!)}
              >
                {/* Corner Resize Handles */}
                {activePrintAreaId === area.id && (
                  <>
                    {['nw', 'ne', 'sw', 'se'].map((corner) => (
                      <div
                        key={corner}
                        className={`absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-${corner}-resize hover:scale-125 transition-transform z-10`}
                        style={{
                          top: corner.includes('n') ? '-8px' : 'auto',
                          bottom: corner.includes('s') ? '-8px' : 'auto',
                          left: corner.includes('w') ? '-8px' : 'auto',
                          right: corner.includes('e') ? '-8px' : 'auto',
                        }}
                        onMouseDown={(e) => handleMouseDown(e, area.id!, 'resize', corner)}
                      />
                    ))}
                  </>
                )}

                {/* Center Icon */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className={`${
                      activePrintAreaId === area.id ? 'bg-blue-500' : 'bg-gray-500'
                    } text-white rounded-full p-2`}
                  >
                    <Move className="h-4 w-4" />
                  </div>
                </div>

                {/* Dimensions Label */}
                <div
                  className={`absolute -top-8 left-0 ${
                    activePrintAreaId === area.id ? 'bg-blue-500' : 'bg-gray-500'
                  } text-white text-[10px] font-black px-2 py-1 rounded whitespace-nowrap`}
                >
                  {area.name.length > 20 ? area.name.substring(0, 20) + '...' : area.name}
                </div>

                {/* Size Label */}
                <div
                  className={`absolute -bottom-8 left-0 ${
                    activePrintAreaId === area.id ? 'bg-blue-500' : 'bg-gray-500'
                  } text-white text-[9px] font-black px-2 py-1 rounded whitespace-nowrap`}
                >
                  {area.width.toFixed(1)}% × {area.height.toFixed(1)}%
                </div>
              </div>
            ))}

            {/* Empty State */}
            {viewPrintAreas.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-center p-4">
                <div>
                  <Maximize2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-bold">No print areas defined for {selectedView} view</p>
                  <p className="text-xs mt-1 opacity-75">Click "Add Area" to create your first print zone</p>
                </div>
              </div>
            )}
          </div>

          {/* Active Print Area Info & Controls */}
          {activePrintArea && (
            <div className="space-y-2">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <Input
                      type="text"
                      value={activePrintArea.name}
                      onChange={(e) => updatePrintArea(activePrintArea.id!, { name: e.target.value })}
                      className="text-xs font-bold h-8 border-blue-300"
                      placeholder="Print area name"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePrintArea(activePrintArea.id!)}
                    className="h-8 w-8 text-red-600 hover:bg-red-50 ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-4 gap-2 text-[9px]">
                  <div>
                    <span className="text-blue-700">X:</span>{' '}
                    <span className="font-bold text-blue-900">{activePrintArea.x.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Y:</span>{' '}
                    <span className="font-bold text-blue-900">{activePrintArea.y.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-blue-700">W:</span>{' '}
                    <span className="font-bold text-blue-900">{activePrintArea.width.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-blue-700">H:</span>{' '}
                    <span className="font-bold text-blue-900">{activePrintArea.height.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Save Confirmation */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    alert(
                      `✓ Print area saved!\n\n` +
                      `Name: ${activePrintArea.name}\n` +
                      `View: ${selectedView}\n` +
                      `Position: ${activePrintArea.x.toFixed(1)}%, ${activePrintArea.y.toFixed(1)}%\n` +
                      `Size: ${activePrintArea.width.toFixed(1)}% × ${activePrintArea.height.toFixed(1)}%`
                    );
                  }}
                  className="flex-1 rounded-xl h-11 text-[10px] font-black uppercase bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Print Area
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center">
          <p className="text-xs font-bold text-amber-900">No mockup images available</p>
          <p className="text-[10px] text-amber-700 mt-1">
            Go to Display Tab → Add product images or color mockups to enable print area editor
          </p>
        </div>
      )}

      {/* All Print Areas Summary List */}
      {formData.printAreas.length > 0 && (
        <div className="space-y-3">
          <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">
            All Configured Print Areas ({formData.printAreas.length})
          </Label>

          <div className="space-y-2">
            {formData.printAreas.map((area) => {
              const areaView = (area.view || area.position)?.toLowerCase();
              const viewLabel = availableViews.find((v) => v.value === areaView)?.label || areaView;
              const isActive = activePrintAreaId === area.id;
              
              return (
                <div
                  key={area.id}
                  className={`p-3 rounded-xl border-2 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => {
                    setSelectedView(areaView as ViewType);
                    setActivePrintAreaId(area.id!);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-black">{area.name}</p>
                      <p className="text-[9px] text-gray-600">
                        View: {viewLabel} •
                        Area: {area.width.toFixed(1)}% × {area.height.toFixed(1)}% •
                        DPI: {area.dpi || 300}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <span className="text-[9px] bg-blue-500 text-white px-2 py-1 rounded font-black">
                          ACTIVE
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedView(areaView as ViewType);
                          setActivePrintAreaId(area.id!);
                        }}
                        className="h-8 w-8 text-blue-600 hover:bg-blue-100"
                        title="Edit this print area"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePrintArea(area.id!);
                        }}
                        className="h-8 w-8 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
