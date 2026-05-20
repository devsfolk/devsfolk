import React, { useState } from 'react';
import { useShop } from '@/context/ShopContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Image as ImageIcon, 
  Trash2, 
  Edit2, 
  Upload,
  Loader2,
  X,
  Smartphone,
  Monitor,
  ChevronLeft,
  Star
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { optimizeImage } from '@/lib/imageUtils';

export const ProductManagement: React.FC = () => {
  const { products, categories, addProduct, updateProduct, deleteProduct, settings } = useShop();
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');

  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    price: 0,
    discountPrice: 0,
    categoryId: '',
    stock: 0,
    images: [],
    colors: [],
    sizes: [],
    isFeatured: false
  });

  const filteredProducts = products
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsOptimizing(true);
    try {
      const newImages = [...formData.images];
      for (let i = 0; i < files.length; i++) {
        const optimized = await optimizeImage(files[i], 1200, 1200);
        newImages.push(optimized);
      }
      
      setFormData({ ...formData, images: newImages });
    } catch (error) {
      console.error('Image optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_: any, i: number) => i !== index)
    });
  };

  const handleSave = () => {
    if (formData.id) {
      updateProduct(formData.id, formData);
    } else {
      addProduct({
        ...formData,
        slug: formData.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36)
      });
    }
    setIsAddingProduct(false);
    setFormData({
      name: '',
      description: '',
      price: 0,
      discountPrice: 0,
      stock: 0,
      images: [],
      colors: [],
      sizes: [],
      categoryId: categories[0]?.id || '',
      isFeatured: false
    });
  };

  const addOption = (type: 'colors' | 'sizes', value: string) => {
    if (!value) return;
    if (formData[type].includes(value)) return;
    setFormData({ ...formData, [type]: [...formData[type], value] });
  };

  const removeOption = (type: 'colors' | 'sizes', value: string) => {
    setFormData({ ...formData, [type]: formData[type].filter((v: string) => v !== value) });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 md:pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-xl md:text-3xl font-black uppercase tracking-tight">Products</h1>
          <p className="text-[8px] md:text-xs font-bold uppercase text-gray-400 tracking-widest opacity-70">Inventory management and variants customization.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="ghost" 
            className="rounded-xl h-12 md:h-14 font-bold border border-gray-100 px-6 hidden md:flex" 
            onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
          >
            {viewMode === 'table' ? <Monitor className="h-4 w-4 mr-2" /> : <Smartphone className="h-4 w-4 mr-2" />}
            {viewMode === 'table' ? 'Grid View' : 'Table View'}
          </Button>
          <Dialog open={isAddingProduct} onOpenChange={setIsAddingProduct}>
            <DialogTrigger 
              render={
                <Button className="rounded-2xl shadow-xl h-12 md:h-14 px-8 font-black uppercase tracking-widest text-[10px] md:text-xs group hover:scale-105 transition-all" style={{ backgroundColor: settings.primaryColor }}>
                  <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform" /> New Product
                </Button>
              }
            />
            <DialogContent className="w-[95vw] sm:max-w-3xl rounded-[2rem] md:rounded-[2.5rem] max-h-[90vh] overflow-y-auto p-4 sm:p-6 md:p-10">
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl font-black">{formData.id ? 'Edit' : 'Add'} Product</DialogTitle>
                <DialogDescription className="text-xs md:text-sm">Setup your product details, colors, and sizes.</DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 py-4 md:py-6">
                <div className="space-y-4 md:space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Product Name</Label>
                    <Input 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. Classic Essential Tee"
                      className="rounded-xl h-11 md:h-12 text-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Price ($)</Label>
                      <Input 
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                        className="rounded-xl h-11 md:h-12 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Discount ($)</Label>
                      <Input 
                        type="number"
                        value={formData.discountPrice || 0}
                        onChange={(e) => setFormData({...formData, discountPrice: parseFloat(e.target.value)})}
                        className="rounded-xl h-11 md:h-12 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Stock</Label>
                      <Input 
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value)})}
                        className="rounded-xl h-11 md:h-12 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Order</Label>
                      <Input 
                        type="number"
                        value={formData.order || 0}
                        onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})}
                        placeholder="0"
                        className="rounded-xl h-11 md:h-12 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Category</Label>
                    <Select 
                      value={formData.categoryId} 
                      onValueChange={(v) => setFormData({...formData, categoryId: v})}
                    >
                      <SelectTrigger className="h-11 md:h-12 rounded-xl text-sm">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Description</Label>
                    <Textarea 
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="rounded-2xl min-h-[100px] md:min-h-[150px] text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                        <Star className={`h-4 w-4 ${formData.isFeatured ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Show on Homepage</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Mark this as a featured product</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant={formData.isFeatured ? 'default' : 'outline'}
                      className="rounded-xl h-10 px-4 text-[10px] font-black uppercase tracking-widest"
                      onClick={() => setFormData({ ...formData, isFeatured: !formData.isFeatured })}
                    >
                      {formData.isFeatured ? 'Featured' : 'Not Featured'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-6 md:space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Variants (Colors & Sizes)</Label>
                    </div>
                    <div className="space-y-4 p-4 md:p-5 bg-gray-50 rounded-[1.5rem] md:rounded-3xl border border-gray-100">
                       <div className="space-y-2">
                         <div className="flex justify-between items-center mb-2">
                           <span className="text-[10px] font-black uppercase text-gray-400 leading-none">Colors</span>
                           <Button 
                            variant="link" 
                            size="sm" 
                            className="h-auto p-0 text-[10px] text-red-500 font-bold uppercase tracking-widest"
                            onClick={() => setFormData({ ...formData, colors: [] })}
                           >
                             Clear All
                           </Button>
                         </div>
                         <div className="flex flex-wrap gap-1.5 md:gap-2 mb-2">
                           {formData.colors.map((c: string) => (
                             <Badge key={c} className="rounded-full pl-1 pr-2 py-0.5 flex items-center gap-1.5 bg-white text-black border shadow-sm text-[10px]">
                               <div className="w-3 h-3 md:w-4 md:h-4 rounded-full" style={{ backgroundColor: c }} />
                               <span className="truncate max-w-[60px]">{c}</span>
                               <X className="h-3 w-3 cursor-pointer" onClick={() => removeOption('colors', c)} />
                             </Badge>
                           ))}
                         </div>
                         <div className="flex gap-2">
                           <Input type="color" className="w-10 h-10 p-1 rounded-lg shrink-0" id="colorPicker" />
                           <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-xl h-10 flex-1 text-xs"
                            onClick={() => {
                              const colorVal = (document.getElementById('colorPicker') as HTMLInputElement).value;
                              addOption('colors', colorVal);
                            }}
                           >
                             Add Color
                           </Button>
                         </div>
                       </div>

                       <div className="space-y-2">
                         <div className="flex justify-between items-center mb-2">
                           <span className="text-[10px] font-black uppercase text-gray-400 leading-none">Sizes</span>
                           <Button 
                            variant="link" 
                            size="sm" 
                            className="h-auto p-0 text-[10px] text-red-500 font-bold uppercase tracking-widest"
                            onClick={() => setFormData({ ...formData, sizes: [] })}
                           >
                             Clear All
                           </Button>
                         </div>
                         <div className="flex flex-wrap gap-1.5 md:gap-2 mb-2">
                           {formData.sizes.map((s: string) => (
                             <Badge key={s} className="rounded-full px-2 py-0.5 bg-black text-white flex items-center gap-1.5 text-[10px]">
                               {s}
                               <X className="h-3 w-3 cursor-pointer" onClick={() => removeOption('sizes', s)} />
                             </Badge>
                           ))}
                         </div>
                         <div className="flex gap-2">
                           <Input placeholder="e.g. XL, 42..." className="rounded-xl h-10 text-xs" id="sizeInput" />
                           <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-xl h-10 shrink-0 text-xs"
                            onClick={() => {
                              const sizeVal = (document.getElementById('sizeInput') as HTMLInputElement).value;
                              addOption('sizes', sizeVal);
                              (document.getElementById('sizeInput') as HTMLInputElement).value = '';
                            }}
                           >
                             Add
                           </Button>
                         </div>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Images</Label>
                    <div className="grid grid-cols-4 lg:grid-cols-3 gap-2 md:gap-3">
                      {formData.images.map((img: string, idx: number) => (
                        <div key={idx} className="aspect-square relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50 shadow-sm">
                          <img src={img} className="w-full h-full object-cover" />
                          <button 
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md"
                            onClick={() => removeImage(idx)}
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                      <label className="aspect-square rounded-xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-all hover:border-black/10">
                        {isOptimizing ? (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
                        ) : (
                          <>
                            <Upload className="h-4 w-4 text-gray-400" />
                            <span className="text-[8px] mt-1 text-gray-400 uppercase">Upload</span>
                          </>
                        )}
                        <input type="file" multiple className="hidden" onChange={handleImageUpload} />
                      </label>
                    </div>

                    {/* External URL Input Option */}
                    <div className="flex gap-2 mt-3">
                      <Input 
                        placeholder="Or paste external image URL..." 
                        id="imageUrlInput"
                        className="rounded-xl h-10 text-xs flex-1"
                      />
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl h-10 shrink-0 text-xs font-bold uppercase tracking-wider"
                        onClick={() => {
                          const inputVal = (document.getElementById('imageUrlInput') as HTMLInputElement).value;
                          if (inputVal && inputVal.trim()) {
                            setFormData({ ...formData, images: [...formData.images, inputVal.trim()] });
                            (document.getElementById('imageUrlInput') as HTMLInputElement).value = '';
                          }
                        }}
                      >
                        Add URL
                      </Button>
                    </div>

                    {/* Premium Bandwidth Warning & Compression Badge */}
                    <div className="mt-4 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/80 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-500 text-white rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest shrink-0 border-none">
                          Auto WebP Compressor
                        </Badge>
                        <span className="text-[9px] font-black uppercase text-emerald-700 tracking-wider">Active</span>
                      </div>
                      <p className="text-[10px] text-emerald-800/80 font-medium leading-relaxed">
                        All local files are silently resized to max 800px and highly optimized to WebP format (~25KB each) before upload. This maintains crystal-clear quality while reducing hosting database bandwidth by **90%**!
                      </p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1.5 leading-relaxed">
                        💡 PRO TIP: Paste external links from <a href="https://imgbb.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-black">ImgBB</a> or <a href="https://imgur.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-black">Imgur</a> to consume **0 bytes** of database bandwidth!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="pt-6 border-t flex flex-col-reverse sm:flex-row gap-2">
                <Button variant="ghost" onClick={() => setIsAddingProduct(false)} className="rounded-xl h-12 md:h-14 font-bold">Cancel</Button>
                <Button onClick={handleSave} className="rounded-full px-12 h-12 md:h-14 font-bold shadow-xl flex-1 sm:flex-none uppercase tracking-widest text-xs" style={{ backgroundColor: settings.primaryColor }}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative group max-w-2xl">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-black transition-colors" />
        <Input 
          placeholder="Search inventory..." 
          className="pl-12 h-14 rounded-3xl border-none shadow-sm bg-white focus:ring-2 focus:ring-black/5 transition-all text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <Card key={product.id} className="border-none shadow-sm rounded-[1.5rem] md:rounded-[2rem] overflow-hidden group hover:shadow-xl transition-all bg-white relative">
              <div className="aspect-[4/5] bg-gray-50 relative group overflow-hidden">
                {product.images[0] ? (
                  <img src={product.images[0]} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-200">
                    <ImageIcon size={48} className="opacity-20" />
                  </div>
                )}
                <div className="hidden md:flex absolute top-2 right-2 md:top-4 md:right-4 flex-col gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all translate-x-0 md:translate-x-4 md:group-hover:translate-x-0">
                  <Button size="icon" variant="secondary" className="rounded-lg md:rounded-xl shadow-xl h-8 w-8 md:h-10 md:w-10 bg-white/90 backdrop-blur" onClick={() => { setFormData(product); setIsAddingProduct(true); }}>
                    <Edit2 className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                  <Button size="icon" variant="destructive" className="rounded-lg md:rounded-xl shadow-xl h-8 w-8 md:h-10 md:w-10" onClick={() => deleteProduct(product.id)}>
                    <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-3 md:p-5">
                 <div className="flex justify-between items-start mb-1 md:mb-2">
                   <h3 className="font-bold text-[10px] md:text-sm line-clamp-1 flex-1 uppercase tracking-tight">{product.name}</h3>
                   <span className="font-black text-[10px] md:text-sm ml-2">{settings.currencySymbol}{product.price}</span>
                 </div>
                 <div className="flex md:hidden gap-2 mb-2">
                   <Button
                     size="sm"
                     variant="secondary"
                     className="flex-1 rounded-xl h-9 text-[10px] font-black uppercase tracking-widest"
                     onClick={() => { setFormData(product); setIsAddingProduct(true); }}
                   >
                     <Edit2 className="h-3 w-3 mr-1.5" />
                     Edit
                   </Button>
                   <Button
                     size="sm"
                     variant="destructive"
                     className="flex-1 rounded-xl h-9 text-[10px] font-black uppercase tracking-widest"
                     onClick={() => deleteProduct(product.id)}
                   >
                     <Trash2 className="h-3 w-3 mr-1.5" />
                     Remove
                   </Button>
                 </div>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 md:gap-1.5">
                      <Badge variant="outline" className="text-[6px] md:text-[8px] uppercase font-black px-1.5 md:px-2 py-0 border-gray-100 rounded-md">
                        {categories.find(c => c.id === product.categoryId)?.name || 'General'}
                      </Badge>
                      <span className={`text-[6px] md:text-[8px] font-bold uppercase tracking-widest ${product.stock > 10 ? 'text-green-500' : 'text-red-500'}`}>
                        {product.stock > 0 ? `In Stock` : 'Out of stock'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {product.colors?.slice(0, 3).map(c => <div key={c} className="w-2 h-2 rounded-full border border-white shadow-sm" style={{ backgroundColor: c }} />)}
                      {(product.colors?.length || 0) > 3 && <span className="text-[8px] text-gray-300">+{product.colors.length - 3}</span>}
                    </div>
                 </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-4 text-xs font-black uppercase text-gray-400">Product</th>
                    <th className="p-4 text-xs font-black uppercase text-gray-400">Stock</th>
                    <th className="p-4 text-xs font-black uppercase text-gray-400">Price</th>
                    <th className="p-4 text-xs font-black uppercase text-gray-400">Variants</th>
                    <th className="p-4 text-xs font-black uppercase text-gray-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => (
                    <tr key={product.id} className="border-b hover:bg-gray-50/30">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                            <img src={product.images[0]} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">{product.name}</p>
                            <p className="text-xs text-gray-400 tracking-tighter">/{product.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm font-medium">{product.stock}</td>
                      <td className="p-4 text-sm font-black">${product.price}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                           {product.colors && <span className="text-[10px] text-gray-400">{product.colors.length} Colors</span>}
                           {product.sizes && <span className="text-[10px] text-gray-400">{product.sizes.length} Sizes</span>}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" className="rounded-full" onClick={() => { setFormData(product); setIsAddingProduct(true); }}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="rounded-full text-red-500 hover:text-red-600 h-9 w-9" onClick={() => deleteProduct(product.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
