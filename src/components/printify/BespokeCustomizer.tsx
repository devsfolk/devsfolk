import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useShop } from '@/context/ShopContext';
import { fabric } from 'fabric';
import { ArrowLeft, Upload, Type, Layout, ShoppingBag, RefreshCw, HelpCircle, Palette, RotateCcw, Trash2, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { optimizeImage } from '@/lib/imageUtils';
import { motion, AnimatePresence } from 'motion/react';
import { usePrintifyCatalog } from '@/hooks/usePrintifyCatalog';
import { Product, PrintifyCatalogTemplate } from '@/types';

interface BespokeCustomizerProps {
  productSlug?: string;
  showHeader?: boolean;
}

export const BespokeCustomizer: React.FC<BespokeCustomizerProps> = ({ productSlug, showHeader = true }) => {
  const navigate = useNavigate();
  const { products, settings, addToCart } = useShop();
  const { enabledTemplates } = usePrintifyCatalog();
  const [templateSearch, setTemplateSearch] = useState('');

  const normalizeTemplateImage = (image: any) => {
    if (!image) return '';
    if (typeof image === 'string') return image;
    return image.src || image.url || image.preview_url || '';
  };

  const calculateTemplateRetailPrice = (basePrice: number) => {
    const charges = settings.printifySettings?.charges;
    const profitMarginPercent = Math.max(0, Number(charges?.profitMarginPercent ?? 0));
    return Number((basePrice * (1 + profitMarginPercent / 100)).toFixed(2));
  };

  const calculateCustomizedPrice = (retailPrice: number) => {
    const designFee = Math.max(0, Number(settings.printifySettings?.charges?.designFee ?? 0));
    return Number((retailPrice + designFee).toFixed(2));
  };

  const templateToEditorProduct = (template: PrintifyCatalogTemplate): Product => {
    const images = template.images.map(normalizeTemplateImage).filter(Boolean);

    return {
      id: `printify_template_${template.id}`,
      categoryId: 'cat_printify',
      name: template.title,
      slug: `custom-template-${template.blueprintId}`,
      description: template.description || `${template.brand || 'Printify'} customizable blank template.`,
      price: calculateTemplateRetailPrice(template.baseCost ?? template.retailPrice ?? 24.99),
      images: images.length > 0 ? images : ['/custom-tee-mockup.png'],
      stock: 999,
      isFeatured: false,
      colors: ['#FFFFFF', '#111827'],
      sizes: ['S', 'M', 'L', 'XL'],
      variants: [],
      createdAt: Date.now(),
      isPrintify: true,
      printifyCatalogId: String(template.blueprintId),
    };
  };

  // Filter raw Printify templates only. Admin-created Printify shop products remain storefront products.
  const customProducts = useMemo(() => {
    const syncedTemplateProducts = products.filter((product) => (
      product.isPrintify &&
      (product.id.startsWith('printify_template_') || product.printifyProductId?.startsWith('template_'))
    ));
    const syncedTemplateIds = new Set(syncedTemplateProducts.map((product) => product.printifyCatalogId).filter(Boolean));
    const catalogTemplateProducts = enabledTemplates
      .filter((template) => !syncedTemplateIds.has(String(template.blueprintId)))
      .map(templateToEditorProduct);

    return [...syncedTemplateProducts, ...catalogTemplateProducts];
  }, [products, enabledTemplates, settings.printifySettings?.charges]);

  const filteredProducts = useMemo(() => {
    const query = templateSearch.trim().toLowerCase();
    if (!query) return customProducts;

    return customProducts.filter((product) => (
      product.name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query) ||
      product.printifyCatalogId?.toLowerCase().includes(query)
    ));
  }, [customProducts, templateSearch]);

  // Active product state
  const [activeProduct, setActiveProduct] = useState(() => {
    return customProducts.find((p) => p.slug === productSlug) || 
           customProducts[0];
  });

  const displayedProducts = useMemo(() => {
    if (!activeProduct || filteredProducts.some((product) => product.id === activeProduct.id)) {
      return filteredProducts;
    }

    return [activeProduct, ...filteredProducts];
  }, [activeProduct, filteredProducts]);

  const printifyEnabled = settings.printifySettings?.enabled;
  const aiPreviewEnabled = settings.printifySettings?.preview?.aiEnabled;
  const activeBasePrice = activeProduct?.price ?? 0;
  const activeCustomerPrice = activeProduct ? calculateCustomizedPrice(activeBasePrice) : 0;
  const activeDesignFee = Math.max(0, Number(settings.printifySettings?.charges?.designFee ?? 0));
  const activeMarginPercent = Math.max(0, Number(settings.printifySettings?.charges?.profitMarginPercent ?? 0));

  useEffect(() => {
    const nextActiveProduct = customProducts.find((p) => p.slug === productSlug) || customProducts[0];
    if (!activeProduct || !customProducts.some((p) => p.id === activeProduct.id)) {
      setActiveProduct(nextActiveProduct);
    }
  }, [activeProduct, customProducts, productSlug]);

  // Option configurations
  const [selectedColor, setSelectedColor] = useState('#FFFFFF');
  const [selectedSize, setSelectedSize] = useState('M');
  const [activeTab, setActiveTab] = useState<'product' | 'upload' | 'text' | 'ai'>('product');

  // Customizer canvas states
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [textFont, setTextFont] = useState('Inter');
  const [textColor, setTextColor] = useState('#000000');
  const [isUploading, setIsUploading] = useState(false);

  // Selected object properties for sliders
  const [selectedAngle, setSelectedAngle] = useState(0);
  const [selectedScale, setSelectedScale] = useState(1);
  const [hasSelection, setHasSelection] = useState(false);

  // Text formatting states
  const [textIsBold, setTextIsBold] = useState(false);
  const [textIsItalic, setTextIsItalic] = useState(false);
  const [textIsUnderline, setTextIsUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');

  // AI mockups placeholder state
  const [aiMockups, setAiMockups] = useState<string[]>([]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const compiledCanvasRef = useRef<HTMLCanvasElement>(null);

  // Available fonts
  const fontOptions = [
    { name: 'Modern Sans (Inter)', value: 'Inter' },
    { name: 'Elegant Serif (Playfair)', value: 'Playfair Display' },
    { name: 'Playful Cursive (Pacifico)', value: 'Pacifico' },
    { name: 'Bold Geometric (Montserrat)', value: 'Montserrat' },
    { name: 'Impact Condensed (Oswald)', value: 'Oswald' },
  ];

  // Colors display helper
  const colorMap: Record<string, string> = {
    '#FFFFFF': 'White',
    '#111827': 'Charcoal / Black',
    '#EF4444': 'Ruby Red',
    '#3B82F6': 'Royal Blue',
    '#10B981': 'Emerald Green',
  };

  // Sync colors & sizes when active product shifts
  useEffect(() => {
    if (activeProduct) {
      if (activeProduct.colors && activeProduct.colors.length > 0) {
        setSelectedColor(activeProduct.colors[0]);
      }
      if (activeProduct.sizes && activeProduct.sizes.length > 0) {
        setSelectedSize(activeProduct.sizes[0]);
      }
    }
  }, [activeProduct]);

  // Initialize Fabric.js Canvas
  useEffect(() => {
    if (!canvasElRef.current || !printAreaRef.current) return;

    // Reset local canvas states
    setCustomImage(null);
    setCustomText('');
    setHasSelection(false);

    // Get parent bounds
    const rect = printAreaRef.current.getBoundingClientRect();
    const width = rect.width || printAreaRef.current.clientWidth || 175;
    const height = rect.height || printAreaRef.current.clientHeight || 225;

    const canvas = new fabric.Canvas(canvasElRef.current, {
      width,
      height,
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;

    // Selection syncing events
    const syncSelection = () => {
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        setHasSelection(true);
        setSelectedAngle(Math.round(activeObj.angle || 0));
        setSelectedScale(activeObj.scaleX || 1);

        if (activeObj.type === 'i-text') {
          const textObj = activeObj as fabric.IText;
          setCustomText(textObj.text || '');
          setTextFont(textObj.fontFamily || 'Inter');
          setTextColor(textObj.fill as string || '#000000');
          setTextIsBold(textObj.fontWeight === 'bold');
          setTextIsItalic(textObj.fontStyle === 'italic');
          setTextIsUnderline(!!textObj.underline);
          setTextAlign((textObj.textAlign as 'left' | 'center' | 'right') || 'left');
        }
      } else {
        setHasSelection(false);
      }
    };

    canvas.on('selection:created', syncSelection);
    canvas.on('selection:updated', syncSelection);
    canvas.on('selection:cleared', () => setHasSelection(false));
    canvas.on('object:moving', syncSelection);
    canvas.on('object:scaling', syncSelection);
    canvas.on('object:rotating', syncSelection);
    canvas.on('object:modified', syncSelection);

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [activeProduct]);

  if (!activeProduct || !printifyEnabled) {
    return (
      <div className="p-8 text-center bg-gray-50 border border-dashed rounded-3xl">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Printify Integration or Customizer Eligible Products are not active.
        </p>
      </div>
    );
  }

  // Optimize and Upload image onto Fabric.js Canvas
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const optimized = await optimizeImage(file, 800, 800);
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        fabric.Image.fromURL(optimized, (img) => {
          // Resize to fit print area reasonably
          const scaleFactor = (canvas.width * 0.7) / (img.width || 1);
          img.set({
            left: canvas.width / 2,
            top: canvas.height / 2,
            originX: 'center',
            originY: 'center',
            scaleX: scaleFactor,
            scaleY: scaleFactor,
            cornerColor: '#000000',
            cornerStrokeColor: '#ffffff',
            borderColor: '#000000',
            cornerSize: 8,
            transparentCorners: false,
            padding: 5,
          });

          // Remove any existing graphic layers to keep it focused
          const oldImages = canvas.getObjects('image');
          oldImages.forEach((obj) => canvas.remove(obj));

          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();

          setCustomImage(optimized);
          setActiveTab('upload');
        });
      }
    } catch (err) {
      console.error('Failed to upload custom graphic:', err);
      alert('Failed to process custom design. Please try another image.');
    } finally {
      setIsUploading(false);
    }
  };

  // Add/Modify Custom Text Layer on Fabric Canvas
  const handleTextChange = (val: string) => {
    setCustomText(val);
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      let activeText = canvas.getObjects('i-text')[0] as fabric.IText;
      if (val.trim()) {
        if (!activeText) {
          activeText = new fabric.IText(val, {
            left: canvas.width / 2,
            top: canvas.height * 0.3,
            originX: 'center',
            originY: 'center',
            fontSize: 24,
            fontFamily: textFont,
            fill: textColor,
            fontWeight: 'bold',
            cornerColor: '#000000',
            cornerStrokeColor: '#ffffff',
            borderColor: '#000000',
            cornerSize: 8,
            transparentCorners: false,
            padding: 5,
          });
          canvas.add(activeText);
        } else {
          activeText.set('text', val);
        }
        canvas.setActiveObject(activeText);
        canvas.renderAll();
      } else if (activeText) {
        canvas.remove(activeText);
        canvas.renderAll();
      }
    }
  };

  // Handle Font styles change
  const handleFontChange = (font: string) => {
    setTextFont(font);
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeText = canvas.getObjects('i-text')[0] as fabric.IText;
      if (activeText) {
        activeText.set('fontFamily', font);
        canvas.renderAll();
      }
    }
  };

  // Handle Text color change
  const handleColorChange = (color: string) => {
    setTextColor(color);
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeText = canvas.getObjects('i-text')[0] as fabric.IText;
      if (activeText) {
        activeText.set('fill', color);
        canvas.renderAll();
      }
    }
  };

  // Canvas manual controls modification
  const handleScaleSlider = (val: number) => {
    setSelectedScale(val);
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        activeObj.set({
          scaleX: val,
          scaleY: val,
        });
        canvas.renderAll();
      }
    }
  };

  const handleRotateSlider = (val: number) => {
    setSelectedAngle(val);
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        activeObj.set('angle', val);
        canvas.renderAll();
      }
    }
  };

  // Delete selected layer element
  const handleDeleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        canvas.remove(activeObj);
        canvas.discardActiveObject();
        canvas.renderAll();
        
        // Reset corresponding state
        if (activeObj.type === 'i-text') {
          setCustomText('');
        } else if (activeObj.type === 'image') {
          setCustomImage(null);
        }
      }
    }
  };

  // Bring active layer forward
  const handleBringForward = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        canvas.bringForward(activeObj);
        canvas.renderAll();
      }
    }
  };

  // Send active layer backward
  const handleSendBackward = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        canvas.sendBackwards(activeObj);
        canvas.renderAll();
      }
    }
  };

  // Center layer horizontally in print area
  const handleCenterHorizontally = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        activeObj.centerH();
        activeObj.setCoords();
        canvas.renderAll();
      }
    }
  };

  // Center layer vertically in print area
  const handleCenterVertically = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        activeObj.centerV();
        activeObj.setCoords();
        canvas.renderAll();
      }
    }
  };

  // Duplicate active layer
  const handleDuplicateSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        activeObj.clone((cloned: fabric.Object) => {
          canvas.discardActiveObject();
          cloned.set({
            left: (cloned.left || 0) + 15,
            top: (cloned.top || 0) + 15,
            evented: true,
          });
          canvas.add(cloned);
          canvas.setActiveObject(cloned);
          canvas.requestRenderAll();
          
          if (cloned.type === 'i-text') {
            const textObj = cloned as fabric.IText;
            setCustomText(textObj.text || '');
          }
        });
      }
    }
  };

  // Toggle Bold style on selected text object
  const toggleBold = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj.type === 'i-text') {
        const textObj = activeObj as fabric.IText;
        const nextVal = textObj.fontWeight === 'bold' ? 'normal' : 'bold';
        textObj.set('fontWeight', nextVal);
        canvas.renderAll();
        setTextIsBold(nextVal === 'bold');
      }
    }
  };

  // Toggle Italic style on selected text object
  const toggleItalic = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj.type === 'i-text') {
        const textObj = activeObj as fabric.IText;
        const nextVal = textObj.fontStyle === 'italic' ? 'normal' : 'italic';
        textObj.set('fontStyle', nextVal);
        canvas.renderAll();
        setTextIsItalic(nextVal === 'italic');
      }
    }
  };

  // Toggle Underline style on selected text object
  const toggleUnderline = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj.type === 'i-text') {
        const textObj = activeObj as fabric.IText;
        const nextVal = !textObj.underline;
        textObj.set('underline', nextVal);
        canvas.renderAll();
        setTextIsUnderline(nextVal);
      }
    }
  };

  // Change text alignment on selected text object
  const handleTextAlignChange = (align: 'left' | 'center' | 'right') => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj.type === 'i-text') {
        const textObj = activeObj as fabric.IText;
        textObj.set('textAlign', align);
        canvas.renderAll();
        setTextAlign(align);
      }
    }
  };

  // Reset entire Canvas workspace
  const handleReset = () => {
    if (confirm('Are you sure you want to clear your current workspace?')) {
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        canvas.clear();
        setCustomImage(null);
        setCustomText('');
        setHasSelection(false);
      }
    }
  };

  // Compile final product preview including background t-shirt tint
  const generatePreviewDataUrl = (): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = compiledCanvasRef.current;
      const fCanvas = fabricCanvasRef.current;
      if (!canvas || !fCanvas) {
        resolve('');
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }

      canvas.width = 600;
      canvas.height = 600;

      // 1. Draw base T-shirt mockup background tint
      ctx.fillStyle = selectedColor;
      ctx.fillRect(0, 0, 600, 600);

      // Load base mockup
      const baseImg = new Image();
      baseImg.src = activeProduct.images[0] || '/custom-tee-mockup.png';
      baseImg.onload = () => {
        // Draw shirt mockup multiplying background color
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(baseImg, 0, 0, 600, 600);
        ctx.globalCompositeOperation = 'source-over';

        // Coordinates matching the relative boundary size (35% x 45%)
        const pw = 600 * 0.35;
        const ph = 600 * 0.45;
        const px = (600 - pw) / 2;
        const py = 600 * 0.28;

        // Discard active selection line before compilation
        const activeObj = fCanvas.getActiveObject();
        if (activeObj) {
          fCanvas.discardActiveObject();
          fCanvas.renderAll();
        }

        const fabricDataUrl = fCanvas.toDataURL({ format: 'png' });
        const fabricImg = new Image();
        fabricImg.src = fabricDataUrl;
        fabricImg.onload = () => {
          ctx.drawImage(fabricImg, px, py, pw, ph);

          // Restore selection state
          if (activeObj) {
            fCanvas.setActiveObject(activeObj);
            fCanvas.renderAll();
          }

          resolve(canvas.toDataURL('image/webp', 0.85));
        };
      };
      baseImg.onerror = () => resolve('');
    });
  };

  // Add compiled customization item to cart
  const handleAddToCart = async () => {
    const previewUrl = await generatePreviewDataUrl();
    const fCanvas = fabricCanvasRef.current;
    if (!fCanvas) return;

    const imgObj = fCanvas.getObjects('image')[0];
    const textObj = fCanvas.getObjects('i-text')[0] as fabric.IText;

    const customization = {
      customImageUrl: customImage || undefined,
      customText: customText || undefined,
      textColor: customText ? textColor : undefined,
      fontFamily: customText ? textFont : undefined,
      imagePosition: imgObj ? { x: imgObj.left || 0, y: imgObj.top || 0, scale: imgObj.scaleX || 1, rotate: imgObj.angle || 0 } : undefined,
      textPosition: textObj ? { x: textObj.left || 0, y: textObj.top || 0, scale: textObj.scaleX || 1, rotate: textObj.angle || 0 } : undefined,
      previewUrl: previewUrl || undefined,
    };

    addToCart({ ...activeProduct, price: activeCustomerPrice }, undefined, 1, {
      color: selectedColor,
      size: selectedSize,
      customization,
    });

    navigate('/cart');
  };

  // Generate AI preview mockups
  const handleGenerateAiMockup = () => {
    setIsGeneratingAi(true);
    setAiMockups([]);
    setTimeout(() => {
      setAiMockups([activeProduct.images[0]]);
      setIsGeneratingAi(false);
    }, 1500);
  };

  // Filter tabs: only include AI Preview if enabled in backend settings
  const tabsList = [
    { id: 'product', label: 'Product', icon: Layout },
    { id: 'upload', label: 'Graphics', icon: Upload },
    { id: 'text', label: 'Text', icon: Type },
  ];

  if (aiPreviewEnabled) {
    tabsList.push({ id: 'ai', label: 'AI Preview', icon: RefreshCw });
  }

  return (
    <div className="w-full">
      {/* Standalone Header */}
      {showHeader && (
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2">
            <Link to={`/product/${activeProduct.slug}`} className="flex items-center gap-2 text-xs font-black uppercase text-gray-400 hover:text-black">
              <ArrowLeft className="h-4 w-4" /> Back to Product
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-xs font-black uppercase tracking-widest text-black">Bespoke Customizer</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="rounded-xl text-[10px] font-black uppercase">
              Reset Workspace
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Canvas Preview area */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative w-full max-w-[500px] aspect-square rounded-[2.5rem] bg-gray-50 border border-gray-100 overflow-hidden shadow-sm flex items-center justify-center p-8">
            
            {/* Color Tinting layer */}
            <div 
              className="absolute inset-0 transition-colors duration-300"
              style={{ backgroundColor: selectedColor }}
            />

            {/* Mockup Overlay Multiplier */}
            <img 
              src={activeProduct.images[0] || '/custom-tee-mockup.png'} 
              alt="Shirt template" 
              className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none mix-blend-multiply transition-opacity duration-300"
            />

            {/* Print Area Bounds holding Fabric Canvas */}
            <div 
              ref={printAreaRef}
              className="absolute w-[35%] h-[45%] top-[28%] border-2 border-dashed border-gray-400/30 hover:border-gray-500/50 rounded-xl transition-all flex items-center justify-center overflow-hidden"
            >
              <canvas ref={canvasElRef} id="fabric-canvas" className="absolute inset-0 w-full h-full" />
            </div>
          </div>
          
          <p className="text-[10px] text-gray-400 mt-4 uppercase font-black tracking-widest flex items-center gap-1.5 opacity-70">
            <HelpCircle className="h-3.5 w-3.5" /> Customize design layers interactively directly on the t-shirt.
          </p>
        </div>

        {/* Right Column: Control Options */}
        <div className="lg:col-span-5 bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm flex flex-col w-full">
          {/* Tab buttons list */}
          <div className="grid border-b" style={{ gridTemplateColumns: `repeat(${tabsList.length}, minmax(0, 1fr))` }}>
            {tabsList.map((tab) => {
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
            {/* Tab: Shirt / Product Select */}
            {activeTab === 'product' && (
              <div className="space-y-6">
                {/* Product Selector Dropdown */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Search Blank Templates</Label>
                  <Input
                    value={templateSearch}
                    onChange={(event) => setTemplateSearch(event.target.value)}
                    placeholder="Search T-shirts, hoodies, mugs, posters..."
                    className="rounded-xl h-11 text-xs border-gray-200"
                  />
                  <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-2 max-h-52 overflow-y-auto space-y-1">
                    {filteredProducts.slice(0, 10).map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => setActiveProduct(product)}
                        className={`w-full flex items-center gap-3 rounded-xl p-2 text-left transition-colors ${
                          activeProduct.id === product.id ? 'bg-black text-white' : 'bg-white hover:bg-gray-100 text-black'
                        }`}
                      >
                        <img
                          src={product.images[0] || '/custom-tee-mockup.png'}
                          alt={product.name}
                          className="h-9 w-9 rounded-lg object-cover bg-gray-100 shrink-0"
                        />
                        <span className="min-w-0">
                          <span className="flex items-center justify-between gap-2">
                            <span className="block text-[10px] font-black uppercase tracking-tight truncate">{product.name}</span>
                            <span className="text-[10px] font-black shrink-0">
                              {settings.currencySymbol}{calculateCustomizedPrice(product.price).toFixed(2)}
                            </span>
                          </span>
                          <span className={`block text-[9px] truncate ${activeProduct.id === product.id ? 'text-white/60' : 'text-gray-400'}`}>
                            Template ID: {product.printifyCatalogId || product.id}
                          </span>
                        </span>
                      </button>
                    ))}
                    {filteredProducts.length > 10 && (
                      <p className="px-2 pt-1 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        Showing first 10 matches. Keep typing to narrow results.
                      </p>
                    )}
                    {filteredProducts.length === 0 && (
                      <p className="px-2 py-3 text-[10px] text-amber-600 font-bold uppercase tracking-wider">
                        No matching templates found. Try a broader search.
                      </p>
                    )}
                  </div>
                </div>

                {/* Product Selector Dropdown */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Select Template ({filteredProducts.length} matching / {customProducts.length} available)
                  </Label>
                  <select
                    value={activeProduct.id}
                    onChange={(e) => {
                      const selected = customProducts.find((p) => p.id === e.target.value);
                      if (selected) setActiveProduct(selected);
                    }}
                    className="w-full h-11 border rounded-xl px-3 text-xs bg-white focus:outline-none border-gray-200"
                  >
                    {displayedProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="rounded-2xl border bg-emerald-50/60 border-emerald-100 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Estimated Template Price</p>
                        <p className="text-[10px] text-emerald-700/70 mt-1">
                          Includes {activeMarginPercent}% template estimate margin{activeDesignFee > 0 ? ` + ${settings.currencySymbol}${activeDesignFee.toFixed(2)} design fee` : ''}.
                        </p>
                      </div>
                      <p className="text-lg font-black text-emerald-800">
                        {settings.currencySymbol}{activeCustomerPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Select Color ({colorMap[selectedColor] || 'Custom Color'})</Label>
                  <div className="flex flex-wrap gap-3">
                    {activeProduct.colors?.map((color) => (
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
                    {activeProduct.sizes?.map((size) => (
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

            {/* Tab: Upload Custom Graphics */}
            {activeTab === 'upload' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Upload Artwork Layer</Label>
                  
                  <div className="relative group border-2 border-dashed border-gray-200 hover:border-black rounded-2xl p-8 transition-colors flex flex-col items-center justify-center cursor-pointer">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <Upload className="h-8 w-8 text-gray-400 group-hover:text-black mb-3 transition-colors" />
                    <span className="text-xs font-black uppercase tracking-wider">{isUploading ? 'Optimizing Image...' : 'Select File'}</span>
                    <span className="text-[9px] text-gray-400 mt-1 uppercase font-bold tracking-wider opacity-60">Supports JPG, PNG (WebP Auto-compressed)</span>
                  </div>
                </div>

                {hasSelection && (
                  <div className="space-y-4 pt-4 border-t animate-in fade-in duration-200">
                    <div className="flex items-center justify-between pl-1">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Selected Layer Controls</h4>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
                        <span>Layer Scale (Size)</span>
                        <span>{Math.round(selectedScale * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="2.5"
                        step="0.05"
                        value={selectedScale}
                        onChange={(e) => handleScaleSlider(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
                        <span>Layer Rotation</span>
                        <span>{selectedAngle}°</span>
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="1"
                        value={selectedAngle}
                        onChange={(e) => handleRotateSlider(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                      />
                    </div>

                    {/* Layer arrangement, center alignment, duplication and deletion */}
                    <div className="space-y-3 pt-2 border-t">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <span className="text-[8px] font-black uppercase text-gray-400">Layer Order</span>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={handleBringForward} className="flex-1 h-8 text-[9px] uppercase font-bold gap-1 rounded-xl">
                              <ChevronUp className="h-3.5 w-3.5" /> Forward
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleSendBackward} className="flex-1 h-8 text-[9px] uppercase font-bold gap-1 rounded-xl">
                              <ChevronDown className="h-3.5 w-3.5" /> Backward
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <span className="text-[8px] font-black uppercase text-gray-400">Position Align</span>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={handleCenterHorizontally} className="flex-1 h-8 text-[9px] uppercase font-bold rounded-xl" title="Center Horizontally">
                              Center H
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleCenterVertically} className="flex-1 h-8 text-[9px] uppercase font-bold rounded-xl" title="Center Vertically">
                              Center V
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" onClick={handleDuplicateSelected} className="h-8 text-[9px] uppercase font-bold gap-1.5 rounded-xl">
                          <Copy className="h-3.5 w-3.5" /> Duplicate
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDeleteSelected} className="h-8 text-[9px] uppercase font-bold gap-1.5 rounded-xl border-red-200 hover:bg-red-50 text-red-500">
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Text overlay options */}
            {activeTab === 'text' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Add Text Layer</Label>
                  <Input
                    placeholder="Type customized word..."
                    value={customText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    className="rounded-xl h-11 border-gray-200 text-sm font-medium"
                  />
                </div>

                {customText.trim() && (
                  <div className="space-y-5 pt-4 border-t animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Select Font</Label>
                        <select
                          value={textFont}
                          onChange={(e) => handleFontChange(e.target.value)}
                          className="w-full h-10 border rounded-xl px-3 text-xs bg-white focus:outline-none border-gray-200"
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
                            onChange={(e) => handleColorChange(e.target.value)}
                            className="w-10 h-10 p-0 rounded-xl border-none cursor-pointer bg-transparent"
                          />
                          <span className="text-xs font-mono font-bold uppercase">{textColor}</span>
                        </div>
                      </div>
                    </div>

                    {hasSelection && (
                      <div className="space-y-4 pt-2 border-t">
                        <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
                          <span>Text Scale (Size)</span>
                          <span>{Math.round(selectedScale * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="3"
                          step="0.1"
                          value={selectedScale}
                          onChange={(e) => handleScaleSlider(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                        />

                        <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
                          <span>Text Rotation</span>
                          <span>{selectedAngle}°</span>
                        </div>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          step="1"
                          value={selectedAngle}
                          onChange={(e) => handleRotateSlider(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                        />

                        {/* Text Styling Formatting Bar */}
                        <div className="space-y-1.5 pt-2 border-t">
                          <span className="text-[8px] font-black uppercase text-gray-400">Text Styling & Align</span>
                          <div className="flex gap-1 items-center">
                            <Button 
                              variant={textIsBold ? 'default' : 'outline'} 
                              size="sm" 
                              onClick={toggleBold} 
                              className={`h-9 w-9 p-0 rounded-xl ${textIsBold ? 'bg-black text-white hover:bg-neutral-800' : ''}`}
                              title="Bold"
                            >
                              <Bold className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant={textIsItalic ? 'default' : 'outline'} 
                              size="sm" 
                              onClick={toggleItalic} 
                              className={`h-9 w-9 p-0 rounded-xl ${textIsItalic ? 'bg-black text-white hover:bg-neutral-800' : ''}`}
                              title="Italic"
                            >
                              <Italic className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant={textIsUnderline ? 'default' : 'outline'} 
                              size="sm" 
                              onClick={toggleUnderline} 
                              className={`h-9 w-9 p-0 rounded-xl ${textIsUnderline ? 'bg-black text-white hover:bg-neutral-800' : ''}`}
                              title="Underline"
                            >
                              <Underline className="h-4 w-4" />
                            </Button>
                            
                            <div className="w-px h-6 bg-gray-200 mx-2" />
                            
                            <Button 
                              variant={textAlign === 'left' ? 'default' : 'outline'} 
                              size="sm" 
                              onClick={() => handleTextAlignChange('left')} 
                              className={`h-9 w-9 p-0 rounded-xl ${textAlign === 'left' ? 'bg-black text-white hover:bg-neutral-800' : ''}`}
                              title="Align Left"
                            >
                              <AlignLeft className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant={textAlign === 'center' ? 'default' : 'outline'} 
                              size="sm" 
                              onClick={() => handleTextAlignChange('center')} 
                              className={`h-9 w-9 p-0 rounded-xl ${textAlign === 'center' ? 'bg-black text-white hover:bg-neutral-800' : ''}`}
                              title="Align Center"
                            >
                              <AlignCenter className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant={textAlign === 'right' ? 'default' : 'outline'} 
                              size="sm" 
                              onClick={() => handleTextAlignChange('right')} 
                              className={`h-9 w-9 p-0 rounded-xl ${textAlign === 'right' ? 'bg-black text-white hover:bg-neutral-800' : ''}`}
                              title="Align Right"
                            >
                              <AlignRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Layer order, alignment, duplicate and delete */}
                        <div className="space-y-3 pt-2 border-t">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <span className="text-[8px] font-black uppercase text-gray-400">Layer Order</span>
                              <div className="flex gap-1">
                                <Button variant="outline" size="sm" onClick={handleBringForward} className="flex-1 h-8 text-[9px] uppercase font-bold gap-1 rounded-xl">
                                  <ChevronUp className="h-3.5 w-3.5" /> Forward
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleSendBackward} className="flex-1 h-8 text-[9px] uppercase font-bold gap-1 rounded-xl">
                                  <ChevronDown className="h-3.5 w-3.5" /> Backward
                                </Button>
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <span className="text-[8px] font-black uppercase text-gray-400">Position Align</span>
                              <div className="flex gap-1">
                                <Button variant="outline" size="sm" onClick={handleCenterHorizontally} className="flex-1 h-8 text-[9px] uppercase font-bold rounded-xl" title="Center Horizontally">
                                  Center H
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleCenterVertically} className="flex-1 h-8 text-[9px] uppercase font-bold rounded-xl" title="Center Vertically">
                                  Center V
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" onClick={handleDuplicateSelected} className="h-8 text-[9px] uppercase font-bold gap-1.5 rounded-xl">
                              <Copy className="h-3.5 w-3.5" /> Duplicate
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleDeleteSelected} className="h-8 text-[9px] uppercase font-bold gap-1.5 rounded-xl border-red-200 hover:bg-red-50 text-red-500">
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab: AI Live Previews */}
            {activeTab === 'ai' && aiPreviewEnabled && (
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
