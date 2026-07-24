import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, FileUp, Info, Layers3, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Product } from '@/types';
import { useShop } from '@/context/ShopContext';
import { useEtsyListings } from '@/hooks/useEtsyListings';

const normalizeImageUrl = (image: any) => {
  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.url_fullxfull || image.url_570xN || image.url_170x135 || image.url_75x75 || image.src || image.url || '';
};

const getPropertyLabel = (entry: any, fallback: string) => {
  const raw = entry?.formatted_name || entry?.property_name || entry?.name || entry?.label || entry?.title || '';
  return String(raw || fallback).trim();
};

const getPropertyValue = (entry: any) => {
  if (entry == null) return '';
  if (typeof entry === 'string' || typeof entry === 'number') return String(entry);
  return String(entry?.formatted_value || entry?.value || entry?.title || entry?.name || entry?.value_name || '').trim();
};

const flattenProperties = (properties: any) => {
  if (!properties) return [];
  if (Array.isArray(properties)) {
    return properties
      .map((entry, index) => ({
        label: getPropertyLabel(entry, `Property ${index + 1}`),
        value: getPropertyValue(entry),
      }))
      .filter((entry) => entry.label && entry.value);
  }

  if (typeof properties === 'object') {
    return Object.entries(properties)
      .map(([label, value]) => ({
        label: String(label),
        value: String(value ?? '').trim(),
      }))
      .filter((entry) => entry.label && entry.value);
  }

  return [];
};

export const EtsyProductDetail: React.FC<{ product: Product }> = ({ product }) => {
  const { settings } = useShop();
  const { listing, variations, personalizationQuestions, loading, error } = useEtsyListings(product.id);
  const [activeImage, setActiveImage] = React.useState(0);
  const [selectedValues, setSelectedValues] = React.useState<Record<string, string>>({});
  const [selectedPersonalization, setSelectedPersonalization] = React.useState<Record<string, string>>({});

  const imageEntries = React.useMemo(() => {
    const rawImages = Array.isArray(listing?.images) && listing.images.length > 0 ? listing.images : product.images;
    return rawImages
      .map((image) => ({
        raw: image,
        src: normalizeImageUrl(image),
      }))
      .filter((image) => image.src);
  }, [listing?.images, product.images]);

  const variationGroups = React.useMemo(() => {
    const nextGroups = new Map<string, Set<string>>();

    variations.forEach((variation) => {
      flattenProperties(variation.properties).forEach(({ label, value }) => {
        if (!nextGroups.has(label)) {
          nextGroups.set(label, new Set<string>());
        }
        nextGroups.get(label)?.add(value);
      });
    });

    return Array.from(nextGroups.entries()).map(([label, values]) => ({
      label,
      values: Array.from(values),
    }));
  }, [variations]);

  React.useEffect(() => {
    if (variationGroups.length === 0) {
      return;
    }

    setSelectedValues((current) => {
      const next = { ...current };
      variationGroups.forEach((group) => {
        if (!next[group.label] && group.values.length > 0) {
          next[group.label] = group.values[0];
        }
      });
      return next;
    });
  }, [variationGroups]);

  const matchedVariation = React.useMemo(() => {
    if (variations.length === 0 || variationGroups.length === 0) {
      return null;
    }

    return variations.find((variation) => {
      const props = flattenProperties(variation.properties);
      return variationGroups.every((group) => {
        const selectedValue = selectedValues[group.label];
        if (!selectedValue) {
          return true;
        }

        return props.some((entry) => entry.label === group.label && entry.value === selectedValue);
      });
    }) || null;
  }, [selectedValues, variationGroups, variations]);

  React.useEffect(() => {
    setActiveImage(0);
    setSelectedValues({});
    setSelectedPersonalization({});
  }, [product.id]);

  const priceLabel = matchedVariation?.price != null
    ? `${settings.currencySymbol}${Number(matchedVariation.price).toFixed(2)}`
    : `${settings.currencySymbol}${Number(product.price).toFixed(2)}`;

  return (
    <div className="container mx-auto px-3 md:px-4 py-6 md:py-10">
      <div className="mb-5 md:mb-6">
        <Link to="/categories" className="inline-flex items-center gap-2 text-xs md:text-sm font-bold text-gray-500 hover:text-black">
          <ArrowLeft className="h-4 w-4" />
          Back to Shop
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
        <div className="space-y-3 md:space-y-4">
          <div className="aspect-square overflow-hidden rounded-3xl bg-gray-100 border border-gray-100">
            {imageEntries[activeImage]?.src ? (
              <img
                src={imageEntries[activeImage].src}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-gray-100 text-gray-300">
                <Sparkles className="h-12 w-12" />
              </div>
            )}
          </div>

          {imageEntries.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {imageEntries.map((image, index) => (
                <button
                  key={`${image.src}-${index}`}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border-2 transition-all ${activeImage === index ? 'border-black' : 'border-transparent'}`}
                >
                  <img src={image.src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-2xl md:text-5xl font-black uppercase tracking-tight">
              {listing?.title || product.name}
            </h1>
            <p className="text-sm md:text-base text-gray-600 leading-relaxed">
              {listing?.description || product.description}
            </p>
            <div className="flex items-center gap-3">
              <span className="text-xl md:text-3xl font-black tracking-tight">
                {priceLabel}
              </span>
              {matchedVariation?.quantity != null && (
                <Badge variant="outline" className="text-[10px] uppercase font-black">
                  Qty {matchedVariation.quantity}
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border bg-white p-4 md:p-6">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
              <Layers3 className="h-4 w-4" />
              Variations
            </div>

            {variationGroups.length > 0 ? (
              <div className="grid gap-4">
                {variationGroups.map((group) => (
                  <div key={group.label} className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400">
                      {group.label}
                    </Label>
                    <Select
                      value={selectedValues[group.label] || group.values[0] || ''}
                      onValueChange={(value) => setSelectedValues((current) => ({ ...current, [group.label]: value }))}
                    >
                      <SelectTrigger className="w-full rounded-xl h-11">
                        <SelectValue placeholder={`Choose ${group.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {group.values.map((value) => (
                          <SelectItem key={value} value={value}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                This Etsy listing does not expose variation data in the current sync yet.
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-3xl border bg-white p-4 md:p-6">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
              <FileText className="h-4 w-4" />
              Personalization
            </div>

            {personalizationQuestions.length > 0 ? (
              <div className="grid gap-4">
                {personalizationQuestions.map((question, index) => {
                  const label = question.prompt || `Question ${index + 1}`;

                  if (String(question.question_type).toLowerCase().includes('dropdown') && Array.isArray(question.choices)) {
                    return (
                      <div key={question.id} className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase text-gray-400">
                          {label}
                        </Label>
                        <Select
                          value={selectedPersonalization[question.id] || ''}
                          onValueChange={(value) => setSelectedPersonalization((current) => ({ ...current, [question.id]: value }))}
                        >
                          <SelectTrigger className="w-full rounded-xl h-11">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            {question.choices.map((choice: any, choiceIndex: number) => {
                              const choiceValue = typeof choice === 'string'
                                ? choice
                                : String(choice?.value || choice?.title || choice?.label || choiceIndex);
                              return (
                                <SelectItem key={`${question.id}-${choiceValue}`} value={choiceValue}>
                                  {choiceValue}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }

                  if (String(question.question_type).toLowerCase().includes('upload')) {
                    return (
                      <div key={question.id} className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase text-gray-400">
                          {label}
                        </Label>
                        <div className="flex items-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                          <FileUp className="h-4 w-4" />
                          File upload will be enabled in the checkout phase.
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={question.id} className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase text-gray-400">
                        {label}
                      </Label>
                      <Textarea
                        readOnly
                        disabled
                        value={selectedPersonalization[question.id] || ''}
                        placeholder={question.question_type === 'text_input' ? 'Personalization text placeholder' : 'Enter personalization details'}
                        className="min-h-[100px] rounded-2xl bg-gray-50"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                No personalization questions are configured for this listing.
              </div>
            )}
          </div>

          <div className="rounded-3xl border bg-amber-50 p-4 md:p-6 text-sm text-amber-900">
            <div className="flex items-center gap-2 font-black uppercase tracking-widest text-amber-700 mb-2">
              <Info className="h-4 w-4" />
              Coming Soon
            </div>
            Checkout is not available yet for this product. This section is read-only while the import and display flow is being verified.
          </div>
        </div>
      </div>
    </div>
  );
};
