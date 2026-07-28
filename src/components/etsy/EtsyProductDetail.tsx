import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, FileUp, Info, Layers3, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Product, ProductVariant } from '@/types';
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

const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('Failed to read the selected file.'));
  reader.readAsDataURL(file);
});

const MAX_PERSONALIZATION_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PERSONALIZATION_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** index);
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
};

const getQuestionType = (question: any) => String(question?.question_type || question?.type || '').toLowerCase();

const isDropdownQuestion = (question: any) => {
  const questionType = getQuestionType(question);
  return questionType.includes('dropdown') || questionType.includes('select');
};

const isUploadQuestion = (question: any) => {
  const questionType = getQuestionType(question);
  return questionType.includes('upload') || questionType.includes('file');
};

const getSelectedVariationLabel = (variationGroups: Array<{ label: string; values: string[] }>, selectedValues: Record<string, string>, matchedVariation: any) => {
  if (variationGroups.length > 0) {
    return variationGroups
      .map((group) => selectedValues[group.label] || '')
      .filter(Boolean)
      .join(' / ');
  }

  return String(matchedVariation?.sku || matchedVariation?.title || matchedVariation?.name || '').trim();
};

export const EtsyProductDetail: React.FC<{ product: Product }> = ({ product }) => {
  const { settings, addToCart } = useShop();
  const { listing, variations, personalizationQuestions, loading, error } = useEtsyListings(product.id);
  const [activeImage, setActiveImage] = React.useState(0);
  const [selectedValues, setSelectedValues] = React.useState<Record<string, string>>({});
  const [selectedPersonalization, setSelectedPersonalization] = React.useState<Record<string, string>>({});
  const [selectedPersonalizationFiles, setSelectedPersonalizationFiles] = React.useState<Record<string, { name: string; type: string; dataUrl: string }>>({});
  const [submitError, setSubmitError] = React.useState('');
  const [isAddingToCart, setIsAddingToCart] = React.useState(false);
  const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

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

  React.useEffect(() => {
    setActiveImage(0);
    setSelectedValues({});
    setSelectedPersonalization({});
    setSelectedPersonalizationFiles({});
    setSubmitError('');
    setIsAddingToCart(false);
  }, [product.id]);

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

  const selectedVariationLabel = React.useMemo(
    () => getSelectedVariationLabel(variationGroups, selectedValues, matchedVariation),
    [matchedVariation, selectedValues, variationGroups],
  );

  const selectedVariation = React.useMemo<ProductVariant | undefined>(() => {
    if (variationGroups.length === 0 && !matchedVariation) {
      return undefined;
    }

    const variantPrice = matchedVariation?.price != null ? Number(matchedVariation.price) : Number(product.price);
    const variantStock = matchedVariation?.quantity != null ? Number(matchedVariation.quantity) : Number(product.stock);

    return {
      id: String(matchedVariation?.sku || selectedVariationLabel || product.id),
      name: String(selectedVariationLabel || matchedVariation?.sku || 'Selected option'),
      price: Number.isFinite(variantPrice) ? variantPrice : Number(product.price),
      stock: Number.isFinite(variantStock) ? variantStock : Number(product.stock),
    };
  }, [matchedVariation, product.id, product.price, product.stock, selectedVariationLabel, variationGroups.length]);

  const isOutOfStock = product.stock <= 0;

  const missingRequiredQuestion = React.useMemo(() => {
    return personalizationQuestions.find((question) => {
      if (!question.is_required) {
        return false;
      }

      const questionType = getQuestionType(question);
      if (isDropdownQuestion(question) || questionType.includes('choice')) {
        return !selectedPersonalization[question.id];
      }

      if (isUploadQuestion(question)) {
        return !selectedPersonalizationFiles[question.id];
      }

      return !selectedPersonalization[question.id]?.trim();
    }) || null;
  }, [personalizationQuestions, selectedPersonalization, selectedPersonalizationFiles]);

  const canAddToCart = !loading && !isAddingToCart && !isOutOfStock && !missingRequiredQuestion && (variationGroups.length === 0 || Boolean(selectedVariation));

  const handleUploadClick = (questionId: string) => {
    fileInputRefs.current[questionId]?.click();
  };

  const validatePersonalizationFile = (file: File) => {
    if (!ALLOWED_PERSONALIZATION_FILE_TYPES.includes(file.type)) {
      return 'Please upload a JPEG, PNG, or WebP image.';
    }

    if (file.size > MAX_PERSONALIZATION_FILE_SIZE_BYTES) {
      return `Please upload an image smaller than ${formatFileSize(MAX_PERSONALIZATION_FILE_SIZE_BYTES)}.`;
    }

    return '';
  };

  const handleAddToCart = async () => {
    setSubmitError('');

    if (missingRequiredQuestion) {
      setSubmitError(`Please complete "${missingRequiredQuestion.prompt || 'the required personalization'}" before adding to cart.`);
      return;
    }

    if (variationGroups.length > 0 && !selectedVariation) {
      setSubmitError('Please choose the available options before adding to cart.');
      return;
    }

    setIsAddingToCart(true);

    try {
      addToCart(product, selectedVariation, 1, {
        etsyListingId: listing?.listing_id || product.id.replace(/^etsy_listing_/, ''),
        etsySelectedVariation: matchedVariation || undefined,
        etsyPersonalizationAnswers: selectedPersonalization,
        etsyPersonalizationFiles: selectedPersonalizationFiles,
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  const priceLabel = selectedVariation?.price != null
    ? `${settings.currencySymbol}${Number(selectedVariation.price).toFixed(2)}`
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
              {selectedVariationLabel && variationGroups.length > 0 && (
                <Badge variant="outline" className="text-[10px] uppercase font-black">
                  {selectedVariationLabel}
                </Badge>
              )}
              {matchedVariation?.quantity != null && (
                <Badge variant="outline" className="text-[10px] uppercase font-black">
                  Qty {matchedVariation.quantity}
                </Badge>
              )}
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-2 rounded-2xl border bg-gray-50 px-4 py-3 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading listing details...
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              We could not load every listing detail right now, but the product is still available.
            </div>
          )}

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
                      onValueChange={(value) => {
                        setSubmitError('');
                        setSelectedValues((current) => ({ ...current, [group.label]: value }));
                      }}
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
                This listing does not expose variation data in the current sync yet.
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
                  const questionType = getQuestionType(question);

                  if (isDropdownQuestion(question)) {
                    return (
                      <div key={question.id} className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase text-gray-400">
                          {label}{question.is_required ? ' *' : ''}
                        </Label>
                        <Select
                          value={selectedPersonalization[question.id] || ''}
                          onValueChange={(value) => {
                            setSubmitError('');
                            setSelectedPersonalization((current) => ({ ...current, [question.id]: value }));
                          }}
                        >
                          <SelectTrigger className="w-full rounded-xl h-11">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(question.choices) && question.choices.length > 0 ? (
                              question.choices.map((choice: any, choiceIndex: number) => {
                                const choiceValue = typeof choice === 'string'
                                  ? choice
                                  : String(choice?.value || choice?.title || choice?.label || choiceIndex);
                                return (
                                  <SelectItem key={`${question.id}-${choiceValue}`} value={choiceValue}>
                                    {choiceValue}
                                  </SelectItem>
                                );
                              })
                            ) : (
                              <SelectItem value="default">Select an option</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }

                  if (isUploadQuestion(question)) {
                    const selectedFile = selectedPersonalizationFiles[question.id];
                    return (
                      <div key={question.id} className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase text-gray-400">
                          {label}{question.is_required ? ' *' : ''}
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          className="justify-start gap-2 rounded-xl border-dashed"
                          onClick={() => handleUploadClick(question.id)}
                        >
                          <FileUp className="h-4 w-4" />
                          {selectedFile ? selectedFile.name : 'Upload file'}
                        </Button>
                        <Input
                          ref={(node) => {
                            fileInputRefs.current[question.id] = node;
                          }}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (!file) {
                              setSubmitError('');
                              setSelectedPersonalizationFiles((current) => {
                                const next = { ...current };
                                delete next[question.id];
                                return next;
                              });
                              return;
                            }

                            const validationError = validatePersonalizationFile(file);
                            if (validationError) {
                              setSubmitError(validationError);
                              event.target.value = '';
                              return;
                            }

                            try {
                              const dataUrl = await readFileAsDataUrl(file);
                              setSubmitError('');
                              setSelectedPersonalizationFiles((current) => ({
                                ...current,
                                [question.id]: {
                                  name: file.name,
                                  type: file.type,
                                  dataUrl,
                                },
                              }));
                            } catch {
                              setSubmitError('Unable to read that file. Please try another file.');
                            }
                          }}
                        />
                        {selectedFile && (
                          <p className="text-xs text-gray-500">
                            {selectedFile.name}
                          </p>
                        )}
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          JPEG, PNG, or WebP. Max {formatFileSize(MAX_PERSONALIZATION_FILE_SIZE_BYTES)}.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div key={question.id} className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase text-gray-400">
                        {label}{question.is_required ? ' *' : ''}
                      </Label>
                      <Textarea
                        value={selectedPersonalization[question.id] || ''}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setSubmitError('');
                          setSelectedPersonalization((current) => ({
                            ...current,
                            [question.id]: nextValue,
                          }));
                        }}
                        maxLength={question.max_length || undefined}
                        placeholder={questionType === 'text_input' ? 'Enter personalization text' : 'Enter personalization details'}
                        className="min-h-[100px] rounded-2xl bg-white"
                      />
                      {question.max_length ? (
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          Max {question.max_length} characters
                        </p>
                      ) : null}
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

          <div className="rounded-3xl border bg-gray-50 p-4 md:p-6 text-sm text-gray-600">
            <div className="flex items-center gap-2 font-black uppercase tracking-widest text-gray-500 mb-2">
              <Info className="h-4 w-4" />
              Ready to order
            </div>
            Choose your options, add the item to your cart, and continue checkout when you’re ready.
          </div>

          {submitError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full h-12 md:h-14 rounded-2xl border font-black text-xs md:text-lg uppercase tracking-widest shadow-xl"
              style={{
                backgroundColor: settings.primaryColor,
                color: 'var(--primary-foreground)',
                borderColor: 'var(--primary-border)',
              }}
              disabled={!canAddToCart}
              onClick={() => void handleAddToCart()}
            >
              {isAddingToCart ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : isOutOfStock ? (
                'Out of Stock'
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Add to Cart
                </>
              )}
            </Button>

            {variationGroups.length > 0 && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Selected option: {selectedVariationLabel || 'Default'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
