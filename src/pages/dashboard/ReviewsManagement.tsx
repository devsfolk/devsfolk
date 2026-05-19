import React, { useState } from 'react';
import { useShop } from '@/context/ShopContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MessageSquare, 
  Star, 
  Trash2, 
  Search, 
  Filter, 
  ThumbsUp, 
  Heart, 
  AlertTriangle,
  Sparkles,
  ShoppingBag
} from 'lucide-react';

export const ReviewsManagement: React.FC = () => {
  const { reviews, products, deleteReview, settings } = useShop();
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  // Stats calculation
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
    : '0.0';
  
  const positiveReviews = reviews.filter(r => r.rating >= 4).length;
  const positiveRatio = totalReviews > 0 
    ? Math.round((positiveReviews / totalReviews) * 100) 
    : 0;

  // Filter reviews
  const filteredReviews = reviews.filter(review => {
    const matchesSearch = 
      review.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.comment.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRating = ratingFilter === 'all' || review.rating === ratingFilter;

    return matchesSearch && matchesRating;
  });

  const getProductName = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    return prod ? prod.name : 'Unknown Product';
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmationId(id);
  };

  const handleConfirmDelete = (id: string) => {
    deleteReview(id);
    setDeleteConfirmationId(null);
  };

  return (
    <div className="space-y-6 md:space-y-10">
      {/* Page Title */}
      <div className="pb-4 md:pb-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-4xl font-black uppercase tracking-tight flex items-center gap-2">
            Reviews
            <Sparkles className="h-5 w-5 text-yellow-500 fill-yellow-500 animate-pulse shrink-0" />
          </h1>
          <p className="text-[8px] md:text-xs font-bold uppercase text-gray-400 tracking-widest opacity-70 mt-1">
            Moderate, review, and delete customer feedback.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
        <Card className="border-none shadow-sm rounded-[2rem] bg-white group hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-6">
            <CardTitle className="text-[8px] md:text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none">Total Feedback</CardTitle>
            <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-black group-hover:text-white transition-colors">
              <MessageSquare className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="text-3xl font-black tracking-tight">{totalReviews}</div>
            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-2">Verified Reviews</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-[2rem] bg-white group hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-6">
            <CardTitle className="text-[8px] md:text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none">Average Score</CardTitle>
            <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-yellow-400 group-hover:text-black transition-colors">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="text-3xl font-black tracking-tight">{averageRating} / 5.0</div>
            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-2">Customer Satisfaction</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-[2rem] bg-white group hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-6">
            <CardTitle className="text-[8px] md:text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none">Positive Sentiment</CardTitle>
            <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-emerald-400 group-hover:text-white transition-colors">
              <ThumbsUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="text-3xl font-black tracking-tight">{positiveRatio}%</div>
            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-2">4 & 5 Star Reviews</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-[2rem] bg-white group hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-6">
            <CardTitle className="text-[8px] md:text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none">Status</CardTitle>
            <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-indigo-400 group-hover:text-white transition-colors">
              <Heart className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="text-3xl font-black tracking-tight">Active</div>
            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-2">Live Verification Engine</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Reviews Moderation Box */}
      <Card className="border-none shadow-sm rounded-[2.5rem] bg-white overflow-hidden">
        <CardHeader className="p-6 md:p-8 pb-4">
          <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">Customer Feedback Moderation</CardTitle>
          <CardDescription className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Search, filter, inspect, and delete reviews posted on storefront products.
          </CardDescription>
        </CardHeader>

        {/* Filters Bar */}
        <div className="px-6 md:px-8 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-gray-50">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by customer name or review text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-11 rounded-xl border border-gray-200"
            />
          </div>

          <div className="flex gap-2 items-center">
            <Filter className="h-4 w-4 text-gray-400 shrink-0" />
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full h-11 rounded-xl border border-gray-200 px-4 font-bold text-xs uppercase tracking-wider bg-white focus:outline-none"
            >
              <option value="all">All Ratings</option>
              <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
              <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
              <option value="3">⭐⭐⭐ (3 Stars)</option>
              <option value="2">⭐⭐ (2 Stars)</option>
              <option value="1">⭐ (1 Star)</option>
            </select>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {filteredReviews.map((review) => (
              <div 
                key={review.id} 
                className={`p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${
                  deleteConfirmationId === review.id ? 'bg-red-50/30' : 'hover:bg-gray-50/50'
                }`}
              >
                {/* Review Information */}
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center font-black uppercase text-xs shadow-sm shrink-0">
                      {review.userName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-black text-sm uppercase tracking-tight flex items-center gap-2 flex-wrap">
                        {review.userName}
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider shrink-0">
                          Verified Buyer
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">for</span>
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tight flex items-center gap-1">
                          <ShoppingBag className="h-3 w-3 shrink-0" />
                          {getProductName(review.productId)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rating Stars */}
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={`h-3.5 w-3.5 ${
                          star <= review.rating 
                            ? 'fill-yellow-400 text-yellow-400' 
                            : 'text-gray-200'
                        }`} 
                      />
                    ))}
                  </div>

                  {/* Comment */}
                  <p className="text-sm text-gray-600 font-medium italic bg-gray-50/50 rounded-xl p-3 border border-gray-100/60 leading-relaxed max-w-3xl">
                    "{review.comment}"
                  </p>

                  {/* Meta */}
                  <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">
                    Submitted: {new Date(review.createdAt).toLocaleDateString(undefined, { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
                  {deleteConfirmationId === review.id ? (
                    <div className="flex items-center gap-2 border border-red-200 bg-red-50 rounded-2xl p-2 animate-pulse">
                      <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                      <span className="text-[9px] font-black text-red-700 uppercase tracking-widest">Really Delete?</span>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        className="rounded-xl px-3 text-[9px] uppercase font-black tracking-widest h-8"
                        onClick={() => handleConfirmDelete(review.id)}
                      >
                        Yes
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="rounded-xl px-3 text-[9px] uppercase font-black tracking-widest h-8 bg-white"
                        onClick={() => setDeleteConfirmationId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 h-10 w-10 shrink-0"
                      onClick={() => handleDeleteClick(review.id)}
                      title="Delete Review"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {filteredReviews.length === 0 && (
              <div className="text-center py-20 text-gray-300">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="font-black uppercase tracking-widest text-xs opacity-50">No matching reviews found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
