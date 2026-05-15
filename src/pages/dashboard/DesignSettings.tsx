import React, { useState } from 'react';
import { useShop } from '@/context/ShopContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Palette, Type, Smartphone, Globe, Monitor, Tablet, Layers, Plus, Trash2, ArrowUp, ArrowDown, Settings2, Layout, Image as ImageIcon, Code, ShoppingBag, Sparkles, Check, Upload, Loader2, X, ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StoreSection, SectionType } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { TEMPLATES } from '@/lib/templates';
import { optimizeImage } from '@/lib/imageUtils';

export const DesignSettings: React.FC = () => {
  const { settings, updateSettings, applyTemplate } = useShop();
  const [editingSection, setEditingSection] = useState<StoreSection | null>(null);
  const [isOptimizingLogo, setIsOptimizingLogo] = useState(false);
  const [isOptimizingSection, setIsOptimizingSection] = useState(false);

  const handleUpdate = (path: string, value: any) => {
    updateSettings({ [path]: value });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOptimizingLogo(true);
    try {
      const optimized = await optimizeImage(file, 800, 800);
      handleUpdate('logoUrl', optimized);
    } catch (error) {
      console.error('Logo optimization failed:', error);
    } finally {
      setIsOptimizingLogo(false);
    }
  };

  const handleDeviceUpdate = (device: 'desktop' | 'tablet' | 'mobile', config: any) => {
    handleUpdate(device, config);
  };

  const addSection = (type: SectionType) => {
    const newSection: StoreSection = {
      id: `s-${Date.now()}`,
      type,
      title: `New ${type.replace('_', ' ')} Section`,
      enabled: true,
      order: settings.sections.length,
      config: type === 'HERO' ? { height: 'medium', textAlign: 'center', buttonText: 'View More' } : {}
    };
    handleUpdate('sections', [...settings.sections, newSection]);
  };

  const handleSectionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingSection) return;

    setIsOptimizingSection(true);
    try {
      const optimized = await optimizeImage(file, 1600, 1600); // Higher res for banners
      setEditingSection({
        ...editingSection,
        config: { ...(editingSection.config || {}), imageUrl: optimized }
      });
    } catch (error) {
      console.error('Section image optimization failed:', error);
    } finally {
      setIsOptimizingSection(false);
    }
  };

  const removeSection = (id: string) => {
    handleUpdate('sections', settings.sections.filter(s => s.id !== id));
  };

  const reorderSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...settings.sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    
    // Update order property
    const updated = newSections.map((s, i) => ({ ...s, order: i }));
    handleUpdate('sections', updated);
  };

  const updateSectionDetails = (id: string, updates: Partial<StoreSection>) => {
    const updated = settings.sections.map(s => 
      s.id === id ? { ...s, ...updates } : s
    );
    handleUpdate('sections', updated);
    setEditingSection(null);
  };

  const sectionTypes: { type: SectionType; label: string; icon: any }[] = [
    { type: 'HERO', label: 'Hero Banner', icon: ImageIcon },
    { type: 'FEATURED_PRODUCTS', label: 'Products Grid', icon: Layout },
    { type: 'CATEGORIES', label: 'Collections', icon: Layers },
    { type: 'ABOUT', label: 'About Us', icon: Globe },
    { type: 'NEWSLETTER', label: 'Newsletter', icon: Globe },
    { type: 'BANNER', label: 'Call to Action', icon: Smartphone },
    { type: 'HTML_CONTENT', label: 'Custom HTML', icon: Code },
  ];

  return (
    <div className="space-y-6 md:space-y-8 pb-20">
      <div className="px-4 md:px-0 pb-4 md:pb-0 border-b md:border-none border-gray-100">
        <h1 className="text-xl md:text-3xl font-black uppercase tracking-tight">Design & Style</h1>
        <p className="text-[8px] md:text-xs text-gray-500 uppercase font-bold opacity-60">Transform your store's appearance across all devices.</p>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <div className="bg-gray-100/50 backdrop-blur rounded-[2rem] p-1.5 mb-8 md:mb-10 mx-2 md:mx-0">
          <TabsList className="flex w-full bg-transparent p-0 rounded-2xl h-auto gap-0.5 md:gap-1">
            <TabsTrigger value="templates" className="flex-1 flex flex-col md:flex-row items-center justify-center rounded-xl font-black px-0.5 py-2.5 md:py-0 text-[7px] md:text-xs uppercase tracking-tighter md:tracking-widest min-h-[56px] md:min-h-14">
              <Sparkles className="h-4 w-4 md:h-3.5 md:w-3.5 mb-1 md:mb-0 md:mr-2" />
              <span>Themes</span>
            </TabsTrigger>
            <TabsTrigger value="sections" className="flex-1 flex flex-col md:flex-row items-center justify-center rounded-xl font-black px-0.5 py-2.5 md:py-0 text-[7px] md:text-xs uppercase tracking-tighter md:tracking-widest min-h-[56px] md:min-h-14">
              <Layers className="h-4 w-4 md:h-3.5 md:w-3.5 mb-1 md:mb-0 md:mr-2" />
              <span>Sections</span>
            </TabsTrigger>
            <TabsTrigger value="navbar" className="flex-1 flex flex-col md:flex-row items-center justify-center rounded-xl font-black px-0.5 py-2.5 md:py-0 text-[7px] md:text-xs uppercase tracking-tighter md:tracking-widest min-h-[56px] md:min-h-14">
              <Settings2 className="h-4 w-4 md:h-3.5 md:w-3.5 mb-1 md:mb-0 md:mr-2" />
              <span>Navbar</span>
            </TabsTrigger>
            <TabsTrigger value="layouts" className="flex-1 flex flex-col md:flex-row items-center justify-center rounded-xl font-black px-0.5 py-2.5 md:py-0 text-[7px] md:text-xs uppercase tracking-tighter md:tracking-widest min-h-[56px] md:min-h-14">
              <Layout className="h-4 w-4 md:h-3.5 md:w-3.5 mb-1 md:mb-0 md:mr-2" />
              <span>Layouts</span>
            </TabsTrigger>
            <TabsTrigger value="checkout" className="flex-1 flex flex-col md:flex-row items-center justify-center rounded-xl font-black px-0.5 py-2.5 md:py-0 text-[7px] md:text-xs uppercase tracking-tighter md:tracking-widest min-h-[56px] md:min-h-14">
              <ShoppingBag className="h-4 w-4 md:h-3.5 md:w-3.5 mb-1 md:mb-0 md:mr-2" />
              <span>Checkout</span>
            </TabsTrigger>
            <TabsTrigger value="theme" className="flex-1 flex flex-col md:flex-row items-center justify-center rounded-xl font-black px-0.5 py-2.5 md:py-0 text-[7px] md:text-xs uppercase tracking-tighter md:tracking-widest min-h-[56px] md:min-h-14">
              <Palette className="h-4 w-4 md:h-3.5 md:w-3.5 mb-1 md:mb-0 md:mr-2" />
              <span>Branding</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="templates">
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 px-2 md:px-0 pb-10">
              {TEMPLATES.map((template) => (
                <Card 
                  key={template.id} 
                  className={`border-[3px] md:border-4 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden transition-all group cursor-pointer ${settings.activeTemplate === template.id ? 'border-primary ring-4 md:ring-8 ring-primary/5' : 'border-transparent hover:border-gray-200'}`}
                  onClick={() => applyTemplate(template.id)}
                >
                  <div className="aspect-[4/3] relative overflow-hidden bg-gray-100">
                    <img src={template.previewUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={template.name} />
                    {settings.activeTemplate === template.id && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="bg-white text-black p-2 md:p-4 rounded-full shadow-2xl scale-110">
                          <Check className="h-5 w-5 md:h-8 md:w-8 stroke-[3]" />
                        </div>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 md:top-4 md:left-4">
                       <Badge className="bg-white/90 backdrop-blur text-black border-none px-2.5 md:px-4 py-1 md:py-1.5 rounded-full font-black text-[8px] md:text-[10px] tracking-widest uppercase shadow-md">
                         {template.id === 'devsfolk' ? 'Featured' : 'Template'}
                       </Badge>
                    </div>
                  </div>
                  <CardHeader className="bg-white p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base md:text-xl font-black uppercase tracking-tight">{template.name}</CardTitle>
                        <CardDescription className="line-clamp-2 mt-1 text-[8px] md:text-xs font-bold uppercase tracking-widest opacity-60 italic">{template.description}</CardDescription>
                      </div>
                    </div>
                    <Button 
                      className="w-full mt-3 md:mt-4 rounded-xl md:rounded-2xl h-9 md:h-12 font-black text-[9px] md:text-xs uppercase tracking-widest shadow-sm" 
                      variant={settings.activeTemplate === template.id ? 'secondary' : 'default'}
                      style={settings.activeTemplate === template.id ? {} : { backgroundColor: template.settings.primaryColor }}
                    >
                      {settings.activeTemplate === template.id ? 'Active' : 'Apply Theme'}
                    </Button>
                  </CardHeader>
                </Card>
              ))}
           </div>
        </TabsContent>

        <TabsContent value="checkout">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="p-5 md:p-6">
                <CardTitle className="text-xl font-black uppercase tracking-tight">Order Acceptance</CardTitle>
                <CardDescription className="text-xs">Decide how you want to receive orders from customers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 md:space-y-6 p-5 md:p-6 pt-0">
                <div className="grid gap-3 md:gap-4">
                  <div 
                    className={`p-4 md:p-6 rounded-2xl border-2 transition-all cursor-pointer ${settings.orderMode === 'WEBSITE' ? 'border-primary bg-primary text-white' : 'border-gray-100 hover:border-gray-200'}`}
                    onClick={() => handleUpdate('orderMode', 'WEBSITE')}
                  >
                    <div className="flex items-center gap-3 md:gap-4 mb-2">
                      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center ${settings.orderMode === 'WEBSITE' ? 'bg-white text-black' : 'bg-gray-100'}`}>
                        <Monitor className="h-4 w-4 md:h-5 md:w-5" />
                      </div>
                      <h4 className="font-bold text-sm md:text-base">Website Dashboard Only</h4>
                    </div>
                    <p className={`text-[10px] md:text-sm ${settings.orderMode === 'WEBSITE' ? 'opacity-80' : 'text-gray-500'}`}>
                      Orders are processed strictly on your website. Customers fill a form and you manage them in your admin panel.
                    </p>
                  </div>

                  <div 
                    className={`p-4 md:p-6 rounded-2xl border-2 transition-all cursor-pointer ${settings.orderMode === 'WHATSAPP' ? 'border-[#25D366] bg-[#25D366] text-white' : 'border-gray-100 hover:border-gray-200'}`}
                    onClick={() => handleUpdate('orderMode', 'WHATSAPP')}
                  >
                    <div className="flex items-center gap-3 md:gap-4 mb-2">
                      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center ${settings.orderMode === 'WHATSAPP' ? 'bg-white text-[#25D366]' : 'bg-gray-100'}`}>
                        <Globe className="h-4 w-4 md:h-5 md:w-5" />
                      </div>
                      <h4 className="font-bold text-sm md:text-base">WhatsApp Business Only</h4>
                    </div>
                    <p className={`text-[10px] md:text-sm ${settings.orderMode === 'WHATSAPP' ? 'opacity-80' : 'text-gray-500'}`}>
                      The checkout button redirects customers directly to your WhatsApp with their order details pre-filled.
                    </p>
                  </div>

                  <div 
                    className={`p-4 md:p-6 rounded-2xl border-2 transition-all cursor-pointer ${settings.orderMode === 'BOTH' ? 'border-black bg-black text-white' : 'border-gray-100 hover:border-gray-200'}`}
                    onClick={() => handleUpdate('orderMode', 'BOTH')}
                  >
                    <div className="flex items-center gap-3 md:gap-4 mb-2">
                      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center ${settings.orderMode === 'BOTH' ? 'bg-white text-black' : 'bg-gray-100'}`}>
                        <Plus className="h-4 w-4 md:h-5 md:w-5" />
                      </div>
                      <h4 className="font-bold text-sm md:text-base">Both (Customer Choice)</h4>
                    </div>
                    <p className={`text-[10px] md:text-sm ${settings.orderMode === 'BOTH' ? 'opacity-80' : 'text-gray-500'}`}>
                      Customers see both "Order on Website" and "Order on WhatsApp" buttons at checkout.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="p-5 md:p-6">
                <CardTitle className="text-xl font-black uppercase tracking-tight">WhatsApp Settings</CardTitle>
                <CardDescription className="text-xs">Configure your business contact details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-5 md:p-6 pt-0">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-gray-400">WhatsApp Number</Label>
                  <Input 
                    value={settings.whatsappNumber} 
                    onChange={(e) => handleUpdate('whatsappNumber', e.target.value)}
                    placeholder="+1234567890"
                    className="h-11 md:h-12 rounded-xl text-sm"
                  />
                  <p className="text-[10px] text-gray-400">Include country code without special characters (e.g., 15551234567).</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sections">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 md:p-6 rounded-3xl shadow-sm gap-4">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wider">Active Sections</h3>
                  <p className="text-sm text-gray-400">Reorder or edit details of your home page content.</p>
                </div>
                <div className="w-full sm:w-auto">
                  <Dialog>
                    <DialogTrigger 
                      render={
                        <Button className="rounded-full shadow-lg" style={{ backgroundColor: settings.primaryColor }}>
                          <Plus className="h-4 w-4 mr-2" /> Add Section
                        </Button>
                      }
                    />
                    <DialogContent className="max-w-md rounded-[2.5rem]">
                      <DialogHeader>
                        <DialogTitle>Add New Content Section</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-4 py-4">
                        {sectionTypes.map((st) => (
                          <Button 
                            key={st.type}
                            variant="outline" 
                            className="h-24 flex flex-col gap-2 rounded-2xl border-2 border-gray-100 hover:border-black"
                            onClick={() => addSection(st.type)}
                          >
                            <st.icon className="h-6 w-6" />
                            <span className="text-xs font-bold uppercase">{st.label}</span>
                          </Button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="space-y-3 md:space-y-4">
                {settings.sections.sort((a, b) => a.order - b.order).map((section, idx) => (
                  <Card key={section.id} className="border-none shadow-sm rounded-3xl overflow-hidden hover:ring-2 ring-black/5 transition-all">
                    <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="flex flex-col gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 rounded-full hover:bg-gray-100" 
                            onClick={() => reorderSection(idx, 'up')}
                            disabled={idx === 0}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 rounded-full hover:bg-gray-100" 
                            onClick={() => reorderSection(idx, 'down')}
                            disabled={idx === settings.sections.length - 1}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                          {(() => {
                            const Icon = sectionTypes.find(st => st.type === section.type)?.icon;
                            return Icon ? <Icon className="h-6 w-6 text-gray-500" /> : null;
                          })()}
                        </div>
                        <div className="truncate flex-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{section.type}</p>
                          <h4 className="font-bold text-sm md:text-lg truncate">{section.title}</h4>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-none border-gray-50">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Active</span>
                          <Switch 
                            checked={section.enabled} 
                            onCheckedChange={(checked) => updateSectionDetails(section.id, { enabled: checked })}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger 
                              render={
                                <Button variant="ghost" size="icon" className="rounded-xl bg-gray-50 h-9 w-9" onClick={() => setEditingSection(section)}>
                                  <Settings2 className="h-4 w-4" />
                                </Button>
                              }
                            />
                          <DialogContent className="max-w-2xl rounded-[2.5rem] p-6 md:p-10">
                            <DialogHeader>
                              <DialogTitle className="text-2xl md:text-3xl font-black">{section.type} Customization</DialogTitle>
                            </DialogHeader>
                            {editingSection && (
                              <div className="space-y-4 md:space-y-6 pt-4 md:pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                  <div className="space-y-2">
                                    <Label>Section Title</Label>
                                    <Input 
                                      value={editingSection.title} 
                                      onChange={(e) => setEditingSection({...editingSection, title: e.target.value})}
                                      className="h-11 md:h-12 rounded-xl"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Subtitle / Description</Label>
                                    <Input 
                                      value={editingSection.subtitle || ''} 
                                      onChange={(e) => setEditingSection({...editingSection, subtitle: e.target.value})}
                                      className="h-11 md:h-12 rounded-xl"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                  <div className="space-y-2">
                                    <Label>Text Alignment</Label>
                                    <Select 
                                      value={editingSection.config?.textAlign || 'left'} 
                                      onValueChange={(v) => setEditingSection({...editingSection, config: {...(editingSection.config || {}), textAlign: v as any}})}
                                    >
                                      <SelectTrigger className="h-11 md:h-12 rounded-xl">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="left">Left</SelectItem>
                                        <SelectItem value="center">Center</SelectItem>
                                        <SelectItem value="right">Right</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Section Height</Label>
                                    <Select 
                                      value={editingSection.config?.height || 'medium'} 
                                      onValueChange={(v) => setEditingSection({...editingSection, config: {...(editingSection.config || {}), height: v as any}})}
                                    >
                                      <SelectTrigger className="h-11 md:h-12 rounded-xl">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="small">Small</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="large">Large</SelectItem>
                                        <SelectItem value="viewport">Full Window</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <div className="flex justify-between items-center">
                                    <Label className="text-[10px] font-black uppercase text-gray-400">Gallery / Images</Label>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-gray-400">Add multiple images for sliders</span>
                                      <label className="flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors">
                                        {isOptimizingSection ? (
                                          <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                        ) : (
                                          <Plus className="h-3 w-3 text-gray-600" />
                                        )}
                                        <input 
                                          type="file" 
                                          className="hidden" 
                                          multiple 
                                          accept="image/*" 
                                          onChange={async (e) => {
                                            const files = e.target.files;
                                            if (!files || !editingSection) return;
                                            setIsOptimizingSection(true);
                                            try {
                                              const newImages: string[] = [];
                                              for (let i = 0; i < files.length; i++) {
                                                const optimized = await optimizeImage(files[i], 1600, 1600);
                                                newImages.push(optimized);
                                              }
                                              const currentGallery = editingSection.config?.gallery || [];
                                              setEditingSection({
                                                ...editingSection,
                                                config: { 
                                                  ...(editingSection.config || {}), 
                                                  gallery: [...currentGallery, ...newImages],
                                                  // Set first image as imageUrl if empty
                                                  imageUrl: editingSection.config?.imageUrl || newImages[0]
                                                }
                                              });
                                            } catch (err) {
                                              console.error(err);
                                            } finally {
                                              setIsOptimizingSection(false);
                                            }
                                          }} 
                                        />
                                      </label>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                                    {(editingSection.config?.gallery || []).map((img, idx) => (
                                      <div key={idx} className="relative aspect-square group rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50">
                                        <img src={img} className="w-full h-full object-cover" />
                                        <button 
                                          onClick={() => {
                                            const newGallery = (editingSection.config?.gallery || []).filter((_, i) => i !== idx);
                                            setEditingSection({
                                              ...editingSection,
                                              config: { ...(editingSection.config || {}), gallery: newGallery }
                                            });
                                          }}
                                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <X className="h-2 w-2" />
                                        </button>
                                      </div>
                                    ))}
                                    {!(editingSection.config?.gallery?.length) && (
                                      <div className="col-span-full border-2 border-dashed border-gray-100 rounded-2xl py-8 flex flex-col items-center justify-center text-gray-300">
                                        <ImageIcon className="h-8 w-8 mb-2 opacity-20" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest">No images in gallery</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {editingSection.type === 'HTML_CONTENT' && (
                                  <div className="space-y-2">
                                    <Label>Custom HTML</Label>
                                    <Textarea 
                                      value={editingSection.config?.html || ''} 
                                      onChange={(e) => setEditingSection({...editingSection, config: {...(editingSection.config || {}), html: e.target.value}})}
                                      className="min-h-[200px] font-mono text-sm rounded-2xl"
                                    />
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                    <Label>Button Text</Label>
                                    <Input 
                                      value={editingSection.config?.buttonText || ''} 
                                      onChange={(e) => setEditingSection({...editingSection, config: {...(editingSection.config || {}), buttonText: e.target.value}})}
                                      className="h-12 rounded-xl"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Background Color</Label>
                                    <div className="flex gap-2">
                                      <Input 
                                        type="color"
                                        value={editingSection.config?.backgroundColor || '#ffffff'} 
                                        onChange={(e) => setEditingSection({...editingSection, config: {...(editingSection.config || {}), backgroundColor: e.target.value}})}
                                        className="w-12 h-12 p-1 rounded-xl"
                                      />
                                      <Input 
                                        value={editingSection.config?.backgroundColor || '#ffffff'} 
                                        onChange={(e) => setEditingSection({...editingSection, config: {...(editingSection.config || {}), backgroundColor: e.target.value}})}
                                        className="h-12 rounded-xl flex-1"
                                      />
                                    </div>
                                  </div>
                                </div>

                                <DialogFooter className="pt-6">
                                  <Button 
                                    onClick={() => updateSectionDetails(editingSection.id, editingSection)}
                                    className="h-14 px-10 rounded-full font-bold shadow-xl"
                                    style={{ backgroundColor: settings.primaryColor }}
                                  >
                                    Save Changes
                                  </Button>
                                </DialogFooter>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="icon" className="rounded-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => removeSection(section.id)}>
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

            <div className="space-y-6">
              <Card className="border-none shadow-sm rounded-3xl bg-black text-white p-6">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-xl">Store Strategy</CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-0 space-y-4 text-sm opacity-80 leading-relaxed">
                  <p>A good store homepage usually starts with a strong Hero banner, followed by Collections to orient the user, and then your Top Products.</p>
                  <p>You can now individually enable/disable sections for mobile by using the toggles.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="navbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="p-5 md:p-6">
                <CardTitle className="text-xl font-black uppercase tracking-tight">Branding & Assets</CardTitle>
                <CardDescription className="text-xs">Configure how your brand appears in the navigation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 md:space-y-6 p-5 md:p-6 pt-0">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-gray-400">Store Name</Label>
                  <Input 
                    value={settings.shopName} 
                    onChange={(e) => handleUpdate('shopName', e.target.value)}
                    className="h-11 md:h-12 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] font-black uppercase text-gray-400">Logo Upload</Label>
                    <span className="text-[10px] text-gray-400">Recommended: High-res PNG/SVG</span>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 relative">
                       <Input 
                        value={settings.logoUrl || ''} 
                        onChange={(e) => handleUpdate('logoUrl', e.target.value)}
                        placeholder="Paste URL or use upload button"
                        className="h-11 md:h-12 rounded-xl text-sm pr-10"
                      />
                      <label className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                        {isOptimizingLogo ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <Upload className="h-4 w-4 text-gray-400" />
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                      </label>
                    </div>
                    {settings.logoUrl && (
                      <div className="relative group">
                        <div className="w-11 h-11 md:w-12 md:h-12 border rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105">
                          <img src={settings.logoUrl} className="max-w-full max-h-full object-contain" />
                        </div>
                        <button 
                          onClick={() => handleUpdate('logoUrl', '')}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-2 w-2" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">Upload a high-quality image or paste a link. We'll optimize it automatically for best performance.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="p-5 md:p-6">
                <CardTitle className="text-xl font-black uppercase tracking-tight">Nav Behavior</CardTitle>
                <CardDescription className="text-xs">Global navigation settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 md:space-y-6 p-5 md:p-6 pt-0">
                 <div className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">Sticky Header</Label>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Keep at top while scrolling</p>
                    </div>
                    <Switch 
                      checked={settings.desktop.isHeaderSticky}
                      onCheckedChange={(checked) => {
                        handleDeviceUpdate('desktop', { ...settings.desktop, isHeaderSticky: checked });
                        handleDeviceUpdate('tablet', { ...settings.tablet, isHeaderSticky: checked });
                        handleDeviceUpdate('mobile', { ...settings.mobile, isHeaderSticky: checked });
                      }}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400">Navbar Theme (Global)</Label>
                    <Select 
                      value={settings.desktop.headerTheme} 
                      onValueChange={(v) => {
                        handleDeviceUpdate('desktop', { ...settings.desktop, headerTheme: v as any });
                        handleDeviceUpdate('tablet', { ...settings.tablet, headerTheme: v as any });
                        handleDeviceUpdate('mobile', { ...settings.mobile, headerTheme: v as any });
                      }}
                    >
                      <SelectTrigger className="h-11 md:h-12 rounded-xl border-2 text-sm font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Flat Light</SelectItem>
                        <SelectItem value="dark">Pro Dark</SelectItem>
                        <SelectItem value="glass">Modern Glass (Blurred)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="layouts">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {(['desktop', 'tablet', 'mobile'] as const).map((device) => (
              <Card key={device} className="border-none shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4 md:p-6">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    {device === 'desktop' ? <Monitor className="h-5 w-5" /> : 
                     device === 'tablet' ? <Tablet className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
                  </div>
                  <div>
                    <CardTitle className="capitalize text-lg font-black">{device}</CardTitle>
                    <CardDescription className="text-[10px] uppercase font-bold text-gray-400 tracking-tight">{device === 'mobile' ? 'Optimized View' : 'Standard View'}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6 pt-0">
                  <div className="space-y-3 md:space-y-4 text-sm font-medium">
                    <div className="grid gap-1">
                      <Label className="text-[8px] font-black uppercase text-gray-400 tracking-widest pl-1">Header Style</Label>
                      <Select 
                        value={(settings as any)[device].headerStyle} 
                        onValueChange={(v) => handleDeviceUpdate(device, { ...(settings as any)[device], headerStyle: v })}
                      >
                        <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="minimal">Minimal (Menu Only)</SelectItem>
                          <SelectItem value="centered">Centered Branding</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-1">
                      <Label className="text-[8px] font-black uppercase text-gray-400 tracking-widest pl-1">Hero Banner</Label>
                      <Select 
                        value={(settings as any)[device].heroStyle} 
                        onValueChange={(v) => handleDeviceUpdate(device, { ...(settings as any)[device], heroStyle: v })}
                      >
                        <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="banner">Full Banner</SelectItem>
                          <SelectItem value="minimal">Simple Layout</SelectItem>
                          <SelectItem value="hidden">Disabled on this device</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-1">
                      <Label className="text-[8px] font-black uppercase text-gray-400 tracking-widest pl-1">Products Per Row</Label>
                      <Select 
                        value={(settings as any)[device].productGridCols.toString()} 
                        onValueChange={(v) => handleDeviceUpdate(device, { ...(settings as any)[device], productGridCols: parseInt(v) })}
                      >
                        <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Column</SelectItem>
                          <SelectItem value="2">2 Columns</SelectItem>
                          <SelectItem value="3">3 Columns</SelectItem>
                          <SelectItem value="4">4 Columns</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-1">
                       <Label className="text-[8px] font-black uppercase text-gray-400 tracking-widest pl-1">Card Style</Label>
                       <Select 
                         value={(settings as any)[device].productCardStyle} 
                         onValueChange={(v) => handleDeviceUpdate(device, { ...(settings as any)[device], productCardStyle: v })}
                       >
                         <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="grid">Visual Grid</SelectItem>
                           <SelectItem value="list">Detailed List</SelectItem>
                           <SelectItem value="compact">Compact View</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="theme">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="p-5 md:p-6">
                <CardTitle className="text-xl font-black uppercase tracking-tight">Global Colors</CardTitle>
                <CardDescription className="text-xs">Set the colors used across your storefront.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-5 md:p-6 pt-0">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="color" 
                        value={settings.primaryColor} 
                        onChange={(e) => handleUpdate('primaryColor', e.target.value)}
                        className="w-11 h-11 md:w-12 md:h-12 p-1 rounded-xl shrink-0"
                      />
                      <Input 
                        type="text" 
                        value={settings.primaryColor} 
                        onChange={(e) => handleUpdate('primaryColor', e.target.value)}
                        className="h-11 md:h-12 rounded-xl flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="color" 
                        value={settings.secondaryColor} 
                        onChange={(e) => handleUpdate('secondaryColor', e.target.value)}
                        className="w-11 h-11 md:w-12 md:h-12 p-1 rounded-xl shrink-0"
                      />
                      <Input 
                        type="text" 
                        value={settings.secondaryColor} 
                        onChange={(e) => handleUpdate('secondaryColor', e.target.value)}
                        className="h-11 md:h-12 rounded-xl flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="p-5 md:p-6">
                <CardTitle className="text-xl font-black uppercase tracking-tight">Typography</CardTitle>
                <CardDescription className="text-xs">Choose fonts that match your brand's personality.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 md:space-y-6 p-5 md:p-6 pt-0">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">UI Font (Sans-serif)</Label>
                  <Select value={settings.fontSans} onValueChange={(v) => handleUpdate('fontSans', v)}>
                    <SelectTrigger className="h-11 md:h-12 rounded-xl font-bold text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter (Professional)</SelectItem>
                      <SelectItem value="Manrope">Manrope (Modern)</SelectItem>
                      <SelectItem value="Outfit">Outfit (Geometric)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">Display Font (Headings)</Label>
                  <Select value={settings.fontDisplay} onValueChange={(v) => handleUpdate('fontDisplay', v)}>
                    <SelectTrigger className="h-11 md:h-12 rounded-xl font-bold text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Outfit">Outfit (Clean)</SelectItem>
                      <SelectItem value="Playfair Display">Playfair Display (Elegant)</SelectItem>
                      <SelectItem value="Space Grotesk">Space Grotesk (Tech)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
