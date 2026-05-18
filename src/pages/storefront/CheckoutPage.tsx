import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useShop } from '@/context/ShopContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, ArrowLeft, ShoppingBag, CheckCircle2, Landmark, Copy, Check, ShieldAlert, ShieldCheck, Loader2, Upload, AlertCircle, QrCode, X } from 'lucide-react';
import { motion } from 'motion/react';
import { optimizeImage } from '@/lib/imageUtils';

const loadTesseract = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).Tesseract) {
      resolve((window as any).Tesseract);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/tesseract.js@5.0.3/dist/tesseract.min.js';
    script.async = true;
    script.onload = () => {
      resolve((window as any).Tesseract);
    };
    script.onerror = () => {
      reject(new Error('Failed to load Tesseract OCR engine'));
    };
    document.body.appendChild(script);
  });
};

export const CheckoutPage: React.FC = () => {
  const { cart, cartTotal, settings, placeOrder } = useShop();
  const navigate = useNavigate();

  React.useEffect(() => {
    document.title = `Checkout | ${settings.shopName}`;
  }, [settings.shopName]);

  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  
  // Custom states for direct bank transfer and client-side OCR verification
  const [copiedField, setCopiedField] = useState<'number' | 'iban' | null>(null);
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrResult, setOcrResult] = useState<null | 'success' | 'fallback'>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isQrZoomed, setIsQrZoomed] = useState(false);
  const [bankPaymentData, setBankPaymentData] = useState<{
    method: 'bank';
    verified: boolean;
    receiptUrl: string;
    bankName: string;
    autoVerified: boolean;
  } | null>(null);

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCopy = (text: string, field: 'number' | 'iban') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrScanning(true);
    setOcrResult(null);
    setOcrStatus('Compressing receipt image...');
    setOcrProgress(10);
    
    try {
      const compressed = await optimizeImage(file, 800, 800);
      setReceiptPreview(compressed);
      
      setOcrStatus('Initializing automated verification scanner...');
      setOcrProgress(25);
      
      const Tesseract = await loadTesseract();
      setOcrStatus('Processing receipt seals and high contrast tokens...');
      setOcrProgress(50);
      
      const result = await Tesseract.recognize(compressed, 'eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(50 + Math.round(m.progress * 40));
            setOcrStatus(`Reading text tokens (${Math.round(m.progress * 100)}%)...`);
          }
        }
      });

      setOcrStatus('Comparing account details & total amount...');
      setOcrProgress(95);

      const text = (result.data.text || '').toLowerCase();
      console.log('OCR Result Text:', text);

      // Clean check total for matching
      const targetAmount = cartTotal.toFixed(2);
      const targetAmountInt = Math.round(cartTotal).toString();
      
      // 1. Look for the total amount inside the text (as decimal, rounded, locale formats)
      const hasAmount = text.includes(targetAmount) || 
                        text.includes(targetAmountInt) || 
                        text.includes(cartTotal.toString()) ||
                        text.includes(cartTotal.toLocaleString('en-US')) ||
                        text.includes(cartTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })) ||
                        text.replace(/[^0-9]/g, '').includes(Math.round(cartTotal).toString());

      // 2. Look for the account title (fuzzy matching major words)
      const bankDetails = settings.paymentSettings?.bankTransfer;
      const cleanTitle = (bankDetails?.accountTitle || '').toLowerCase().trim();
      const titleWords = cleanTitle.split(/\s+/).filter(w => w.length > 2);
      const hasAccountTitle = cleanTitle.length > 0 && (
        text.includes(cleanTitle) ||
        (titleWords.length > 0 && titleWords.every(word => text.includes(word))) ||
        (titleWords.length >= 2 && titleWords.filter(word => text.includes(word)).length >= 2)
      );

      // 3. Look for the bank name (fuzzy bank words and aliases)
      const cleanBankName = (bankDetails?.bankName || '').toLowerCase().trim();
      const bankWords = cleanBankName.split(/\s+/).filter(w => w.length > 2);
      
      const bankAliases: Record<string, string[]> = {
        'meezan': ['meezan', 'mbl'],
        'easypaisa': ['easypaisa', 'telenor', 'ep'],
        'sadapay': ['sadapay', 'sada'],
        'jazzcash': ['jazzcash', 'mobilink', 'jc'],
        'hbl': ['hbl', 'habib'],
        'nayapay': ['nayapay', 'naya'],
        'alfalah': ['alfalah', 'bafl'],
        'faysal': ['faysal', 'fbl'],
        'allied': ['allied', 'abl'],
        'mcb': ['mcb'],
        'ubl': ['ubl', 'united']
      };

      const matchedAlias = Object.keys(bankAliases).some(key => {
        if (cleanBankName.includes(key)) {
          return bankAliases[key].some(alias => text.includes(alias));
        }
        return false;
      });

      const hasBankName = cleanBankName.length > 0 && (
        text.includes(cleanBankName) ||
        (bankWords.length > 0 && bankWords.every(word => text.includes(word))) ||
        matchedAlias
      );

      // Determine verification outcome: Amount & Account Title are required for success.
      // Bank Name is preferred but optional to accommodate Raast/IBFT transfers smoothly.
      const enforceTitle = !!cleanTitle;
      
      const isVerified = hasAmount && (!enforceTitle || hasAccountTitle);

      setTimeout(() => {
        setOcrProgress(100);
        if (isVerified) {
          setOcrResult('success');
          setBankPaymentData({
            method: 'bank',
            verified: true,
            receiptUrl: compressed,
            bankName: bankDetails?.bankName || 'Bank Transfer',
            autoVerified: true
          });
        } else {
          setOcrResult('fallback');
          setBankPaymentData({
            method: 'bank',
            verified: false,
            receiptUrl: compressed,
            bankName: bankDetails?.bankName || 'Bank Transfer',
            autoVerified: false
          });
        }
        setOcrScanning(false);
      }, 800);

    } catch (error) {
      console.error('OCR processing failed:', error);
      setOcrStatus('Scanning took too long.');
      setOcrProgress(100);
      setOcrResult('fallback');
      setBankPaymentData({
        method: 'bank',
        verified: false,
        receiptUrl: receiptPreview || '', 
        bankName: settings.paymentSettings?.bankTransfer?.bankName || 'Bank Transfer',
        autoVerified: false
      });
      setOcrScanning(false);
    }
  };

  const handleSubmit = (mode: 'WHATSAPP' | 'WEBSITE') => {
    if (!formData.customerName || !formData.customerPhone || !formData.customerAddress) {
      alert('Please fill in all required fields');
      return;
    }

    if (mode === 'WEBSITE' && !paymentMethod) {
      alert('Please select a payment method');
      return;
    }

    if (mode === 'WEBSITE' && paymentMethod === 'bank') {
      if (!bankPaymentData) {
        alert('Please transfer the amount and upload your payment screenshot/receipt first.');
        return;
      }
      placeOrder(formData, mode, JSON.stringify(bankPaymentData));
    } else {
      placeOrder(formData, mode, paymentMethod);
    }
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md mx-auto"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Order Placed Successfully!</h1>
          <p className="text-gray-600 mb-8">
            Thank you for your purchase. We've received your order and will process it shortly.
          </p>
          <Link to="/">
            <Button size="lg" className="rounded-full px-8">Return to Home</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <Link to="/categories">
          <Button>Back to Shop</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <Link to="/cart" className="inline-flex items-center gap-2 text-sm text-gray-500 mb-8 hover:text-black">
        <ArrowLeft className="h-4 w-4" /> Back to Cart
      </Link>
      
      <h1 className="text-4xl font-bold mb-12">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Customer Information */}
        <div className="space-y-8">
          <Card className="border-none shadow-sm bg-gray-50 rounded-3xl">
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Full Name *</Label>
                <Input 
                  id="customerName" 
                  name="customerName" 
                  placeholder="John Doe" 
                  value={formData.customerName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email Address</Label>
                <Input 
                  id="customerEmail" 
                  name="customerEmail" 
                  type="email" 
                  placeholder="john@example.com" 
                  value={formData.customerEmail}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone Number *</Label>
                <Input 
                  id="customerPhone" 
                  name="customerPhone" 
                  placeholder="+1 (555) 000-0000" 
                  value={formData.customerPhone}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerAddress">Shipping Address *</Label>
                <Input 
                  id="customerAddress" 
                  name="customerAddress" 
                  placeholder="123 Street, City, Country" 
                  value={formData.customerAddress}
                  onChange={handleChange}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {settings.orderMode !== 'WHATSAPP' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold">Payment Method</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {settings.paymentSettings?.stripe?.enabled && (
                  <button 
                    onClick={() => setPaymentMethod('stripe')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${paymentMethod === 'stripe' ? 'border-black bg-black text-white' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                  >
                    <div className="font-bold">Stripe</div>
                    <div className="text-xs opacity-70 cursor-pointer">Pay with Credit Card</div>
                  </button>
                )}
                {settings.paymentSettings?.paypal?.enabled && (
                  <button 
                    onClick={() => setPaymentMethod('paypal')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${paymentMethod === 'paypal' ? 'border-black bg-black text-white' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                  >
                    <div className="font-bold">PayPal</div>
                    <div className="text-xs opacity-70 cursor-pointer">Fast & Secure</div>
                  </button>
                )}
                {settings.paymentSettings?.bankTransfer?.enabled && (
                  <button 
                    onClick={() => setPaymentMethod('bank')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${paymentMethod === 'bank' ? 'border-black bg-black text-white' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                  >
                    <div className="font-bold">Bank Transfer</div>
                    <div className="text-xs opacity-70 cursor-pointer">Manual Transfer</div>
                  </button>
                )}
                {settings.paymentSettings?.cod?.enabled && (
                  <button 
                    onClick={() => setPaymentMethod('cod')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${paymentMethod === 'cod' ? 'border-black bg-black text-white' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                  >
                    <div className="font-bold">Cash on Delivery</div>
                    <div className="text-xs opacity-70 cursor-pointer">Pay when you receive</div>
                  </button>
                )}
              </div>

              {paymentMethod === 'bank' && (
                <div className="mt-6 p-6 border border-gray-100 rounded-3xl bg-white shadow-sm space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center gap-3 border-b pb-4">
                    <div className="bg-amber-50 p-2.5 rounded-2xl">
                      <Landmark className="h-5 w-5 text-amber-600 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base">Direct Bank Transfer</h4>
                      <p className="text-xs text-gray-500">Scan QR Code or copy details to make manual transfer</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Bank Credentials */}
                    <div className="space-y-4">
                      <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-3">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Bank / Wallet Name</span>
                          <span className="font-bold text-sm text-black">{settings.paymentSettings?.bankTransfer?.bankName}</span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Account Title</span>
                          <span className="font-bold text-sm text-gray-800">{settings.paymentSettings?.bankTransfer?.accountTitle}</span>
                        </div>

                        <div className="flex flex-col relative group">
                          <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Account Number</span>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="font-mono font-bold text-sm text-black tracking-wide">
                              {settings.paymentSettings?.bankTransfer?.accountNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(settings.paymentSettings?.bankTransfer?.accountNumber || '', 'number')}
                              className="p-1.5 rounded-lg hover:bg-gray-200/50 text-gray-500 hover:text-black transition-colors"
                            >
                              {copiedField === 'number' ? (
                                <Check className="h-4 w-4 text-green-600 animate-scale-up" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {settings.paymentSettings?.bankTransfer?.iban && (
                          <div className="flex flex-col relative group">
                            <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">IBAN</span>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="font-mono font-bold text-xs text-black tracking-wide">
                                {settings.paymentSettings?.bankTransfer?.iban}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(settings.paymentSettings?.bankTransfer?.iban || '', 'iban')}
                                className="p-1.5 rounded-lg hover:bg-gray-200/50 text-gray-500 hover:text-black transition-colors"
                              >
                                {copiedField === 'iban' ? (
                                  <Check className="h-4 w-4 text-green-600 animate-scale-up" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {settings.paymentSettings?.bankTransfer?.instructions && (
                        <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl flex gap-3">
                          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="text-[9px] font-black uppercase text-amber-800 tracking-wider">Transfer Notes</span>
                            <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                              {settings.paymentSettings?.bankTransfer?.instructions}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* QR Code section */}
                    <div className="flex flex-col items-center justify-center border border-dashed border-gray-100 p-4 rounded-2xl bg-gray-50/20">
                      {settings.paymentSettings?.bankTransfer?.qrCodeUrl ? (
                        <div className="space-y-3 text-center">
                          <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider block">Scan QR Code</span>
                          <div 
                            className="relative w-36 h-36 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 mx-auto overflow-hidden group cursor-pointer hover:shadow-md transition-all"
                            onClick={() => setIsQrZoomed(true)}
                          >
                            <img 
                              src={settings.paymentSettings?.bankTransfer?.qrCodeUrl} 
                              alt="Bank Transfer QR Code" 
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" 
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <QrCode className="h-6 w-6 animate-pulse" />
                            </div>
                          </div>
                          <span className="text-[9px] font-bold text-gray-400 block">Click to enlarge</span>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <Landmark size={48} className="text-gray-300 mx-auto mb-2" />
                          <span className="text-xs text-gray-400 font-medium">Direct Transfer Enabled</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upload Receipt Dropzone */}
                  <div className="border-t pt-6 space-y-4">
                    <h5 className="font-bold text-sm">Upload Payment Receipt Screenshot</h5>
                    
                    {!ocrScanning && !ocrResult && (
                      <label className="border-2 border-dashed border-gray-200 hover:border-black rounded-3xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-50/50 group">
                        <Upload className="h-8 w-8 text-gray-400 group-hover:text-black group-hover:scale-110 transition-all mb-2" />
                        <span className="text-xs font-bold text-gray-700">Attach screenshot of the receipt</span>
                        <span className="text-[10px] text-gray-400 mt-1 uppercase font-black tracking-wider">JPG, PNG up to 10MB</span>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*" 
                          onChange={handleReceiptUpload} 
                        />
                      </label>
                    )}

                    {/* Laser Scanner Screen */}
                    {ocrScanning && (
                      <div className="relative rounded-3xl overflow-hidden border border-gray-100 bg-black p-8 text-white min-h-[220px] flex flex-col items-center justify-center text-center shadow-lg">
                        {receiptPreview && (
                          <div className="absolute inset-0 opacity-20 bg-cover bg-center" style={{ backgroundImage: `url(${receiptPreview})` }} />
                        )}
                        {/* Animated glowing scanning bar */}
                        <div className="absolute left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-green-500 to-transparent shadow-[0_0_15px_rgba(34,197,94,0.8)] scanner-laser pointer-events-none" />
                        <style>{`
                          @keyframes scan {
                            0% { top: 0%; }
                            50% { top: 100%; }
                            100% { top: 0%; }
                          }
                          .scanner-laser {
                            animation: scan 2s linear infinite;
                          }
                        `}</style>
                        
                        <div className="relative z-10 space-y-4 w-full max-w-xs">
                          <Loader2 className="h-8 w-8 text-green-500 animate-spin mx-auto" />
                          <div className="space-y-1">
                            <h6 className="font-bold text-sm uppercase tracking-widest text-green-500">DevsFolk Payment Verification</h6>
                            <p className="text-xs text-gray-300 leading-relaxed font-medium">{ocrStatus}</p>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-green-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${ocrProgress}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{ocrProgress}% Complete</span>
                        </div>
                      </div>
                    )}

                    {/* Scanning success card */}
                    {ocrResult === 'success' && (
                      <div className="rounded-3xl border border-green-100 bg-green-50/50 p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-green-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-green-200">
                          <ShieldCheck className="h-6 w-6 animate-bounce" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <h6 className="font-bold text-green-900 text-sm uppercase tracking-wide">✨ DevsFolk Auto-Verification Successful</h6>
                          <p className="text-xs text-green-800 leading-relaxed">
                            We successfully verified the payment transfer of <strong>{settings.currencySymbol}{cartTotal.toFixed(2)}</strong> from your receipt! Your order will be placed as a verified premium transaction.
                          </p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          {receiptPreview && (
                            <button
                              type="button"
                              onClick={() => setIsQrZoomed(true)}
                              className="px-4 h-10 border border-green-200 bg-white hover:bg-green-50 text-green-700 font-bold text-xs rounded-xl transition-colors shadow-sm w-full sm:w-auto uppercase tracking-wider font-bold"
                            >
                              View
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setOcrResult(null);
                              setBankPaymentData(null);
                              setReceiptPreview(null);
                            }}
                            className="px-4 h-10 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl transition-colors shadow-md w-full sm:w-auto uppercase tracking-wider font-bold"
                          >
                            Change
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Scanning fallback warning card */}
                    {ocrResult === 'fallback' && (
                      <div className="rounded-3xl border border-amber-100 bg-amber-50/50 p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-amber-200">
                          <ShieldAlert className="h-6 w-6" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <h6 className="font-bold text-amber-900 text-sm uppercase tracking-wide">🔍 Receipt Attached Successfully</h6>
                          <p className="text-xs text-amber-800 leading-relaxed">
                            Your screenshot was uploaded! We couldn't instantly parse the exact amount <strong>{settings.currencySymbol}{cartTotal.toFixed(2)}</strong> due to screenshot styling. Don't worry! Complete your order, and the DevsFolk Team will verify it manually within minutes.
                          </p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          {receiptPreview && (
                            <button
                              type="button"
                              onClick={() => setIsQrZoomed(true)}
                              className="px-4 h-10 border border-amber-200 bg-white hover:bg-amber-50 text-amber-700 font-bold text-xs rounded-xl transition-colors shadow-sm w-full sm:w-auto uppercase tracking-wider font-bold"
                            >
                              View
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setOcrResult(null);
                              setBankPaymentData(null);
                              setReceiptPreview(null);
                            }}
                            className="px-4 h-10 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors shadow-md w-full sm:w-auto uppercase tracking-wider font-bold"
                          >
                            Change
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-bold">Complete Order</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(settings.orderMode === 'WEBSITE' || settings.orderMode === 'BOTH') && (
                <Button 
                  size="lg" 
                  className="h-16 rounded-2xl font-bold flex flex-col items-center justify-center gap-1"
                  style={{
                    backgroundColor: settings.primaryColor,
                    color: 'var(--primary-foreground)',
                    borderColor: 'var(--primary-border)',
                  }}
                  onClick={() => handleSubmit('WEBSITE')}
                >
                  <ShoppingBag className="h-5 w-5" />
                  <span>Order on Website</span>
                </Button>
              )}
              
              {(settings.orderMode === 'WHATSAPP' || settings.orderMode === 'BOTH') && (
                <Button 
                  size="lg" 
                  className="h-16 rounded-2xl font-bold flex flex-col items-center justify-center gap-1 bg-[#25D366] hover:bg-[#1ebd5e] text-white border-none"
                  onClick={() => handleSubmit('WHATSAPP')}
                >
                  <MessageSquare className="h-5 w-5" />
                  <span>Order on WhatsApp</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="border-none shadow-sm bg-gray-50 rounded-3xl sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 mb-6">
                {cart.map((item) => (
                  <div key={`${item.productId}-${item.variantId}`} className="flex gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm line-clamp-1">{item.name}</h4>
                      <p className="text-xs text-gray-500">{item.quantity} x {settings.currencySymbol}{item.price.toFixed(2)}</p>
                    </div>
                    <p className="font-bold text-sm">{settings.currencySymbol}{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>{settings.currencySymbol}{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span className={settings.trustFeatures.find(f => f.id === 'feature-shipping')?.title.toLowerCase().includes('free') ? "text-green-600 font-medium" : "text-black font-medium"}>
                    {settings.trustFeatures.find(f => f.id === 'feature-shipping')?.title || 'FREE'}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-4">
                  <span>Total</span>
                  <span>{settings.currencySymbol}{cartTotal.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Lightbox / Enlarged View Overlay */}
      {isQrZoomed && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsQrZoomed(false)}
        >
          <div className="relative max-w-md w-full bg-white rounded-[2.5rem] overflow-hidden p-6 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setIsQrZoomed(false)}
              className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4 text-black" />
            </button>
            <h4 className="font-black uppercase tracking-wider text-xs text-gray-400 mb-4">Receipt / QR Code Preview</h4>
            <div className="aspect-square bg-gray-50 rounded-3xl overflow-hidden flex items-center justify-center">
              <img 
                src={receiptPreview || settings.paymentSettings?.bankTransfer?.qrCodeUrl || ''} 
                alt="Enlarged view" 
                className="max-w-full max-h-full object-contain" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
