import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Target, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface TemplatePricingPanelProps {
  baseCost: number;
  retailPrice: number;
  sellingPrice: number;
  currencySymbol: string;
  onSellingPriceChange: (price: number) => void;
}

export const TemplatePricingPanel: React.FC<TemplatePricingPanelProps> = ({
  baseCost,
  retailPrice,
  sellingPrice,
  currencySymbol,
  onSellingPriceChange,
}) => {
  const profit = sellingPrice > baseCost ? sellingPrice - baseCost : 0;
  const profitMargin = sellingPrice > 0 && baseCost > 0 
    ? ((sellingPrice - baseCost) / sellingPrice * 100).toFixed(1)
    : '0';
  
  const marginStatus = parseFloat(profitMargin) >= 40 
    ? 'excellent' 
    : parseFloat(profitMargin) >= 25 
    ? 'good' 
    : parseFloat(profitMargin) >= 15 
    ? 'fair' 
    : 'low';

  const marginColor = {
    excellent: 'text-green-600 bg-green-50 border-green-200',
    good: 'text-blue-600 bg-blue-50 border-blue-200',
    fair: 'text-amber-600 bg-amber-50 border-amber-200',
    low: 'text-red-600 bg-red-50 border-red-200',
  }[marginStatus];

  const marginLabel = {
    excellent: 'Excellent Margin',
    good: 'Good Margin',
    fair: 'Fair Margin',
    low: 'Low Margin',
  }[marginStatus];

  return (
    <div className="space-y-4">
      {/* Pricing Flow Visualization */}
      <div className="grid grid-cols-3 gap-3">
        {/* Base Cost */}
        <Card className="p-4 bg-gray-50 border-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-gray-200 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-gray-400">Base Cost</p>
              <p className="text-[10px] text-gray-500">Printify</p>
            </div>
          </div>
          <p className="text-2xl font-black text-gray-700">
            {currencySymbol}{baseCost.toFixed(2)}
          </p>
          <p className="text-[10px] text-gray-500 mt-1">Minimum variant cost</p>
        </Card>

        {/* Retail Price (Suggested) */}
        <Card className="p-4 bg-blue-50 border-2 border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-blue-200 flex items-center justify-center">
              <Target className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-blue-600">Suggested Retail</p>
              <p className="text-[10px] text-blue-500">Printify</p>
            </div>
          </div>
          <p className="text-2xl font-black text-blue-700">
            {currencySymbol}{retailPrice.toFixed(2)}
          </p>
          <p className="text-[10px] text-blue-600 mt-1">Printify recommendation</p>
        </Card>

        {/* Your Selling Price */}
        <Card className={`p-4 border-2 ${marginColor}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${marginColor}`}>
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className={`text-[9px] font-black uppercase ${marginColor}`}>Your Price</p>
              <p className={`text-[10px] ${marginColor}`}>Customer pays</p>
            </div>
          </div>
          <p className={`text-2xl font-black ${marginColor}`}>
            {currencySymbol}{sellingPrice.toFixed(2)}
          </p>
          <p className={`text-[10px] mt-1 font-bold ${marginColor}`}>{marginLabel}</p>
        </Card>
      </div>

      {/* Edit Selling Price */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-gray-400">
            Default Selling Price
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">
              {currencySymbol}
            </span>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={sellingPrice || ''}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                onSellingPriceChange(isNaN(value) ? 0 : Math.max(0, value));
              }}
              className="pl-8 h-11 text-base font-bold"
              placeholder="0.00"
            />
          </div>
          <p className="text-[10px] text-gray-500">
            This price applies to all variants by default. Override per variant in the Variants tab.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-gray-400">
            Profit Analysis
          </Label>
          <div className="bg-gray-50 rounded-xl border p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Profit per Item:</span>
              <span className="text-sm font-black text-gray-800">
                {currencySymbol}{profit.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Profit Margin:</span>
              <Badge className={`${marginColor} text-xs font-bold`}>
                {profitMargin}%
              </Badge>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full transition-all ${
                  marginStatus === 'excellent' ? 'bg-green-500' :
                  marginStatus === 'good' ? 'bg-blue-500' :
                  marginStatus === 'fair' ? 'bg-amber-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${Math.min(parseFloat(profitMargin), 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Margin Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="space-y-2">
            <p className="text-xs font-bold text-blue-800">Pricing Guidelines</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
              <div className="bg-white rounded px-2 py-1.5 border border-blue-100">
                <span className="text-green-600 font-bold">40%+</span>
                <span className="text-gray-600 ml-1">Excellent</span>
              </div>
              <div className="bg-white rounded px-2 py-1.5 border border-blue-100">
                <span className="text-blue-600 font-bold">25-40%</span>
                <span className="text-gray-600 ml-1">Good</span>
              </div>
              <div className="bg-white rounded px-2 py-1.5 border border-blue-100">
                <span className="text-amber-600 font-bold">15-25%</span>
                <span className="text-gray-600 ml-1">Fair</span>
              </div>
              <div className="bg-white rounded px-2 py-1.5 border border-blue-100">
                <span className="text-red-600 font-bold">&lt;15%</span>
                <span className="text-gray-600 ml-1">Low</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
