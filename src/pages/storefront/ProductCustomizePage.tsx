import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useShop } from '@/context/ShopContext';
import { ArrowLeft, Upload, Type, Layout, ShoppingBag, Sliders, RefreshCw, ZoomIn, ZoomOut, Check, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { optimizeImage } from '@/lib/imageUtils';
import { motion, AnimatePresence } from 'motion/react';

export const ProductCustomizePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { products, settings, addToCart } = useShop();

  const product = products.find((p) => p.slug === slug);
  const printifyEnabled = settings.printifySettings?.enabled;

  // Safeguard redirect if Printify is not enabled or not a custom product
  useEffect(() => {
    if (!product || !printifyEnabled || !product.isPrintify) {
      navigate(product ? `/product/${product.slug}` : '/categories');
    }
  }, [product, printifyEnabled, navigate]);

  if (!product || !printifyEnabled || !product.isPrintify) {
    return <div className="min-h-screen bg-white" />;
  }

  // State configurations
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || '#FFFFFF');
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || 'M');
  const [activeTab, setActiveTab] = useState<'product' | 'upload' | 'text' | 'ai'>('product');

  // Customizer image state
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [imagePos, setImagePos] = useState({ x: 50, y: 50, scale: 1, rotate: 0 });
  const [isUploading, setIsUploading] = useState(false);

  // Customizer text state
  const [customText, setCustomText] = useState('');
  const [textFont, setTextFont] = useState('Inter');
  const [textColor, setTextColor] = useState('#000000');
  const [textPos, setTextPos] = useState({ x: 50, y: 30, scale: 1, rotate: 0 });

  // AI mockups placeholder state
  const [aiMockups, setAiMockups] = useState<string[]>([]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Dragging states
  const [isDragging, setIsDragging] = useState<'image' | 'text' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const printAreaRef = useRef<HTMLDivElement>(null);
  const compiledCanvasRef = useRef<HTMLCanvasElement>(null);

  // Available fonts
  const fontOptions = [
    { name: 'Modern Sans (Inter)', value: 'Inter' },
    { name: 'Elegant Serif (Playfair)', value: 'Playfair Display' },
    { name: 'Playful Cursive (Pacifico)', value: 'Pacifico' },
    { name: 'Bold Geometric (Montserrat)', value: 'Montserrat' },
    { name: 'Impact Condensed (Oswald)', value: 'Oswald' },
  ];

  // Dynamic colors list mapping for display
  const colorMap: Record<string, string> = {
    '#FFFFFF': 'White',
    '#111827': 'Charcoal / Black',
    '#EF4444': 'Ruby Red',
    '#3B82F6': 'Royal Blue',
    '#10B981': 'Emerald Green',
  };

  // Drag interaction handlers
  const handlePointerDown = (type: 'image' | 'text', e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(type);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragOffset(type === 'image' ? { x: imagePos.x, y: imagePos.y } : { x: textPos.x, y: textPos.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !printAreaRef.current) return;
    const rect = printAreaRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStart.x) / rect.width) * 100;
    const dy = ((e.clientY - dragStart.y) / rect.height) * 100;

    const newX = Math.max(0, Math.min(100, dragOffset.x + dx));
    const newY = Math.max(0, Math.min(100, dragOffset.y + dy));

    if (isDragging === 'image') {
      setImagePos((prev) => ({ ...prev, x: newX, y: newY }));
    } else {
      setTextPos((prev) => ({ ...prev, x: newX, y: newY }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setIsDragging(null);
    }
  };

  // Image upload optimization handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const optimized = await optimizeImage(file, 800, 800);
      setCustomImage(optimized);
      setImagePos({ x: 50, y: 50, scale: 0.5, rotate: 0 });
      setActiveTab('upload');
    } catch (err) {
      console.error('Failed to optimize custom design upload:', err);
      alert('Error processing image. Please try another file.');
    } finally {
      setIsUploading(false);
    }
  };

  // Clean design values
  const handleReset = () => {
    if (confirm('Are you sure you want to reset all design inputs?')) {
      setCustomImage(null);
      setCustomText('');
      setImagePos({ x: 50, y: 50, scale: 1, rotate: 0 });
      setTextPos({ x: 50, y: 30, scale: 1, rotate: 0 });
    }
  };

  // Local compilation rendering helper to generate preview output
  const generatePreviewDataUrl = (): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = compiledCanvasRef.current;
      if (!canvas) {
        resolve('');
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }

      // Width and Height setup
      canvas.width = 600;
      canvas.height = 600;

      // 1. Draw base T-shirt mockup background tint
      ctx.fillStyle = selectedColor;
      ctx.fillRect(0, 0, 600, 600);

      // Load base mockup
      const baseImg = new Image();
      baseImg.src = '/custom-tee-mockup.png';
      baseImg.onload = () => {
        // Draw shirt mockup multiplying background color
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(baseImg, 0, 0, 600, 600);
        ctx.globalCompositeOperation = 'source-over';

        // Print area coordinates relative to 600x600 canvas (35% width, 45% height, centered horizontally)
        const pw = 600 * 0.35;
        const ph = 600 * 0.45;
        const px = (600 - pw) / 2;
        const py = 600 * 0.28;

        // Clip print area boundary if needed, or draw overlay directly
        ctx.save();
        
        // 2. Draw Custom Image Overlay if exists
        if (customImage) {
          const overlayImg = new Image();
          overlayImg.src = customImage;
          overlayImg.onload = () => {
            ctx.save();
            // Translate to center of image position
            const cx = px + (imagePos.x / 100) * pw;
            const cy = py + (imagePos.y / 100) * ph;
            ctx.translate(cx, cy);
            ctx.rotate((imagePos.rotate * Math.PI) / 180);
            
            const targetW = pw * 0.8 * imagePos.scale;
            const targetH = targetW * (overlayImg.height / overlayImg.width);
            ctx.drawImage(overlayImg, -targetW / 2, -targetH / 2, targetW, targetH);
            ctx.restore();
            drawText();
          };
        } else {
          drawText();
        }

        function drawText() {
          // 3. Draw Custom Text Overlay if exists
          if (customText.trim()) {
            ctx.save();
            const cx = px + (textPos.x / 100) * pw;
            const cy = py + (textPos.y / 100) * ph;
            ctx.translate(cx, cy);
            ctx.rotate((textPos.rotate * Math.PI) / 180);

            const fontSize = Math.round(18 * textPos.scale);
            ctx.font = `bold ${fontSize}px "${textFont}", sans-serif`;
            ctx.fillStyle = textColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(customText, 0, 0);
            ctx.restore();
          }

          ctx.restore();
          resolve(canvas.toDataURL('image/webp', 0.85));
        }
      };
      baseImg.onerror = () => {
        resolve('');
      };
    });
  };

  // Add customized item to shopping cart
  const handleAddToCart = async () => {
    const previewUrl = await generatePreviewDataUrl();
    const customization = {
      customImageUrl: customImage || undefined,
      customText: customText || undefined,
      textColor: customText ? textColor : undefined,
      fontFamily: customText ? textFont : undefined,
      imagePosition: customImage ? { ...imagePos } : undefined,
      textPosition: customText ? { ...textPos } : undefined,
      previewUrl: previewUrl || undefined,
    };

    addToCart(product, undefined, 1, {
      color: selectedColor,
      size: selectedSize,
      customization,
    });

    navigate('/cart');
  };

  // Trigger AI Mockup generation
  const handleGenerateAiMockup = async () => {
    setIsGeneratingAi(true);
    setAiMockups([]);
    
    // Simulate generation loop
    setTimeout(() => {
      // In a real flow, this would call /api/printify/generate-ai-mockup
      // For now, we generate simulated photorealistic styled variations
      const simulatedMockups = [
        '/custom-tee-mockup.png', // Fallback
      ];
      setAiMockups(simulatedMockups);
      setIsGeneratingAi(false);
    }, 2000);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-2">
          <Link to={`/product/${product.slug}`} className="flex items-center gap-2 text-xs font-black uppercase text-gray-400 hover:text-black">
            <ArrowLeft className="h-4 w-4" /> Back to Product
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-xs font-black uppercase tracking-widest text-black">Bespoke Customizer</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="rounded-xl text-[10px] font-black uppercase">
            Reset Design
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: T-Shirt interactive preview canvas */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative w-full max-w-[500px] aspect-square rounded-[2.5rem] bg-gray-50 border border-gray-100 overflow-hidden shadow-sm flex items-center justify-center p-8">
            
            {/* Base Color Fill */}
            <div 
              className="absolute inset-0 transition-colors duration-300"
              style={{ backgroundColor: selectedColor }}
            />

            {/* White T-Shirt Overlay Mockup */}
            <img 
              src="/custom-tee-mockup.png" 
              alt="T-shirt Mockup" 
              className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none mix-blend-multiply transition-opacity duration-300"
            />

            {/* Print Area Boundary Box (Centered, 35% width, 45% height) */}
            <div 
              ref={printAreaRef}
              className="absolute w-[35%] h-[45%] top-[28%] border-2 border-dashed border-gray-400/50 hover:border-gray-500 rounded-xl transition-all flex items-center justify-center select-none"
              onPointerMove={handlePointerMove}
            >
              <span className="absolute -top-6 text-[8px] font-black uppercase tracking-widest text-gray-400 bg-white/80 px-2 py-0.5 rounded-full select-none">
                Print Boundary
              </span>

              {/* Uploaded Custom Image Overlay */}
              {customImage && (
                <div 
                  className={`absolute cursor-move select-none ${isDragging === 'image' ? 'ring-2 ring-black/35 rounded' : 'hover:ring-1 hover:ring-gray-300 rounded'}`}
                  style={{
                    left: `${imagePos.x}%`,
                    top: `${imagePos.y}%`,
                    transform: `translate(-50%, -50%) scale(${imagePos.scale}) rotate(${imagePos.rotate}deg)`,
                    touchAction: 'none'
                  }}
                  onPointerDown={(e) => handlePointerDown('image', e)}
                  onPointerUp={handlePointerUp}
                >
                  <img 
                    src={customImage} 
                    alt="Custom Print" 
                    className="max-w-[120px] select-none pointer-events-none object-contain"
                  />
                </div>
              )}

              {/* Custom Text Overlay */}
              {customText.trim() && (
                <div 
                  className={`absolute cursor-move select-none whitespace-nowrap leading-none ${isDragging === 'text' ? 'ring-2 ring-black/35 rounded' : 'hover:ring-1 hover:ring-gray-300 rounded'}`}
                  style={{
                    left: `${textPos.x}%`,
                    top: `${textPos.y}%`,
                    transform: `translate(-50%, -50%) scale(${textPos.scale}) rotate(${textPos.rotate}deg)`,
                    fontFamily: `"${textFont}", sans-serif`,
                    color: textColor,
                    fontWeight: 'bold',
                    touchAction: 'none',
                    fontSize: '14px'
                  }}
                  onPointerDown={(e) => handlePointerDown('text', e)}
                  onPointerUp={handlePointerUp}
                >
                  {customText}
                </div>
              )}
            </div>
          </div>
          
          <p className="text-[10px] text-gray-400 mt-4 uppercase font-black tracking-widest flex items-center gap-1.5 opacity-70">
            <HelpCircle className="h-3.5 w-3.5" /> Drag overlays directly inside the boundary box to adjust placement.
          </p>
        </div>

        {/* Right: Controls Options Panel */}
        <div className="lg:col-span-5 bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm flex flex-col">
          {/* Tab Selection */}
          <div className="grid grid-cols-4 border-b">
            {[
              { id: 'product', label: 'Shirt', icon: Layout },
              { id: 'upload', label: 'Graphic', icon: Upload },
              { id: 'text', label: 'Text', icon: Type },
              { id: 'ai', label: 'AI Preview', icon: RefreshCw },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 flex flex-col items-center justify-center gap-1.5 border-r last:border-r-0 transition-colors ${activeTab === tab.id ? 'bg-gray-50 text-black border-b-2 border-b-black' : 'text-gray-400 hover:text-black'}`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[9px] font-black uppercase tracking-wider">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-6 flex-1 min-h-[350px]">
            {/* Tab: Product Options */}
            {activeTab === 'product' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider mb-2">Selected Product</h3>
                  <p className="text-xs text-gray-500 font-bold">{product.name}</p>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Select Shirt Color ({colorMap[selectedColor] || selectedColor})</Label>
                  <div className="flex flex-wrap gap-3">
                    {product.colors?.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center ${selectedColor === color ? 'border-black scale-110 shadow-sm' : 'border-transparent'}`}
                      >
                        <div className="w-6.5 h-6.5 rounded-full border border-gray-100" style={{ backgroundColor: color }} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Select Size</Label>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes?.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-5 py-2 text-xs rounded-xl font-black uppercase tracking-wider border-2 transition-all ${selectedSize === size ? 'bg-black text-white border-black shadow-md' : 'bg-white text-black hover:border-gray-300'}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Upload Custom Graphic */}
            {activeTab === 'upload' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Upload Your Artwork</Label>
                  
                  {!customImage ? (
                    <div className="relative group border-2 border-dashed border-gray-200 hover:border-black rounded-2xl p-8 transition-colors flex flex-col items-center justify-center cursor-pointer">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Upload className="h-8 w-8 text-gray-400 group-hover:text-black mb-3 transition-colors" />
                      <span className="text-xs font-black uppercase tracking-wider">{isUploading ? 'Compressing WebP...' : 'Choose File'}</span>
                      <span className="text-[9px] text-gray-400 mt-1 uppercase font-bold tracking-wider opacity-60">Supports PNG, JPG (Auto-optimized)</span>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-2xl border flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={customImage} alt="Preview" className="w-12 h-12 object-contain bg-white rounded border" />
                        <div>
                          <p className="text-xs font-black uppercase text-gray-600">Graphic Uploaded</p>
                          <p className="text-[9px] text-gray-400 uppercase font-black">Ready for placement</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setCustomImage(null)} className="text-red-500 font-bold uppercase text-[10px]">
                        Remove
                      </Button>
                    </div>
                  )}
                </div>

                {customImage && (
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Manual Graphic Placement</h4>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
                        <span>Graphic Size (Scale)</span>
                        <span>{Math.round(imagePos.scale * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="2.5"
                        step="0.05"
                        value={imagePos.scale}
                        onChange={(e) => setImagePos((prev) => ({ ...prev, scale: parseFloat(e.target.value) }))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
                        <span>Rotation</span>
                        <span>{imagePos.rotate}°</span>
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="1"
                        value={imagePos.rotate}
                        onChange={(e) => setImagePos((prev) => ({ ...prev, rotate: parseInt(e.target.value) }))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Custom Text */}
            {activeTab === 'text' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Enter Customize Text</Label>
                  <Input
                    placeholder="Type customized word..."
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    className="rounded-xl h-11 border-gray-200 text-sm"
                  />
                </div>

                {customText.trim() && (
                  <div className="space-y-5 pt-4 border-t space-y-4 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Font Style</Label>
                        <select
                          value={textFont}
                          onChange={(e) => setTextFont(e.target.value)}
                          className="w-full h-10 border rounded-xl px-3 text-xs bg-white focus:outline-none"
                        >
                          {fontOptions.map((font) => (
                            <option key={font.value} value={font.value}>
                              {font.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Text Color</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={textColor}
                            onChange={(e) => setTextColor(e.target.value)}
                            className="w-10 h-10 p-0 rounded-xl border-none cursor-pointer"
                          />
                          <span className="text-xs font-mono font-bold uppercase">{textColor}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
                        <span>Text Size</span>
                        <span>{Math.round(textPos.scale * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="3"
                        step="0.1"
                        value={textPos.scale}
                        onChange={(e) => setTextPos((prev) => ({ ...prev, scale: parseFloat(e.target.value) }))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
                        <span>Rotation</span>
                        <span>{textPos.rotate}°</span>
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="1"
                        value={textPos.rotate}
                        onChange={(e) => setTextPos((prev) => ({ ...prev, rotate: parseInt(e.target.value) }))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: AI Mockups Preview */}
            {activeTab === 'ai' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider mb-1">AI Live Preview Pipeline</h3>
                  <p className="text-[10px] text-gray-400 leading-normal uppercase font-black tracking-wider opacity-70">
                    Active AI Model: {settings.printifySettings?.preview.aiConfig.provider || 'gemini'}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border text-center space-y-3">
                  <p className="text-xs text-gray-500 leading-normal">
                    Generate highly photorealistic models wearing your custom-designed T-shirt dynamically using artificial intelligence.
                  </p>
                  
                  <Button
                    onClick={handleGenerateAiMockup}
                    disabled={isGeneratingAi}
                    className="w-full rounded-xl font-bold uppercase tracking-widest text-xs h-11"
                    style={{
                      backgroundColor: settings.primaryColor,
                      color: 'var(--primary-foreground)',
                    }}
                  >
                    {isGeneratingAi ? 'Invoking AI Pipeline...' : 'Generate AI Live Preview'}
                  </Button>
                </div>

                {aiMockups.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Generated AI Mockups</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {aiMockups.map((url, i) => (
                        <div key={i} className="aspect-square rounded-xl overflow-hidden border bg-gray-100 shadow-sm relative group">
                          <img src={url} alt="AI Mock" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                            <span className="text-[8px] font-black uppercase tracking-widest text-white border border-white/50 px-2 py-1 rounded-full">
                              Active Mockup
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="p-6 border-t bg-gray-50 flex flex-col gap-3">
            <Button
              size="lg"
              onClick={handleAddToCart}
              className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
              style={{
                backgroundColor: settings.primaryColor,
                color: 'var(--primary-foreground)',
                borderColor: 'var(--primary-border)',
              }}
            >
              <ShoppingBag className="h-5 w-5" />
              Add Customized to Cart
            </Button>
            
            <p className="text-[8px] text-gray-400 text-center uppercase font-bold tracking-widest opacity-60">
              Orders automatically sync to Printify POD warehouses upon payment validation
            </p>
          </div>
        </div>
      </div>

      {/* Hidden compilation Canvas */}
      <canvas ref={compiledCanvasRef} className="hidden" />
    </div>
  );
};
