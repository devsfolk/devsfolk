import React from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Product, PrintifyCatalogTemplate } from '@/types';

interface TemplateSelectorProps {
  templates: Product[];
  selectedTemplate: Product | null;
  onSelectTemplate: (template: Product) => void;
  onNext: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currencySymbol: string;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedTemplate,
  onSelectTemplate,
  onNext,
  searchQuery,
  onSearchChange,
  currencySymbol,
}) => {
  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 rounded-xl h-12 text-sm"
          />
        </div>
      </div>

      {/* Template Grid */}
      {templates.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-gray-500">No templates available</p>
          <p className="text-xs text-gray-400 mt-2">
            Admin needs to create templates in Dashboard → Printify → Editor
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => {
            const isSelected = selectedTemplate?.id === template.id;
            
            return (
              <div
                key={template.id}
                className={`
                  group relative rounded-3xl overflow-hidden border-2 transition-all cursor-pointer
                  ${isSelected 
                    ? 'border-black shadow-xl ring-4 ring-black/10' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'}
                `}
                onClick={() => onSelectTemplate(template)}
              >
                {/* Template Image */}
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  <img
                    src={template.images[0] || '/custom-tee-mockup.png'}
                    alt={template.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Template Info */}
                <div className="p-4">
                  <h3 className="font-black text-sm uppercase tracking-tight truncate">
                    {template.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {template.description}
                  </p>

                  {/* Price */}
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Base Price</p>
                      <p className="text-lg font-black">
                        {currencySymbol}{template.price.toFixed(2)}
                      </p>
                    </div>

                    {/* Select Button */}
                    <Button
                      size="sm"
                      className={`
                        rounded-xl h-9 px-4 text-[10px] font-black uppercase
                        ${isSelected 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-black hover:bg-neutral-800 text-white'}
                      `}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTemplate(template);
                      }}
                    >
                      {isSelected ? '✓ Selected' : 'Select'}
                    </Button>
                  </div>

                  {/* Metadata */}
                  <div className="mt-3 pt-3 border-t flex items-center gap-3 text-[10px] text-gray-500">
                    {template.colors && template.colors.length > 0 && (
                      <span>{template.colors.length} Colors</span>
                    )}
                    {template.sizes && template.sizes.length > 0 && (
                      <span>{template.sizes.length} Sizes</span>
                    )}
                  </div>
                </div>

                {/* Selected Badge */}
                {isSelected && (
                  <div className="absolute top-3 right-3 bg-green-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-lg">
                    ✓ Selected
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Next Button */}
      {selectedTemplate && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Selected Template</p>
              <p className="text-sm font-black">{selectedTemplate.name}</p>
            </div>
            <Button
              onClick={onNext}
              className="rounded-xl h-12 px-8 text-sm font-black uppercase bg-black hover:bg-neutral-800 text-white"
            >
              Next: Color & Size
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
