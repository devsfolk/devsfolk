import React, { useState } from 'react';
import { useShop } from '@/context/ShopContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { LayoutGrid, Plus, Search, Pencil, Trash2, Image as ImageIcon, Upload, Loader2, X, ChevronLeft } from 'lucide-react';
import { Category } from '@/types';
import { optimizeImage } from '@/lib/imageUtils';
import { Badge } from '@/components/ui/badge';

export const CategoryManagement: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory, settings } = useShop();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [newCategory, setNewCategory] = useState<Omit<Category, 'id' | 'createdAt'>>({
    name: '',
    slug: '',
    description: '',
    imageUrl: ''
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEditing: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOptimizing(true);
    try {
      const optimized = await optimizeImage(file, 800, 800);
      if (isEditing && editingCategory) {
        setEditingCategory({ ...editingCategory, imageUrl: optimized });
      } else {
        setNewCategory({ ...newCategory, imageUrl: optimized });
      }
    } catch (error) {
      console.error('Category image optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const filteredCategories = categories
    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const handleAdd = () => {
    if (!newCategory.name) return;
    addCategory({
      ...newCategory,
      slug: newCategory.name.toLowerCase().replace(/\s+/g, '-')
    });
    setNewCategory({ name: '', slug: '', description: '', imageUrl: '' });
    setIsAddDialogOpen(false);
  };

  const handleUpdate = () => {
    if (!editingCategory) return;
    updateCategory(editingCategory.id, editingCategory);
    setEditingCategory(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 md:pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-xl md:text-3xl font-black uppercase tracking-tight">Collections</h1>
          <p className="text-[8px] md:text-xs font-bold uppercase text-gray-400 tracking-widest opacity-70">Manage your product categories and organizing structure.</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger 
            render={
              <Button className="rounded-2xl shadow-xl h-12 md:h-14 px-8 font-black uppercase tracking-widest text-[10px] md:text-xs group hover:scale-105 transition-all" style={{ backgroundColor: settings.primaryColor }}>
                <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform" /> Add Collection
              </Button>
            }
          />
          <DialogContent className="w-[95vw] sm:max-w-lg rounded-[2rem] p-6 md:p-8">
            <DialogHeader>
              <DialogTitle className="text-xl md:text-2xl font-black">New Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-gray-400">Name</Label>
                  <Input 
                    placeholder="Electronics" 
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="rounded-xl h-11 md:h-12 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-gray-400">Order</Label>
                  <Input 
                    type="number"
                    placeholder="0" 
                    value={newCategory.order || 0}
                    onChange={(e) => setNewCategory({ ...newCategory, order: parseInt(e.target.value) })}
                    className="rounded-xl h-11 md:h-12 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-gray-400">Description</Label>
                <Textarea 
                  placeholder="Describe this category..." 
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  className="rounded-2xl min-h-[100px] text-sm"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-black uppercase text-gray-400">Category Image</Label>
                  <span className="text-[10px] text-gray-400">URL or Upload</span>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Input 
                      placeholder="Paste URL or use upload button" 
                      value={newCategory.imageUrl}
                      onChange={(e) => setNewCategory({ ...newCategory, imageUrl: e.target.value })}
                      className="rounded-xl h-11 md:h-12 text-sm pr-10"
                    />
                    <label className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                      {isOptimizing ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <Upload className="h-4 w-4 text-gray-400" />
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, false)} />
                    </label>
                  </div>
                  {newCategory.imageUrl && (
                    <div className="relative group">
                      <div className="w-11 h-11 md:w-12 md:h-12 border rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center shrink-0">
                        <img src={newCategory.imageUrl} className="max-w-full max-h-full object-cover" />
                      </div>
                      <button 
                        onClick={() => setNewCategory({ ...newCategory, imageUrl: '' })}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-2 w-2" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
              <Button onClick={() => setIsAddDialogOpen(false)} variant="ghost" className="rounded-xl">Cancel</Button>
              <Button onClick={handleAdd} className="rounded-full px-8 h-12 font-bold shadow-xl flex-1 sm:flex-none uppercase text-xs tracking-widest" style={{ backgroundColor: settings.primaryColor }}>
                Create Collection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative group max-w-2xl">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-black transition-colors" />
        <Input 
          placeholder="Search collections..." 
          className="pl-12 h-14 rounded-3xl border-none shadow-sm bg-white focus:ring-2 focus:ring-black/5 transition-all text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {filteredCategories.map((category) => (
          <Card key={category.id} className="border-none shadow-sm rounded-[2.5rem] overflow-hidden hover:shadow-xl transition-all group bg-white">
            <div className="aspect-[4/3] relative overflow-hidden bg-gray-50">
              {category.imageUrl ? (
                <img src={category.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-200">
                  <ImageIcon size={64} className="opacity-20" />
                </div>
              )}
              <div className="absolute top-4 right-4 flex gap-2">
                <Dialog>
                  <DialogTrigger 
                    render={
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-full bg-white/90 backdrop-blur shadow-sm h-8 w-8"
                        onClick={() => setEditingCategory(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <DialogContent className="w-[95vw] sm:max-w-lg rounded-[2rem] p-6 md:p-8">
                    <DialogHeader>
                      <DialogTitle className="text-xl md:text-2xl font-black">Edit Category</DialogTitle>
                    </DialogHeader>
                    {editingCategory && (
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-gray-400">Name</Label>
                            <Input 
                              value={editingCategory.name}
                              onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                              className="rounded-xl h-11 md:h-12 text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-gray-400">Order</Label>
                            <Input 
                              type="number"
                              value={editingCategory.order || 0}
                              onChange={(e) => setEditingCategory({ ...editingCategory, order: parseInt(e.target.value) })}
                              className="rounded-xl h-11 md:h-12 text-sm"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-gray-400">Description</Label>
                          <Textarea 
                            value={editingCategory.description}
                            onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                            className="rounded-2xl min-h-[100px] text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label className="text-[10px] font-black uppercase text-gray-400">Category Image</Label>
                            <span className="text-[10px] text-gray-400">URL or Upload</span>
                          </div>
                          <div className="flex gap-3">
                            <div className="flex-1 relative">
                              <Input 
                                placeholder="Paste URL or use upload button" 
                                value={editingCategory.imageUrl}
                                onChange={(e) => setEditingCategory({ ...editingCategory, imageUrl: e.target.value })}
                                className="rounded-xl h-11 md:h-12 text-sm pr-10"
                              />
                              <label className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                                {isOptimizing ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                ) : (
                                  <Upload className="h-4 w-4 text-gray-400" />
                                )}
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, true)} />
                              </label>
                            </div>
                            {editingCategory.imageUrl && (
                              <div className="relative group">
                                <div className="w-11 h-11 md:w-12 md:h-12 border rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center shrink-0">
                                  <img src={editingCategory.imageUrl} className="max-w-full max-h-full object-cover" />
                                </div>
                                <button 
                                  onClick={() => setEditingCategory({ ...editingCategory, imageUrl: '' })}
                                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-2 w-2" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                      <Button onClick={() => setEditingCategory(null)} variant="ghost" className="rounded-xl">Cancel</Button>
                      <Button onClick={handleUpdate} className="rounded-full px-8 h-12 font-bold shadow-xl flex-1 sm:flex-none uppercase text-xs tracking-widest" style={{ backgroundColor: settings.primaryColor }}>
                        Save Changes
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button 
                  variant="destructive" 
                  size="icon" 
                  className="rounded-full shadow-sm h-8 w-8"
                  onClick={() => deleteCategory(category.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardHeader className="p-6">
              <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight">
                {category.name}
              </CardTitle>
              <CardDescription className="text-xs line-clamp-2 mt-1">{category.description || 'No description provided for this collection.'}</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                <div className="flex flex-col">
                   <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Slug Path</span>
                   <span className="text-[10px] font-bold">/{category.slug}</span>
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Status</span>
                   <Badge className="bg-green-100 text-green-600 border-none text-[8px] px-2 py-0">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
