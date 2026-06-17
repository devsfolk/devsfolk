import React, { useState, useRef, useEffect } from 'react';
import { fabric } from 'fabric';
import { 
  Upload, Type, Trash2, RotateCcw, Save, ArrowRight,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { optimizeImage } from '@/lib/imageUtils';
import { Product, PrintifyCatalogTemplate } from '@/types';

interface DesignStudioProps {
  template: Product;
  templateData?: PrintifyCatalogTemplate;
  selectedColor: string;
  selectedSize: string;
  onNext: (designData: string) => void;
  onBack: () => void;
}

const FONT_OPTIONS = [
  { name: 'Modern Sans (Inter)', value: 'Inter' },
  { name: 'Elegant Serif (Playfair)', value: 'Playfair Display' },
  { name: 'Playful Cursive (Pacifico)', value: 'Pacifico' },
  { name: 'Bold Geometric (Montserrat)', value: 'Montserrat' },
  { name: 'Impact Condensed (Oswald)', value: 'Oswald' },
];

export const DesignStudio: React.FC<DesignStudioProps> = ({
  template,
  templateData,
  selectedColor,
  selectedSize,
  onNext,
  onBack,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [hasDesign, setHasDesign] = useState(false);
  const [hasText, setHasText] = useState(false);
  
  // Text Tool State
  const [textValue, setTextValue] = useState('');
  const [textFont, setTextFont] = useState('Inter');
  const [textColor, setTextColor] = useState('#000000');
  const [textSize, setTextSize] = useState(40);
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  const [textUnderline, setTextUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  
  // Canvas Refs
  const templateImageRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  // Get print area from template
  const printArea = templateData?.printAreas?.[0] || {
    position: 'front',
    width: 40, // Default 40% of width
    height: 50, // Default 50% of height
    x: 30, // Default centered-ish
    y: 25,
  };

  // Initialize Fabric.js Canvas
  useEffect(() => {
    const container = templateImageRef.current;
    const canvasEl = canvasElRef.current;
    
    if (!container || !canvasEl) return;

    let canvas: fabric.Canvas | null = null;
    let disposed = false;

    const initCanvas = () => {
      if (disposed) return;

      const rect = container.getBoundingClientRect();
      const width = Math.round(rect.width || container.clientWidth);
      const height = Math.round(rect.height || container.clientHeight);
      
      if (width < 24 || height < 24) return;

      if (!canvas) {
        canvas = new fabric.Canvas(canvasEl, {
          width,
          height,
          backgroundColor: 'transparent',
          preserveObjectStacking: true,
        });
        fabricCanvasRef.current = canvas;

        // Track object changes
        canvas.on('object:added', () => updateDesignState());
        canvas.on('object:removed', () => updateDesignState());
        canvas.on('selection:created', syncSelection);
        canvas.on('selection:updated', syncSelection);
        canvas.on('selection:cleared', () => {});
      } else {
        canvas.setWidth(width);
        canvas.setHeight(height);
        canvas.renderAll();
      }
    };

    const syncSelection = () => {
      const activeObj = canvas?.getActiveObject();
      if (activeObj && activeObj.type === 'i-text') {
        const textObj = activeObj as fabric.IText;
        setTextValue(textObj.text || '');
        setTextFont(textObj.fontFamily || 'Inter');
        setTextColor(textObj.fill as string || '#000000');
        setTextSize(textObj.fontSize || 40);
        setTextBold(textObj.fontWeight === 'bold');
        setTextItalic(textObj.fontStyle === 'italic');
        setTextUnderline(!!textObj.underline);
        setTextAlign((textObj.textAlign as 'left' | 'center' | 'right') || 'left');
      }
    };

    const updateDesignState = () => {
      if (!canvas) return;
      const images = canvas.getObjects('image');
      const texts = canvas.getObjects('i-text');
      setHasDesign(images.length > 0);
      setHasText(texts.length > 0);
    };

    initCanvas();
    requestAnimationFrame(initCanvas);

    return () => {
      disposed = true;
      if (canvas) {
        canvas.dispose();
      }
      fabricCanvasRef.current = null;
    };
  }, []);

  // Handle Design Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const optimized = await optimizeImage(file, 800, 800);
      const canvas = fabricCanvasRef.current;
      
      if (canvas) {
        fabric.Image.fromURL(optimized, (img) => {
          const scaleFactor = (canvas.width! * 0.4) / (img.width || 1);
          img.set({
            left: canvas.width! / 2,
            top: canvas.height! / 2,
            originX: 'center',
            originY: 'center',
            scaleX: scaleFactor,
            scaleY: scaleFactor,
            cornerColor: '#000000',
            cornerStrokeColor: '#ffffff',
            borderColor: '#000000',
            cornerSize: 8,
          });
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();
          setHasDesign(true);
        });
      }
    } catch (err) {
      console.error('[Image Upload] Error:', err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Add Text to Canvas
  const addText = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !textValue.trim()) return;

    const text = new fabric.IText(textValue, {
      left: canvas.width! / 2,
      top: canvas.height! / 2,
      originX: 'center',
      originY: 'center',
      fontFamily: textFont,
      fontSize: textSize,
      fill: textColor,
      fontWeight: textBold ? 'bold' : 'normal',
      fontStyle: textItalic ? 'italic' : 'normal',
      underline: textUnderline,
      textAlign: textAlign,
      cornerColor: '#000000',
      cornerStrokeColor: '#ffffff',
      borderColor: '#000000',
      cornerSize: 8,
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    setHasText(true);
  };

  // Update Selected Text
  const updateSelectedText = () => {
    const canvas = fabricCanvasRef.current;
    const activeObj = canvas?.getActiveObject();
    
    if (activeObj && activeObj.type === 'i-text') {
      const textObj = activeObj as fabric.IText;
      textObj.set({
        text: textValue,
        fontFamily: textFont,
        fontSize: textSize,
        fill: textColor,
        fontWeight: textBold ? 'bold' : 'normal',
        fontStyle: textItalic ? 'italic' : 'normal',
        underline: textUnderline,
        textAlign: textAlign,
      });
      canvas?.renderAll();
    }
  };

  // Delete Selected Object
  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    const activeObj = canvas?.getActiveObject();
    
    if (activeObj) {
      canvas?.remove(activeObj);
      canvas?.renderAll();
    }
  };

  // Clear All
  const clearAll = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      canvas.clear();
      canvas.backgroundColor = 'transparent';
      canvas.renderAll();
      setHasDesign(false);
      setHasText(false);
    }
  };

  // Export Design
  const exportDesign = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1,
      });
      onNext(dataURL);
    }
  };

  return (
    <div className="space-y-6">
      {/* Design Canvas Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Design Canvas</h2>
            <p className="text-sm text-gray-500 mt-1">Upload your design or add text</p>
          </div>

          {/* Two-Layer Color Masking */}
          <div
            ref={templateImageRef}
            className="relative w-full aspect-square rounded-3xl overflow-hidden border-2 border-gray-300 shadow-lg"
            style={{ maxHeight: '600px' }}
          >
            {/* Bottom Layer: Solid Color */}
            <div
              className="absolute inset-0"
              style={{ 
                backgroundColor: selectedColor.startsWith('#') ? selectedColor : '#FFFFFF' 
              }}
            />

            {/* Middle Layer: Template Image (Alpha Shadow Overlay) */}
            <img
              src={template.images[0] || '/custom-tee-mockup.png'}
              alt="Template"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{ mixBlendMode: 'multiply', opacity: 0.3 }}
            />

            {/* Top Layer: Fabric.js Canvas (Design Area) */}
            <canvas
              ref={canvasElRef}
              className="absolute inset-0"
              style={{
                left: `${printArea.x}%`,
                top: `${printArea.y}%`,
                width: `${printArea.width}%`,
                height: `${printArea.height}%`,
              }}
            />

            {/* Print Area Indicator (Optional - shows boundary) */}
            <div
              className="absolute border-2 border-dashed border-blue-400 pointer-events-none opacity-50"
              style={{
                left: `${printArea.x}%`,
                top: `${printArea.y}%`,
                width: `${printArea.width}%`,
                height: `${printArea.height}%`,
              }}
            />
          </div>

          {/* Canvas Controls */}
          <div className="flex items-center justify-between">
            <Button
              onClick={deleteSelected}
              variant="outline"
              size="sm"
              className="rounded-xl h-10 px-4 text-xs font-black uppercase"
            >
              <Trash2 className="h-3 w-3 mr-2" />
              Delete Selected
            </Button>

            <Button
              onClick={clearAll}
              variant="outline"
              size="sm"
              className="rounded-xl h-10 px-4 text-xs font-black uppercase text-red-600 border-red-200 hover:bg-red-50"
            >
              <RotateCcw className="h-3 w-3 mr-2" />
              Clear All
            </Button>
          </div>
        </div>

        {/* Tools Panel */}
        <div className="space-y-6">
          {/* Upload Design */}
          <div className="p-4 bg-white border-2 border-gray-200 rounded-3xl space-y-3">
            <h3 className="text-sm font-black uppercase tracking-tight">Upload Design</h3>
            
            <label className="block">
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleImageUpload}
                disabled={isUploading}
                className="hidden"
              />
              <Button
                asChild
                disabled={isUploading}
                className="w-full rounded-xl h-12 text-xs font-black uppercase cursor-pointer"
              >
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Choose Image'}
                </span>
              </Button>
            </label>
            
            <p className="text-[9px] text-gray-500">PNG, JPG, or SVG • Max 5MB</p>
          </div>

          {/* Add Text */}
          <div className="p-4 bg-white border-2 border-gray-200 rounded-3xl space-y-3">
            <h3 className="text-sm font-black uppercase tracking-tight">Add Text</h3>
            
            <div className="space-y-3">
              <Input
                type="text"
                placeholder="Enter your text..."
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                className="rounded-xl h-10 text-xs"
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[9px] uppercase text-gray-500">Font</Label>
                  <Select value={textFont} onValueChange={setTextFont}>
                    <SelectTrigger className="rounded-xl h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map(font => (
                        <SelectItem key={font.value} value={font.value} className="text-xs">
                          {font.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[9px] uppercase text-gray-500">Size</Label>
                  <Input
                    type="number"
                    min="10"
                    max="200"
                    value={textSize}
                    onChange={(e) => setTextSize(parseInt(e.target.value) || 40)}
                    className="rounded-xl h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[9px] uppercase text-gray-500">Color</Label>
                <Input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="rounded-xl h-10 w-full cursor-pointer"
                />
              </div>

              {/* Text Formatting */}
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant={textBold ? 'default' : 'outline'}
                  onClick={() => setTextBold(!textBold)}
                  className="rounded-lg h-8 w-8 p-0"
                >
                  <Bold className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant={textItalic ? 'default' : 'outline'}
                  onClick={() => setTextItalic(!textItalic)}
                  className="rounded-lg h-8 w-8 p-0"
                >
                  <Italic className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant={textUnderline ? 'default' : 'outline'}
                  onClick={() => setTextUnderline(!textUnderline)}
                  className="rounded-lg h-8 w-8 p-0"
                >
                  <Underline className="h-3 w-3" />
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <Button
                  size="sm"
                  variant={textAlign === 'left' ? 'default' : 'outline'}
                  onClick={() => setTextAlign('left')}
                  className="rounded-lg h-8 w-8 p-0"
                >
                  <AlignLeft className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant={textAlign === 'center' ? 'default' : 'outline'}
                  onClick={() => setTextAlign('center')}
                  className="rounded-lg h-8 w-8 p-0"
                >
                  <AlignCenter className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant={textAlign === 'right' ? 'default' : 'outline'}
                  onClick={() => setTextAlign('right')}
                  className="rounded-lg h-8 w-8 p-0"
                >
                  <AlignRight className="h-3 w-3" />
                </Button>
              </div>

              <Button
                onClick={addText}
                disabled={!textValue.trim()}
                className="w-full rounded-xl h-10 text-xs font-black uppercase"
              >
                <Type className="h-3 w-3 mr-2" />
                Add Text
              </Button>

              <Button
                onClick={updateSelectedText}
                variant="outline"
                disabled={!textValue.trim()}
                className="w-full rounded-xl h-10 text-xs font-black uppercase"
              >
                <Save className="h-3 w-3 mr-2" />
                Update Selected
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Button
            onClick={onBack}
            variant="outline"
            className="rounded-xl h-12 px-6 text-sm font-black uppercase"
          >
            ← Back
          </Button>

          <div className="flex items-center gap-4">
            {(hasDesign || hasText) && (
              <div className="text-sm text-gray-600">
                {hasDesign && hasText && '✓ Design & Text added'}
                {hasDesign && !hasText && '✓ Design added'}
                {!hasDesign && hasText && '✓ Text added'}
              </div>
            )}

            <Button
              onClick={exportDesign}
              disabled={!hasDesign && !hasText}
              className="rounded-xl h-12 px-8 text-sm font-black uppercase bg-black hover:bg-neutral-800 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Generate Preview
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
