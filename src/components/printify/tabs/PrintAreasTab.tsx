import React, { useState, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Move, Lock, Unlock } from 'lucide-react';
import { TemplateFormData, PrintArea } from '@/hooks/useTemplateForm';

interface PrintAreasTabProps {
  formData: TemplateFormData;
  setFormData: React.Dispatch<React.SetStateAction<TemplateFormData>>;
}

// GLOBAL 4-VIEW SYSTEM: Only these 4 views allowed
type ViewType = 'front' | 'back' | 'left' | 'right';

export const PrintAreasTab: React.FC<PrintAreasTabProps> = ({
  formData,
  setFormData,
}) => {
  // View-based state
  const [selectedView, setSelectedView] = useState<ViewType>('front');
  const [activePrintAreaId, setActivePrintAreaId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState<string | null>(null);
  const [aspectRatioLocked, setAspectRatioLocked] = useState(false);
  
  // CRITICAL FIX: Reset active print area ONLY when view changes (not when areas are modified)
  React.useEffect(() => {
    // When view changes, reset to null to force clean slate for new view
    setActivePrintAreaId(null);
  }, [selectedView]);
  
  // CRITICAL: Ensure all print areas have unique IDs (fix legacy data)
  React.useEffect(() => {
    const hasInvalidIds = formData.printAreas.some(area => !area.id || area.id.length < 5);
    
    if (hasInvalidIds) {
      console.warn('[PrintAreasTab] Detected legacy areas with missing/invalid IDs - normalizing...');
      
      setFormData(prev => ({
        ...prev,
        printAreas: prev.printAreas.map(area => {
          // If area has no ID or ID is too short (legacy format like 'front'), generate new one
          if (!area.id || area.id.length < 5) {
            const view = area.view || area.position || 'unknown';
            const newId = `pa_${view}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            console.log(`[PrintAreasTab] Migrating area "${area.name}" from ID "${area.id}" to "${newId}"`);
            return { ...area, id: newId };
          }
          return area;
        }),
      }));
    }
  }, [formData.printAreas, setFormData]);
  
  // Animation frame ref for smooth updates
  const rafRef = useRef<number | null>(null);
  
  // FIXED: Store starting dimensions and container size to prevent jitter
  const [dragStartPos, setDragStartPos] = useState({ 
    mouseX: 0, 
    mouseY: 0, 
    areaX: 0, 
    areaY: 0,
    areaWidth: 0,
    areaHeight: 0,
    containerWidth: 0,
    containerHeight: 0,
  });

  // GLOBAL 4-VIEW SYSTEM: Always these 4 views, regardless of print areas
  const availableViews: { value: ViewType; label: string }[] = [
    { value: 'front', label: 'Front' },
    { value: 'back', label: 'Back' },
    { value: 'left', label: 'Left Side' },
    { value: 'right', label: 'Right Side' },
  ];

  // Get print areas for the currently selected view
  const viewPrintAreas = useMemo(() => {
    return formData.printAreas.filter((area) => {
      // CRITICAL: Normalize legacy data - treat position and view as interchangeable
      const currentAreaView = (area.view || area.position || '').toLowerCase();
      return currentAreaView === selectedView.toLowerCase();
    });
  }, [formData.printAreas, selectedView]);

  // Get active print area being edited - MUST belong to current view
  const activePrintArea = useMemo(() => {
    if (!activePrintAreaId) return viewPrintAreas[0] || null;
    
    // CRITICAL: Only return the area if it belongs to the current view
    const area = formData.printAreas.find((area) => area.id === activePrintAreaId);
    if (!area) return viewPrintAreas[0] || null;
    
    // Verify the area belongs to current view (normalize legacy data)
    const areaView = (area.view || area.position || '').toLowerCase();
    if (areaView !== selectedView.toLowerCase()) {
      // Area is from a different view - return first area in current view instead
      return viewPrintAreas[0] || null;
    }
    
    return area;
  }, [activePrintAreaId, formData.printAreas, viewPrintAreas, selectedView]);

  // Get mockup image for current view - simple direct mapping
  const selectedMockupUrl = useMemo(() => {
    // Priority 1: Color-specific mockup if available
    if (formData.colorMockups && Object.keys(formData.colorMockups).length > 0) {
      const firstColor = Object.keys(formData.colorMockups)[0];
      const viewKey = selectedView === 'left' ? 'side' : selectedView; // Map left → side
      const mockupUrl = formData.colorMockups[firstColor]?.[viewKey as 'front' | 'back' | 'side'];
      if (mockupUrl) return mockupUrl;
    }
    
    // Priority 2: General product images (direct index mapping)
    const viewIndexMap: Record<ViewType, number> = {
      'front': 0,
      'back': 1,
      'left': 2,
      'right': 3,
    };
    
    const imageIndex = viewIndexMap[selectedView];
    return formData.images[imageIndex] || formData.images[0] || '';
  }, [formData.images, formData.colorMockups, selectedView]);

  // Phase 3: Track mockup image natural dimensions for pixel calculation
  const [mockupDimensions, setMockupDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // Phase 3: Calculate pixel coordinates from percentages dynamically
  const calculatePixelCoordinates = (
    percent: number,
    dimension: number
  ): number => {
    return Math.round((percent / 100) * dimension);
  };

  // Phase 3: Get pixel coordinates for active print area
  const activeAreaPixels = useMemo(() => {
    if (!activePrintArea || !mockupDimensions) return null;

    return {
      x: calculatePixelCoordinates(activePrintArea.x, mockupDimensions.width),
      y: calculatePixelCoordinates(activePrintArea.y, mockupDimensions.height),
      width: calculatePixelCoordinates(activePrintArea.width, mockupDimensions.width),
      height: calculatePixelCoordinates(activePrintArea.height, mockupDimensions.height),
    };
  }, [activePrintArea, mockupDimensions]);

  // Phase 3: Add new print area to current view with reference mockup dimensions
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
      // Phase 3: Stamp reference mockup dimensions if available
      ...(mockupDimensions && {
        pixelX: calculatePixelCoordinates(25, mockupDimensions.width),
        pixelY: calculatePixelCoordinates(20, mockupDimensions.height),
        pixelWidth: calculatePixelCoordinates(50, mockupDimensions.width),
        pixelHeight: calculatePixelCoordinates(60, mockupDimensions.height),
        referenceMockupWidth: mockupDimensions.width,
        referenceMockupHeight: mockupDimensions.height,
        referenceMockupUrl: selectedMockupUrl,
      }),
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

  // Phase 3: Update specific print area by ID + stamp reference mockup dimensions
  const updatePrintArea = (id: string, updates: Partial<PrintArea>) => {
    setFormData((prev) => ({
      ...prev,
      printAreas: prev.printAreas.map((area) => {
        if (area.id !== id) return area;

        // CRITICAL: Hard normalization for legacy data compatibility
        // Legacy templates only have 'position', new ones have 'view'
        // Force BOTH to be set during every update to prevent state leakage
        const updatedArea = { 
          ...area, 
          ...updates,
          // Hard fallback chain: prefer view > position > current selectedView
          view: area.view || area.position || selectedView,
          position: area.position || area.view || selectedView,
        };
        
        if (mockupDimensions) {
          return {
            ...updatedArea,
            // Store pixel coordinates
            pixelX: calculatePixelCoordinates(updatedArea.x, mockupDimensions.width),
            pixelY: calculatePixelCoordinates(updatedArea.y, mockupDimensions.height),
            pixelWidth: calculatePixelCoordinates(updatedArea.width, mockupDimensions.width),
            pixelHeight: calculatePixelCoordinates(updatedArea.height, mockupDimensions.height),
            // Store reference mockup info
            referenceMockupWidth: mockupDimensions.width,
            referenceMockupHeight: mockupDimensions.height,
            referenceMockupUrl: selectedMockupUrl,
          };
        }

        return updatedArea;
      }),
    }));
  };

  // FIXED: Smooth drag/resize handlers with proper starting dimensions
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
    
    const container = (e.currentTarget as HTMLElement).closest('[data-canvas-container]') as HTMLElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    
    setActivePrintAreaId(areaId);
    
    if (action === 'drag') {
      setDragging(true);
      setDragStartPos({
        mouseX: e.clientX,
        mouseY: e.clientY,
        areaX: area.x,
        areaY: area.y,
        areaWidth: area.width,
        areaHeight: area.height,
        containerWidth: rect.width,
        containerHeight: rect.height,
      });
    } else if (action === 'resize' && corner) {
      setResizing(corner);
      setDragStartPos({
        mouseX: e.clientX,
        mouseY: e.clientY,
        areaX: area.x,
        areaY: area.y,
        areaWidth: area.width,
        areaHeight: area.height,
        containerWidth: rect.width,
        containerHeight: rect.height,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!activePrintArea || (!dragging && !resizing)) return;

    // Cancel any pending animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    // Use requestAnimationFrame for smooth, zero-lag updates
    rafRef.current = requestAnimationFrame(() => {
      // Use saved container dimensions - prevents recalculation jitter
      const deltaXPixels = e.clientX - dragStartPos.mouseX;
      const deltaYPixels = e.clientY - dragStartPos.mouseY;
      
      // Convert pixel delta to percentage using STARTING container dimensions
      const deltaXPercent = (deltaXPixels / dragStartPos.containerWidth) * 100;
      const deltaYPercent = (deltaYPixels / dragStartPos.containerHeight) * 100;

      if (dragging) {
        // Calculate new position from starting position
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
        let newWidth = dragStartPos.areaWidth;
        let newHeight = dragStartPos.areaHeight;
        let newX = dragStartPos.areaX;
        let newY = dragStartPos.areaY;

        // Calculate aspect ratio from starting dimensions
        const startAspectRatio = dragStartPos.areaWidth / dragStartPos.areaHeight;

        // Resize from corners - calculate from starting dimensions
        if (resizing === 'se') {
          // Southeast: expand right and down
          newWidth = dragStartPos.areaWidth + deltaXPercent;
          newHeight = dragStartPos.areaHeight + deltaYPercent;
          
          if (aspectRatioLocked) {
            const avgScale = (deltaXPercent / dragStartPos.areaWidth + deltaYPercent / dragStartPos.areaHeight) / 2;
            newWidth = dragStartPos.areaWidth * (1 + avgScale);
            newHeight = dragStartPos.areaHeight * (1 + avgScale);
          }
        } else if (resizing === 'sw') {
          // Southwest: expand left and down
          newX = dragStartPos.areaX + deltaXPercent;
          newWidth = dragStartPos.areaWidth - deltaXPercent;
          newHeight = dragStartPos.areaHeight + deltaYPercent;
          
          if (aspectRatioLocked) {
            const avgScale = (-deltaXPercent / dragStartPos.areaWidth + deltaYPercent / dragStartPos.areaHeight) / 2;
            newWidth = dragStartPos.areaWidth * (1 + avgScale);
            newHeight = dragStartPos.areaHeight * (1 + avgScale);
            newX = dragStartPos.areaX + dragStartPos.areaWidth - newWidth;
          }
        } else if (resizing === 'ne') {
          // Northeast: expand right and up
          newWidth = dragStartPos.areaWidth + deltaXPercent;
          newY = dragStartPos.areaY + deltaYPercent;
          newHeight = dragStartPos.areaHeight - deltaYPercent;
          
          if (aspectRatioLocked) {
            const avgScale = (deltaXPercent / dragStartPos.areaWidth - deltaYPercent / dragStartPos.areaHeight) / 2;
            newWidth = dragStartPos.areaWidth * (1 + avgScale);
            newHeight = dragStartPos.areaHeight * (1 + avgScale);
            newY = dragStartPos.areaY + dragStartPos.areaHeight - newHeight;
          }
        } else if (resizing === 'nw') {
          // Northwest: expand left and up
          newX = dragStartPos.areaX + deltaXPercent;
          newWidth = dragStartPos.areaWidth - deltaXPercent;
          newY = dragStartPos.areaY + deltaYPercent;
          newHeight = dragStartPos.areaHeight - deltaYPercent;
          
          if (aspectRatioLocked) {
            const avgScale = (-deltaXPercent / dragStartPos.areaWidth - deltaYPercent / dragStartPos.areaHeight) / 2;
            newWidth = dragStartPos.areaWidth * (1 + avgScale);
            newHeight = dragStartPos.areaHeight * (1 + avgScale);
            newX = dragStartPos.areaX + dragStartPos.areaWidth - newWidth;
            newY = dragStartPos.areaY + dragStartPos.areaHeight - newHeight;
          }
        }

        // Constrain to minimum and bounds
        newWidth = Math.max(10, Math.min(100 - newX, newWidth));
        newHeight = Math.max(10, Math.min(100 - newY, newHeight));
        newX = Math.max(0, Math.min(100 - newWidth, newX));
        newY = Math.max(0, Math.min(100 - newHeight, newY));

        updatePrintArea(activePrintArea.id!, {
          x: Math.round(newX * 10) / 10,
          y: Math.round(newY * 10) / 10,
          width: Math.round(newWidth * 10) / 10,
          height: Math.round(newHeight * 10) / 10,
        });
      }
    });
  };

  const handleMouseUp = () => {
    // Cancel any pending animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    
    setDragging(false);
    setResizing(null);
  };

  return (
    <div className="flex gap-2 h-[calc(100vh-180px)]">
      {/* LEFT SIDE: VISUAL CANVAS (65%) - ABSOLUTE HEIGHT LOCK */}
      <div className="w-[65%] flex flex-col gap-2">
        {/* Canvas Container - ABSOLUTE: No flex, fixed viewport calc */}
        <div
          className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-300 overflow-hidden shadow-lg flex items-center justify-center"
          style={{ height: 'calc(100vh - 260px)' }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Inner perfectly bounded container for aspect-ratio matching */}
          {selectedMockupUrl ? (
            <div 
              data-canvas-container
              className="relative shadow-sm"
              style={
                mockupDimensions
                  ? {
                      aspectRatio: `${mockupDimensions.width} / ${mockupDimensions.height}`,
                      maxHeight: '100%',
                      maxWidth: '100%',
                      height: mockupDimensions.width / mockupDimensions.height < 1 ? '100%' : 'auto',
                      width: mockupDimensions.width / mockupDimensions.height >= 1 ? '100%' : 'auto',
                    }
                  : { width: '100%', height: '100%' }
              }
            >
              <img
                src={selectedMockupUrl}
                alt={`${selectedView} view mockup`}
                className="absolute inset-0 w-full h-full pointer-events-none"
                onLoad={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  setMockupDimensions({
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                  });
                }}
                onError={(e) => {
                  e.currentTarget.src = '/custom-tee-mockup.png';
                  setMockupDimensions(null);
                }}
              />

              {/* Print Area Boxes - MOVED INSIDE THE IMAGE BOUNDS CONTAINER */}
              {viewPrintAreas.map((area) => {
                const isActive = activePrintAreaId === area.id;
                
                return (
                  <div
                    key={area.id}
                    className={`absolute border-4 transition-all duration-200 group ${
                      isActive
                        ? 'border-blue-500 bg-blue-500/10 shadow-2xl shadow-blue-500/30 z-20'
                        : 'border-gray-400 bg-gray-400/5 hover:border-blue-400 hover:bg-blue-400/5 z-10'
                    }`}
                    style={{
                      left: `${area.x}%`,
                      top: `${area.y}%`,
                      width: `${area.width}%`,
                      height: `${area.height}%`,
                      cursor: dragging ? 'grabbing' : 'grab',
                    }}
                    onMouseDown={(e) => handleMouseDown(e, area.id!, 'drag')}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePrintAreaId(area.id!);
                    }}
                  >
                    {/* Corner Resize Handles (Premium Style) */}
                    {isActive && (
                      <>
                        {['nw', 'ne', 'sw', 'se'].map((corner) => (
                          <div
                            key={corner}
                            className={`absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full shadow-lg hover:scale-150 transition-transform z-30 cursor-${corner}-resize`}
                            style={{
                              top: corner.includes('n') ? '-6px' : 'auto',
                              bottom: corner.includes('s') ? '-6px' : 'auto',
                              left: corner.includes('w') ? '-6px' : 'auto',
                              right: corner.includes('e') ? '-6px' : 'auto',
                            }}
                            onMouseDown={(e) => handleMouseDown(e, area.id!, 'resize', corner)}
                          />
                        ))}

                        {/* Floating Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removePrintArea(area.id!);
                          }}
                          className="absolute -top-10 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-30"
                          title="Delete print area"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}

                    {/* Center Move Icon */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div
                        className={`${
                          isActive ? 'bg-blue-500' : 'bg-gray-500 opacity-60 group-hover:opacity-100'
                        } text-white rounded-full p-2 shadow-lg transition-all`}
                      >
                        <Move className="h-5 w-5" />
                      </div>
                    </div>

                    {/* Top Label (Name) */}
                    <div
                      className={`absolute -top-9 left-0 ${
                        isActive ? 'bg-blue-500' : 'bg-gray-500'
                      } text-white text-[10px] font-bold px-3 py-1 rounded-md shadow-md max-w-[180px] truncate`}
                    >
                      {area.name}
                    </div>

                    {/* Bottom Label (Dimensions) */}
                    <div
                      className={`absolute -bottom-9 left-0 ${
                        isActive ? 'bg-blue-500' : 'bg-gray-500'
                      } text-white text-[9px] font-bold px-2 py-1 rounded-md shadow-md whitespace-nowrap`}
                    >
                      {area.width.toFixed(1)}% × {area.height.toFixed(1)}%
                    </div>
                  </div>
                );
              })}

              {/* Empty State Overlay */}
              {viewPrintAreas.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                  <div className="text-center text-white p-6 bg-black/20 rounded-2xl backdrop-blur-md">
                    <div className="text-4xl mb-3">📐</div>
                    <p className="text-base font-bold mb-1">No print areas for {availableViews.find(v => v.value === selectedView)?.label}</p>
                    <p className="text-sm opacity-90">Click "+ Add Print Area" to define a print zone</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-500">
              <div className="text-center">
                <p className="text-sm font-bold">No mockup image available</p>
                <p className="text-xs mt-1">Add product images to enable print area editor</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Toolbar */}
        <div className="flex gap-3">
          <Button
            type="button"
            onClick={addPrintArea}
            className="flex-1 h-11 rounded-xl text-[10px] font-black uppercase bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Print Area
          </Button>
          {activePrintArea && (
            <Button
              type="button"
              onClick={() => removePrintArea(activePrintArea.id!)}
              variant="destructive"
              className="h-11 px-6 rounded-xl text-[10px] font-black uppercase"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: CONTROL SIDEBAR (35%) */}
      <div className="w-[35%] space-y-4 overflow-y-auto pr-2">
        {/* View Selector Tabs */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-3 shadow-sm">
          <Label className="text-[8px] font-black uppercase text-gray-500 mb-2 block">
            Select View to Configure
          </Label>
          <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as ViewType)}>
            <TabsList className="grid w-full grid-cols-4 h-11">
              {availableViews.map((view) => (
                <TabsTrigger
                  key={view.value}
                  value={view.value}
                  className="text-[9px] font-black uppercase"
                >
                  {view.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <p className="text-[8px] text-gray-500 mt-2">
            {viewPrintAreas.length} area(s) defined • Auto-applies to all colors
          </p>
        </div>

        {/* Active Print Area Card - SIMPLIFIED */}
        {activePrintArea && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 shadow-sm">
            <Label className="text-[8px] font-black uppercase text-blue-600 mb-2 block">
              Active Print Area
            </Label>
            
            {/* Name Input - ONLY FIELD KEPT */}
            <Input
              type="text"
              value={activePrintArea.name}
              onChange={(e) => updatePrintArea(activePrintArea.id!, { name: e.target.value })}
              className="text-xs font-bold h-9 border-blue-300 bg-white"
              placeholder="Print area name"
            />
          </div>
        )}

        {/* Aspect Ratio Lock - ONLY CONTROL KEPT */}
        {activePrintArea && (
          <div className="bg-white rounded-xl border-2 border-gray-200 p-4 shadow-sm">
            <button
              type="button"
              onClick={() => setAspectRatioLocked(!aspectRatioLocked)}
              className={`w-full flex items-center justify-center gap-2 h-11 rounded-lg text-[10px] font-bold uppercase transition-colors ${
                aspectRatioLocked
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {aspectRatioLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              {aspectRatioLocked ? 'Aspect Locked' : 'Lock Aspect Ratio'}
            </button>
          </div>
        )}

        {/* All Print Areas List */}
        {formData.printAreas.length > 0 && (
          <div className="bg-white rounded-xl border-2 border-gray-200 p-3 shadow-sm">
            <Label className="text-[8px] font-black uppercase text-gray-500 mb-2 block">
              All Print Areas ({formData.printAreas.length})
            </Label>
            
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {formData.printAreas.map((area) => {
                const areaView = (area.view || area.position)?.toLowerCase();
                const viewLabel = availableViews.find((v) => v.value === areaView)?.label || areaView;
                const isActive = activePrintAreaId === area.id;
                
                return (
                  <div
                    key={area.id}
                    className={`p-2 rounded-lg border-2 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => {
                      setSelectedView(areaView as ViewType);
                      setActivePrintAreaId(area.id!);
                    }}
                  >
                    <p className="text-[10px] font-bold truncate">{area.name}</p>
                    <p className="text-[8px] text-gray-600">
                      {viewLabel} • {area.width.toFixed(0)}×{area.height.toFixed(0)}%
                      {isActive && <span className="ml-1 text-blue-600 font-bold">• ACTIVE</span>}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <p className="text-[9px] font-bold text-green-900">✓ Global 4-View System</p>
          <p className="text-[8px] text-green-700 mt-1">
            Print areas defined here automatically apply to ALL product colors
          </p>
        </div>
      </div>
    </div>
  );
};
