import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useShop } from '@/context/ShopContext';
import { ShoppingBag, ChevronRight, Truck, ShieldCheck, ArrowLeft, Plus, Minus, MessageSquare, Star, Heart, Share2, Zap, RotateCcw, CreditCard, Gift, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'motion/react';

export const ProductPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { products, settings, addToCart, categories, reviews, addReview, wishlist, toggleWishlist } = useShop();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [device, setDevice] = React.useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewName, setReviewName] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const isDevsFolk = settings.activeTemplate === 'devsfolk';
  const featureIconMap = {
    truck: Truck,
    shield: ShieldCheck,
    'message-circle': MessageSquare,
    'rotate-ccw': RotateCcw,
    zap: Zap,
    'credit-card': CreditCard,
    gift: Gift,
    'badge-check': BadgeCheck,
  } as const;

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) setDevice('mobile');
      else if (window.innerWidth < 1024) setDevice('tablet');
      else setDevice('desktop');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const product = products.find(p => p.slug === slug);
  const productReviews = reviews.filter(r => r.productId === product?.id);
  const averageRating = productReviews.length > 0 
    ? Math.round(productReviews.reduce((acc, r) => acc + r.rating, 0) / productReviews.length) 
    : 0;

  React.useEffect(() => {
    if (product) {
      document.title = `${product.name} | ${settings.shopName}`;
    }
  }, [product, settings.shopName]);

  const [selectedColor, setSelectedColor] = useState(product?.colors?.[0]);
  const [selectedSize, setSelectedSize] = useState(product?.sizes?.[0]);

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
        <Link to="/categories">
          <Button>Back to Shop</Button>
        </Link>
      </div>
    );
  }

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName || !reviewComment) return;

    addReview({
      productId: product.id,
      userName: reviewName,
      rating: reviewRating,
      comment: reviewComment
    });

    setReviewName('');
    setReviewComment('');
    setReviewRating(5);
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const sharePayload = {
      title: product.name,
      text: `Check out ${product.name} on ${settings.shopName}`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(sharePayload);
        setShareMessage('Product shared');
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareMessage('Link copied');
      } else {
        setShareMessage('Share is not available');
      }
    } catch (error) {
      console.error('Failed to share product:', error);
      setShareMessage('Share cancelled');
    }

    window.setTimeout(() => setShareMessage(''), 2000);
  };


  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`container mx-auto px-2 md:px-4 ${isDevsFolk && device === 'mobile' ? 'py-4' : 'py-8 md:py-12'}`}
    >
      {/* Mobile Back Button */}
      {!isDevsFolk && (
        <Link to="/categories" className="md:hidden flex items-center gap-2 text-sm text-gray-500 mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Shop
        </Link>
      )}

      <div className={`grid grid-cols-1 lg:grid-cols-2 ${isDevsFolk && device === 'mobile' ? 'gap-2' : 'gap-12'}`}>
        {/* Product Images */}
        <div className="space-y-2 md:space-y-4 px-2 md:px-0">
          <div className={`overflow-hidden bg-gray-100 ${isDevsFolk && device === 'mobile' ? 'rounded-2xl aspect-[5/4]' : 'rounded-3xl aspect-square'}`}>
            <AnimatePresence mode="wait">
              <motion.img 
                key={activeImage}
                src={product.images[activeImage]} 
                alt={product.name} 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full object-cover"
              />
            </AnimatePresence>
          </div>
          {product.images.length > 1 && (
            <div className={`flex ${isDevsFolk && device === 'mobile' ? 'gap-1.5' : 'gap-4'} overflow-x-auto pb-1 no-scrollbar`}>
              {product.images.map((img, i) => (
                <button 
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`relative ${isDevsFolk && device === 'mobile' ? 'w-10 h-10 rounded-md' : 'w-20 h-20 rounded-xl'} overflow-hidden flex-shrink-0 border-2 transition-all ${activeImage === i ? 'border-black' : 'border-transparent'}`}
                >
                  <img src={img} loading="lazy" alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col px-3 md:px-0">
          <div className={`${isDevsFolk && device === 'mobile' ? 'mb-2' : 'mb-8'}`}>
            <h1 className={`${isDevsFolk && device === 'mobile' ? 'text-lg mb-0.5 mt-2 font-black uppercase tracking-tight' : 'text-3xl md:text-5xl font-bold tracking-tight mb-4'}`} style={{ fontFamily: settings.fontDisplay }}>
              {product.name}
            </h1>
            
            <div className="flex items-center gap-2 mb-4">
               <div className="flex">
                  {[1,2,3,4,5].map(star => (
                    <Star key={star} className={`h-3 w-3 md:h-4 md:w-4 ${star <= averageRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  ))}
               </div>
               <span className="text-[10px] md:text-sm font-bold text-gray-400">({productReviews.length} reviews)</span>
               <div className="mx-2 h-4 w-px bg-gray-200" />
               <Badge variant={product.stock > 0 ? "outline" : "destructive"} className="text-[10px] uppercase font-black tracking-widest rounded-lg">
                 {product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
               </Badge>
            </div>

            <div className={`flex items-center gap-3 ${isDevsFolk && device === 'mobile' ? 'mb-1' : 'mb-6'}`}>
              <span className={`${isDevsFolk && device === 'mobile' ? 'text-base' : 'text-2xl'} font-black tracking-tighter`}>
                {settings.currencySymbol}{product.discountPrice || product.price}
              </span>
              {product.discountPrice && (
                <span className={`${isDevsFolk && device === 'mobile' ? 'text-[10px]' : 'text-md'} text-gray-400 font-bold line-through`}>
                  {settings.currencySymbol}{product.price}
                </span>
              )}
            </div>
            <p className={`${isDevsFolk && device === 'mobile' ? 'text-[9px] mb-3 leading-tight opacity-70 font-medium' : 'text-gray-600 leading-relaxed mb-8'}`}>
              {product.description}
            </p>

            {product.colors && product.colors.length > 0 && (
              <div className={`${isDevsFolk && device === 'mobile' ? 'mb-3 space-y-1' : 'mb-6 space-y-3'}`}>
                <span className="text-[8px] md:text-sm font-black uppercase tracking-widest text-gray-400 opacity-60">Color</span>
                <div className="flex gap-1.5 md:gap-3">
                  {product.colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`${isDevsFolk && device === 'mobile' ? 'w-5 h-5' : 'w-10 h-10'} rounded-full border-2 transition-all flex items-center justify-center ${selectedColor === color ? 'border-black scale-110 shadow-sm' : 'border-transparent'}`}
                    >
                      <div className={`${isDevsFolk && device === 'mobile' ? 'w-3 h-3' : 'w-7 h-7'} rounded-full`} style={{ backgroundColor: color }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.sizes && product.sizes.length > 0 && (
              <div className={`${isDevsFolk && device === 'mobile' ? 'mb-4 space-y-1' : 'mb-8 space-y-3'}`}>
                <span className="text-[8px] md:text-sm font-black uppercase tracking-widest text-gray-400 opacity-60">Size</span>
                <div className="flex flex-wrap gap-1.5">
                  {product.sizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`${isDevsFolk && device === 'mobile' ? 'px-2.5 py-1 text-[8px]' : 'px-6 py-2 text-sm'} rounded-lg md:rounded-xl font-black uppercase tracking-widest border border-gray-100 md:border-2 transition-all ${selectedSize === size ? 'bg-black text-white border-black shadow-lg' : 'bg-white text-black hover:border-gray-200'}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={`${isDevsFolk && device === 'mobile' ? 'space-y-3 mb-4 pt-4 border-t' : 'space-y-6 mb-12 pt-0 border-none'}`}>
            <div className="flex items-center gap-4">
              <span className="text-[8px] md:text-sm font-black uppercase tracking-widest opacity-60">Quantity</span>
              <div className="flex items-center border rounded-full px-1.5 py-0.5 md:py-1 bg-gray-50/50">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full h-5 w-5 md:h-8 md:w-8" 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="h-2 w-2 md:h-4 md:w-4" />
                </Button>
                <span className="w-6 md:w-12 text-center font-black text-[10px] md:text-sm">{quantity}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full h-5 w-5 md:h-8 md:w-8"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-2 w-2 md:h-4 md:w-4" />
                </Button>
              </div>
            </div>

            <div className={`flex flex-col ${isDevsFolk && device === 'mobile' ? 'gap-2' : 'gap-3'}`}>
                <div className="flex gap-2">
                  <Button 
                    size="lg" 
                    disabled={product.stock <= 0}
                    className={`${isDevsFolk && device === 'mobile' ? 'h-10 text-[10px]' : 'h-14 text-lg'} flex-1 rounded-xl md:rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2`}
                    style={{
                      backgroundColor: settings.primaryColor,
                      color: 'var(--primary-foreground)',
                      borderColor: 'var(--primary-border)',
                    }}
                    onClick={() => addToCart(product, undefined, quantity, { color: selectedColor, size: selectedSize })}
                  >
                    <ShoppingBag className="h-3.5 w-3.5 md:h-6 md:w-6" />
                    {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className={`${isDevsFolk && device === 'mobile' ? 'h-10 w-10' : 'h-14 w-14'} rounded-xl md:rounded-2xl border-2 flex items-center justify-center p-0`}
                    onClick={() => toggleWishlist(product.id)}
                  >
                    <Heart className={`h-5 w-5 ${wishlist.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className={`${isDevsFolk && device === 'mobile' ? 'h-10 w-10' : 'h-14 w-14'} rounded-xl md:rounded-2xl border-2 flex items-center justify-center p-0`}
                    onClick={() => void handleShare()}
                  >
                    <Share2 className="h-5 w-5 text-gray-400" />
                  </Button>
                </div>
                {shareMessage && <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{shareMessage}</p>}
            </div>
          </div>

          {settings.trustFeatures.some((feature) => feature.enabled) && (
            !isDevsFolk || device !== 'mobile' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8 border-t">
                {settings.trustFeatures.filter((feature) => feature.enabled).slice(0, 2).map((feature) => {
                  const Icon = featureIconMap[feature.icon] || ShieldCheck;
                  return (
                    <div key={feature.id} className="flex items-start gap-3">
                      <Icon className="h-5 w-5 text-gray-400 mt-1" />
                      <div>
                        <h4 className="text-sm font-bold">{feature.title}</h4>
                        {feature.subtitle && <p className="text-xs text-gray-500">{feature.subtitle}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex justify-between items-center py-4 border-t opacity-40">
                {settings.trustFeatures.filter((feature) => feature.enabled).slice(0, 2).map((feature) => {
                  const Icon = featureIconMap[feature.icon] || ShieldCheck;
                  return (
                    <div key={feature.id} className="flex items-center gap-1.5">
                      <Icon className="h-3 w-3" />
                      <span className="text-[7px] font-black uppercase tracking-widest leading-none">{feature.title}</span>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className={`${isDevsFolk && device === 'mobile' ? 'mt-12 py-8' : 'mt-24 py-16'} border-t`}>
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div>
               <h2 className={`${isDevsFolk && device === 'mobile' ? 'text-lg' : 'text-3xl'} font-black uppercase tracking-tight mb-4`}>Customer Reviews</h2>
               <div className="flex items-center gap-4 mb-6">
                  <div className="text-5xl font-black tracking-tighter">{averageRating || 0}</div>
                  <div>
                     <div className="flex mb-1">
                        {[1,2,3,4,5].map(star => (
                           <Star key={star} className={`h-4 w-4 ${star <= averageRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                        ))}
                     </div>
                     <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Based on {productReviews.length} reviews</p>
                  </div>
               </div>
               
               <div className="space-y-4 p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                  <h3 className="text-sm font-black uppercase tracking-tight">Write a Review</h3>
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                     <div className="flex gap-2">
                        {[1,2,3,4,5].map(star => (
                           <button 
                              key={star} 
                              type="button" 
                              onClick={() => setReviewRating(star)}
                              className="focus:outline-none"
                           >
                              <Star className={`h-5 w-5 ${star <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                           </button>
                        ))}
                     </div>
                     <Input 
                        placeholder="Your Name" 
                        value={reviewName}
                        onChange={(e) => setReviewName(e.target.value)}
                        className="bg-white rounded-xl border-gray-200" 
                     />
                     <Textarea 
                        placeholder="Your experience with this product..." 
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        className="bg-white rounded-xl border-gray-200 min-h-[100px]" 
                     />
                     <Button
                        type="submit"
                        className="w-full rounded-xl font-bold uppercase tracking-widest text-xs h-11"
                        style={{
                           backgroundColor: settings.primaryColor,
                           color: 'var(--primary-foreground)',
                           borderColor: 'var(--primary-border)',
                        }}
                     >
                        Submit Review
                     </Button>
                  </form>
               </div>
            </div>
            
            <div className="lg:col-span-2 space-y-8">
               {productReviews.length > 0 ? (
                  productReviews.map(review => (
                     <div key={review.id} className="pb-8 border-b last:border-none">
                        <div className="flex justify-between items-start mb-2">
                           <div>
                              <div className="font-black text-sm uppercase tracking-tight mb-1">{review.userName}</div>
                              <div className="flex mb-2">
                                 {[1,2,3,4,5].map(star => (
                                    <Star key={star} className={`h-3 w-3 ${star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                 ))}
                              </div>
                           </div>
                           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              {new Date(review.createdAt).toLocaleDateString()}
                           </span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed italic opacity-80">"{review.comment}"</p>
                     </div>
                  ))
               ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 opacity-40">
                     <MessageSquare className="h-12 w-12 mb-4" />
                     <p className="text-sm font-bold uppercase tracking-widest">No reviews yet. Be the first to review!</p>
                  </div>
               )}
            </div>
         </div>
      </div>

      {/* Related Products */}
      <div className={`${isDevsFolk && device === 'mobile' ? 'mt-12 py-8' : 'mt-24 py-16'} border-t`}>
        <div className="flex items-center justify-between mb-8">
           <h2 className={`${isDevsFolk && device === 'mobile' ? 'text-lg' : 'text-3xl'} font-black uppercase tracking-tight`}>Related Products</h2>
           <Link to={`/category/${categories.find(c => c.id === product.categoryId)?.slug || ''}`}>
              <Button variant="link" className={`${isDevsFolk && device === 'mobile' ? 'text-[8px]' : 'text-sm'} uppercase font-black tracking-widest p-0 opacity-60 underline-offset-4`}>
                View All <ChevronRight className="ml-1 h-3 w-3 md:h-4 md:w-4" />
              </Button>
           </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
           {products
             .filter(p => p.categoryId === product.categoryId && p.id !== product.id)
             .slice(0, 4)
             .map(p => (
               <div key={p.id} className="group relative">
                  <Link to={`/product/${p.slug}`} className="block">
                    <div className="aspect-[4/5] rounded-2xl md:rounded-[2rem] overflow-hidden bg-gray-50 mb-3 relative">
                      <img src={p.images[0]} loading="lazy" alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    </div>
                    <h3 className="text-[10px] md:text-sm font-black uppercase tracking-tight mb-1 truncate">{p.name}</h3>
                    <p className="text-[10px] md:text-sm font-black">{settings.currencySymbol}{p.price}</p>
                  </Link>
                  <div className="absolute bottom-10 md:bottom-16 right-2 md:right-4 z-10">
                    <Button 
                      size="icon" 
                      className="h-8 w-8 md:h-10 md:w-10 rounded-full shadow-xl"
                      style={{
                        backgroundColor: settings.primaryColor,
                        color: 'var(--primary-foreground)',
                        borderColor: 'var(--primary-border)',
                      }}
                      onClick={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        addToCart(p, undefined, 1);
                      }}
                    >
                      <ShoppingBag className="h-3.5 w-3.5 md:h-5 md:w-5" />
                    </Button>
                  </div>
               </div>
             ))}
        </div>
      </div>
    </motion.div>
  );
};
