import React from 'react';
import { useShop } from '@/context/ShopContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Globe, Shield, CreditCard, MessageSquare, Bell, User, Truck, ShieldCheck, RotateCcw, Zap, Gift, BadgeCheck, CreditCard as CreditCardIcon, Plus, Trash2, Instagram, Facebook, Youtube, Twitter, Linkedin, Upload, X, Loader2 } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FeatureIcon, SocialLink, StoreFeature } from '@/types';
import { DashboardInstallCard } from '@/components/pwa/DashboardInstallCard';
import { optimizeImage } from '@/lib/imageUtils';

export const GeneralSettings: React.FC = () => {
  const { settings, updateSettings } = useShop();

  const featureIconOptions: { value: FeatureIcon; label: string }[] = [
    { value: 'truck', label: 'Free Shipping / Delivery' },
    { value: 'shield', label: 'Secure Checkout' },
    { value: 'message-circle', label: 'Quick Support' },
    { value: 'rotate-ccw', label: 'Easy Returns' },
    { value: 'zap', label: 'Fast Service' },
    { value: 'credit-card', label: 'Flexible Payments' },
    { value: 'gift', label: 'Special Offers' },
    { value: 'badge-check', label: 'Trusted Brand' },
  ];

  const getSocialPreviewIcon = (platform: string) => {
    switch (platform.trim().toLowerCase()) {
      case 'instagram':
        return Instagram;
      case 'facebook':
        return Facebook;
      case 'youtube':
        return Youtube;
      case 'twitter':
      case 'x':
        return Twitter;
      case 'linkedin':
        return Linkedin;
      case 'whatsapp':
        return WhatsAppIcon;
      default:
        return Globe;
    }
  };

  const handleUpdate = (updates: any) => {
    updateSettings(updates);
  };

  const updateFeature = (id: string, updates: Partial<StoreFeature>) => {
    handleUpdate({
      trustFeatures: settings.trustFeatures.map((feature) => (feature.id === id ? { ...feature, ...updates } : feature)),
    });
  };

  const removeFeature = (id: string) => {
    handleUpdate({
      trustFeatures: settings.trustFeatures.filter((feature) => feature.id !== id),
    });
  };

  const addFeature = () => {
    handleUpdate({
      trustFeatures: [
        ...settings.trustFeatures,
        {
          id: `feature-${Date.now()}`,
          title: 'New Feature',
          subtitle: '',
          icon: 'badge-check',
          enabled: true,
        },
      ],
    });
  };

  const updateSocialLink = (id: string, updates: Partial<SocialLink>) => {
    handleUpdate({
      socialLinks: settings.socialLinks.map((link) => (link.id === id ? { ...link, ...updates } : link)),
    });
  };

  const removeSocialLink = (id: string) => {
    handleUpdate({
      socialLinks: settings.socialLinks.filter((link) => link.id !== id),
    });
  };

  const addSocialLink = () => {
    handleUpdate({
      socialLinks: [
        ...settings.socialLinks,
        {
          id: `social-${Date.now()}`,
          platform: 'Custom',
          url: '',
          enabled: true,
        },
      ],
    });
  };

  return (
    <div className="space-y-4 md:space-y-8 pb-10">
      <div className="pb-3 md:pb-6 border-b border-gray-100 px-3 md:px-0">
        <h1 className="text-xl md:text-3xl font-black uppercase tracking-tight">General Settings</h1>
        <p className="text-[8px] md:text-xs text-gray-500 uppercase font-bold opacity-60">Manage your store's core identity and communication routes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        <div className="lg:col-span-2 space-y-4 md:space-y-8">
          <Card className="border-none shadow-sm rounded-2xl md:rounded-3xl overflow-hidden">
            <CardHeader className="p-4 md:p-6">
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
                <CardTitle className="text-base md:text-xl font-black uppercase tracking-tight">Basic Information</CardTitle>
              </div>
              <CardDescription className="text-[10px] md:text-xs">Primary details displayed to your customers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6 pt-0">
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">Store Name</Label>
                <Input 
                  value={settings.shopName}
                  onChange={(e) => handleUpdate({ shopName: e.target.value })}
                  className="rounded-xl h-11 md:h-12 text-sm"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">Store Description</Label>
                <Textarea 
                  value={settings.shopDescription}
                  onChange={(e) => handleUpdate({ shopDescription: e.target.value })}
                  className="rounded-2xl min-h-[100px] text-sm"
                />
              </div>

              <div className="pt-4 border-t border-gray-50">
                <Label className="text-[10px] font-black uppercase text-gray-400 pl-1 mb-3 block">Currency Settings</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-[9px] uppercase text-gray-400 pl-1">Currency Code (ISO)</Label>
                    <Input 
                      value={settings.currency}
                      onChange={(e) => handleUpdate({ currency: e.target.value.toUpperCase() })}
                      placeholder="USD"
                      className="rounded-xl h-10 text-sm"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[9px] uppercase text-gray-400 pl-1">Currency Symbol</Label>
                    <Input 
                      value={settings.currencySymbol}
                      onChange={(e) => handleUpdate({ currencySymbol: e.target.value })}
                      placeholder="$"
                      className="rounded-xl h-10 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50">
                <Label className="text-[10px] font-black uppercase text-gray-400 pl-1 mb-3 block">Analytics & Verification</Label>
                <div className="grid gap-2">
                  <Label className="text-[9px] uppercase text-gray-400 pl-1">Google Analytics Measurement ID</Label>
                  <Input
                    value={settings.analytics.googleAnalyticsId}
                    onChange={(e) => handleUpdate({
                      analytics: {
                        ...settings.analytics,
                        googleAnalyticsId: e.target.value.trim(),
                      },
                    })}
                    placeholder="G-XXXXXXXXXX"
                    className="rounded-xl h-10 text-sm"
                  />
                  <p className="text-[10px] text-gray-500 italic px-1">Paste a GA4 Measurement ID to enable analytics tracking across the storefront.</p>
                </div>
                <div className="grid gap-2 mt-4">
                  <Label className="text-[9px] uppercase text-gray-400 pl-1">Google Search Console Verification</Label>
                  <Input
                    value={settings.analytics.googleSearchConsoleId}
                    onChange={(e) => handleUpdate({
                      analytics: {
                        ...settings.analytics,
                        googleSearchConsoleId: e.target.value.trim(),
                      },
                    })}
                    placeholder="Paste verification code (e.g. abc123XYZ...)"
                    className="rounded-xl h-10 text-sm"
                  />
                  <p className="text-[10px] text-gray-500 italic px-1">Paste the verification code from Google Search Console → Settings → Ownership verification → HTML tag. Only the content value is needed.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="p-5 md:p-6">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-gray-400" />
                <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">Order Flow & WhatsApp</CardTitle>
              </div>
              <CardDescription className="text-xs">Decide how customers complete their purchases.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-5 md:p-6 pt-0">
              <div className="grid gap-4">
                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Order Completion Route</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'WEBSITE', label: 'Website Only', desc: 'Orders in dashboard' },
                    { id: 'WHATSAPP', label: 'WhatsApp Only', desc: 'Direct chat orders' },
                    { id: 'BOTH', label: 'Both Options', desc: 'Choice at checkout' }
                  ].map(option => (
                    <button
                      key={option.id}
                      onClick={() => handleUpdate({ orderMode: option.id })}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${settings.orderMode === option.id ? 'border-black bg-black text-white' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                    >
                      <div className="font-bold text-sm leading-tight">{option.label}</div>
                      <div className="text-[10px] opacity-70 mt-1 leading-tight">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {(settings.orderMode === 'WHATSAPP' || settings.orderMode === 'BOTH') && (
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">WhatsApp Number</Label>
                  <Input 
                    value={settings.whatsappNumber}
                    onChange={(e) => handleUpdate({ whatsappNumber: e.target.value })}
                    placeholder="+1234567890"
                    className="rounded-xl h-11 md:h-12 text-sm"
                  />
                  <p className="text-[10px] text-gray-500 italic px-1">Include country code without special characters.</p>
                </div>
              )}

              <div className="grid gap-4 border-t pt-6">
                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Required Customer Contact Field</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'phone', label: 'Phone Number Required', desc: 'Customer phone is mandatory, email is optional.' },
                    { id: 'email', label: 'Email Address Required', desc: 'Customer email is mandatory, phone is optional.' }
                  ].map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleUpdate({ contactRequired: option.id })}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${(settings.contactRequired || 'phone') === option.id ? 'border-black bg-black text-white' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                    >
                      <div className="font-bold text-sm leading-tight">{option.label}</div>
                      <div className="text-[10px] opacity-70 mt-1 leading-tight">{option.desc}</div>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-500 italic px-1">Whichever field is selected will become mandatory at checkout, while the other remains optional. Both fields will always be visible to customers.</p>
              </div>

              {/* Phone Format Selection */}
              <div className="grid gap-4 border-t pt-6">
                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Allowed Customer Phone Format</Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'pakistan', label: '🇵🇰 Pakistan', desc: '+92 3xx...' },
                    { id: 'usa', label: '🇺🇸 USA/Canada', desc: '+1 (xxx)...' },
                    { id: 'uk', label: '🇬🇧 UK Mobile', desc: '+44 7xxx...' },
                    { id: 'any', label: '🌐 Any Global', desc: '10-15 digits' },
                    { id: 'custom', label: '⚙️ Custom Format', desc: 'Specify placeholder' }
                  ].map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleUpdate({ phoneFormat: option.id })}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${(settings.phoneFormat || 'pakistan') === option.id ? 'border-black bg-black text-white' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                    >
                      <div className="font-bold text-xs leading-none">{option.label}</div>
                      <div className="text-[8px] opacity-70 mt-1.5 leading-none">{option.desc}</div>
                    </button>
                  ))}
                </div>

                {settings.phoneFormat === 'custom' && (
                  <div className="grid gap-2 animate-in fade-in duration-200">
                    <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">Custom Format Placeholder (e.g. +13055550199)</Label>
                    <Input 
                      value={settings.customPhonePlaceholder || ''}
                      onChange={(e) => handleUpdate({ customPhonePlaceholder: e.target.value })}
                      placeholder="+13055550199"
                      className="rounded-xl h-11 md:h-12 text-sm"
                    />
                    <p className="text-[10px] text-gray-500 italic px-1">Write an example of the exact format you want to enforce. Customers will be forced to match the digits count and prefix structure of this format.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="p-5 md:p-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-gray-400" />
                <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">Global Trust Features</CardTitle>
              </div>
              <CardDescription className="text-xs">Manage the feature icons shown above the footer across all themes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-5 md:p-6 pt-0">
              {settings.trustFeatures.map((feature) => (
                <div key={feature.id} className="space-y-4 rounded-3xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">{feature.title || 'Feature Item'}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">Shown above footer</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={feature.enabled} onCheckedChange={(checked) => updateFeature(feature.id, { enabled: checked })} />
                      <Button variant="ghost" size="icon" className="rounded-xl text-red-500 hover:bg-red-50" onClick={() => removeFeature(feature.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-[9px] uppercase text-gray-400 pl-1">Title</Label>
                      <Input value={feature.title} onChange={(e) => updateFeature(feature.id, { title: e.target.value })} className="rounded-xl h-10 text-sm" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[9px] uppercase text-gray-400 pl-1">Icon</Label>
                      <Select value={feature.icon} onValueChange={(value) => updateFeature(feature.id, { icon: value as FeatureIcon })}>
                        <SelectTrigger className="rounded-xl h-10 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {featureIconOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[9px] uppercase text-gray-400 pl-1">Short Description</Label>
                    <Input
                      value={feature.subtitle || ''}
                      onChange={(e) => updateFeature(feature.id, { subtitle: e.target.value })}
                      placeholder="Optional small text below the title"
                      className="rounded-xl h-10 text-sm"
                    />
                  </div>
                </div>
              ))}
              <Button variant="outline" className="rounded-2xl h-11 font-black uppercase tracking-widest text-[10px]" onClick={addFeature}>
                <Plus className="h-4 w-4 mr-2" /> Add Custom Feature
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="p-5 md:p-6">
              <div className="flex items-center gap-3">
                <Instagram className="h-5 w-5 text-gray-400" />
                <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">Social Media Links</CardTitle>
              </div>
              <CardDescription className="text-xs">Add the social icons and links you want to display in the storefront footer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-5 md:p-6 pt-0">
              {settings.socialLinks.map((link) => {
                const PreviewIcon = getSocialPreviewIcon(link.platform);
                return (
                  <div key={link.id} className="space-y-4 rounded-3xl border border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-50">
                          <PreviewIcon className="h-4 w-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{link.platform || 'Social Link'}</p>
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Footer icon link</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={link.enabled} onCheckedChange={(checked) => updateSocialLink(link.id, { enabled: checked })} />
                        <Button variant="ghost" size="icon" className="rounded-xl text-red-500 hover:bg-red-50" onClick={() => removeSocialLink(link.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className="text-[9px] uppercase text-gray-400 pl-1">Platform Name</Label>
                        <Input value={link.platform} onChange={(e) => updateSocialLink(link.id, { platform: e.target.value })} className="rounded-xl h-10 text-sm" />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[9px] uppercase text-gray-400 pl-1">Profile URL</Label>
                        <Input value={link.url} onChange={(e) => updateSocialLink(link.id, { url: e.target.value })} placeholder="https://..." className="rounded-xl h-10 text-sm" />
                      </div>
                    </div>
                  </div>
                );
              })}
              <Button variant="outline" className="rounded-2xl h-11 font-black uppercase tracking-widest text-[10px]" onClick={addSocialLink}>
                <Plus className="h-4 w-4 mr-2" /> Add Social Link
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-gray-400" />
                <CardTitle>Payment Gateways</CardTitle>
              </div>
              <CardDescription>Configure and enable payment options for your checkout.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Stripe */}
              <div className="space-y-4 p-4 border border-gray-100 rounded-3xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold">Stripe</h4>
                    <p className="text-xs text-gray-500">Credit & Debit Cards</p>
                  </div>
                  <Switch 
                    checked={settings.paymentSettings?.stripe?.enabled || false}
                    onCheckedChange={(checked) => handleUpdate({ 
                      paymentSettings: { ...settings.paymentSettings, stripe: { ...settings.paymentSettings?.stripe, enabled: checked } } 
                    })}
                  />
                </div>
                {settings.paymentSettings?.stripe?.enabled && (
                  <div className="grid md:grid-cols-2 gap-4 pt-2">
                    <div className="grid gap-2">
                      <Label className="text-[10px] uppercase font-black opacity-50">Publishable Key</Label>
                      <Input 
                        value={settings.paymentSettings?.stripe?.apiKey || ''}
                        onChange={(e) => handleUpdate({ 
                          paymentSettings: { ...settings.paymentSettings, stripe: { ...settings.paymentSettings?.stripe, apiKey: e.target.value } } 
                        })}
                        placeholder="pk_test_..."
                        className="rounded-xl h-10 text-xs"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] uppercase font-black opacity-50">Secret Key</Label>
                      <Input 
                        type="password"
                        value={settings.paymentSettings?.stripe?.secretKey || ''}
                        onChange={(e) => handleUpdate({ 
                          paymentSettings: { ...settings.paymentSettings, stripe: { ...settings.paymentSettings?.stripe, secretKey: e.target.value } } 
                        })}
                        placeholder="sk_test_..."
                        className="rounded-xl h-10 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* PayPal */}
              <div className="space-y-4 p-4 border border-gray-100 rounded-3xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold">PayPal</h4>
                    <p className="text-xs text-gray-500">Secure digital wallet payments</p>
                  </div>
                  <Switch 
                    checked={settings.paymentSettings?.paypal?.enabled || false}
                    onCheckedChange={(checked) => handleUpdate({ 
                      paymentSettings: { ...settings.paymentSettings, paypal: { ...settings.paymentSettings?.paypal, enabled: checked } } 
                    })}
                  />
                </div>
                {settings.paymentSettings?.paypal?.enabled && (
                  <div className="grid gap-4 pt-2">
                    <div className="grid gap-2">
                      <Label className="text-[10px] uppercase font-black opacity-50">Client ID</Label>
                      <Input 
                        value={settings.paymentSettings?.paypal?.clientId || ''}
                        onChange={(e) => handleUpdate({ 
                          paymentSettings: { ...settings.paymentSettings, paypal: { ...settings.paymentSettings?.paypal, clientId: e.target.value } } 
                        })}
                        placeholder="Client ID..."
                        className="rounded-xl h-10 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bank Transfer */}
              <div className="space-y-4 p-5 border border-gray-100 rounded-[2rem] bg-white shadow-sm">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-50 p-2 rounded-2xl">
                      <CreditCardIcon className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-black uppercase text-sm tracking-tight">Bank Transfer & Digital Wallets</h4>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest leading-none mt-0.5">Semi-automatic verification of receipts</p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings.paymentSettings?.bankTransfer?.enabled || false}
                    onCheckedChange={(checked) => handleUpdate({ 
                      paymentSettings: { ...settings.paymentSettings, bankTransfer: { ...settings.paymentSettings?.bankTransfer, enabled: checked } } 
                    })}
                  />
                </div>
                {settings.paymentSettings?.bankTransfer?.enabled && (
                  <div className="space-y-5 pt-2 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl">
                      <p className="text-[9px] font-black uppercase tracking-widest text-amber-800 mb-1">💡 Smart Verification Guidance</p>
                      <p className="text-[10px] text-amber-700 leading-relaxed">
                        Our semi-automatic payment verification uses client-side OCR technology. Please enter your account information exactly. This data will be shown to your customer at checkout, and our automated scanner will scan their uploaded receipt for your Bank Name, Account Number, and the Order Total to verify the payment instantly.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">Account Title *</Label>
                        <Input 
                          value={settings.paymentSettings?.bankTransfer?.accountTitle || ''}
                          onChange={(e) => handleUpdate({ 
                            paymentSettings: { 
                              ...settings.paymentSettings, 
                              bankTransfer: { ...settings.paymentSettings?.bankTransfer, accountTitle: e.target.value } 
                            } 
                          })}
                          placeholder="e.g. Aura Bloom Cosmetics"
                          className="rounded-xl h-11 text-sm border-gray-200"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">Bank or Wallet Name *</Label>
                        <div className="flex gap-2">
                          <Select 
                            value={settings.paymentSettings?.bankTransfer?.bankName || ''} 
                            onValueChange={(value) => handleUpdate({ 
                              paymentSettings: { 
                                ...settings.paymentSettings, 
                                bankTransfer: { ...settings.paymentSettings?.bankTransfer, bankName: value } 
                              } 
                            })}
                          >
                            <SelectTrigger className="rounded-xl h-11 text-sm border-gray-200 w-full">
                              <SelectValue placeholder="Select bank/wallet" />
                            </SelectTrigger>
                            <SelectContent>
                              {['Meezan Bank', 'SadaPay', 'EasyPaisa', 'JazzCash', 'NayaPay', 'HBL', 'Bank Al Habib', 'UBL', 'MCB', 'Allied Bank', 'Standard Chartered', 'Dubai Islamic'].map((bank) => (
                                <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                              ))}
                              <SelectItem value="Custom">Custom / Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {settings.paymentSettings?.bankTransfer?.bankName === 'Custom' && (
                      <div className="grid gap-2 animate-in fade-in duration-200">
                        <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">Enter Custom Bank Name *</Label>
                        <Input 
                          value={settings.paymentSettings?.bankTransfer?.accountDetails || ''}
                          onChange={(e) => handleUpdate({ 
                            paymentSettings: { 
                              ...settings.paymentSettings, 
                              bankTransfer: { 
                                ...settings.paymentSettings?.bankTransfer, 
                                accountDetails: e.target.value,
                                bankName: 'Custom'
                              } 
                            } 
                          })}
                          placeholder="e.g. Bank Al-Falah"
                          className="rounded-xl h-11 text-sm border-gray-200"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">Account or Wallet Number *</Label>
                        <Input 
                          value={settings.paymentSettings?.bankTransfer?.accountNumber || ''}
                          onChange={(e) => handleUpdate({ 
                            paymentSettings: { 
                              ...settings.paymentSettings, 
                              bankTransfer: { ...settings.paymentSettings?.bankTransfer, accountNumber: e.target.value } 
                            } 
                          })}
                          placeholder="e.g. 0283-01048-2830"
                          className="rounded-xl h-11 text-sm border-gray-200 font-mono"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">IBAN (Optional)</Label>
                        <Input 
                          value={settings.paymentSettings?.bankTransfer?.iban || ''}
                          onChange={(e) => handleUpdate({ 
                            paymentSettings: { 
                              ...settings.paymentSettings, 
                              bankTransfer: { ...settings.paymentSettings?.bankTransfer, iban: e.target.value.toUpperCase() } 
                            } 
                          })}
                          placeholder="e.g. PK22MEZN000283010482830"
                          className="rounded-xl h-11 text-sm border-gray-200 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">QR Code (Optional)</Label>
                      <div className="flex gap-4 items-center">
                        <div className="flex-1 relative">
                          <Input 
                            placeholder="QR Code Image URL or upload" 
                            value={settings.paymentSettings?.bankTransfer?.qrCodeUrl || ''}
                            onChange={(e) => handleUpdate({ 
                              paymentSettings: { 
                                ...settings.paymentSettings, 
                                bankTransfer: { ...settings.paymentSettings?.bankTransfer, qrCodeUrl: e.target.value } 
                              } 
                            })}
                            className="rounded-xl h-11 text-sm border-gray-200 pr-10"
                          />
                          <label className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                            <Upload className="h-4 w-4 text-gray-400" />
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  const optimized = await optimizeImage(file, 600, 600);
                                  handleUpdate({
                                    paymentSettings: {
                                      ...settings.paymentSettings,
                                      bankTransfer: {
                                        ...settings.paymentSettings?.bankTransfer,
                                        qrCodeUrl: optimized
                                      }
                                    }
                                  });
                                } catch (error) {
                                  console.error('Failed to compress QR Code image:', error);
                                }
                              }} 
                            />
                          </label>
                        </div>
                        {settings.paymentSettings?.bankTransfer?.qrCodeUrl && (
                          <div className="relative group shrink-0">
                            <div className="w-11 h-11 border rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center shadow-sm">
                              <img src={settings.paymentSettings?.bankTransfer?.qrCodeUrl} className="max-w-full max-h-full object-cover" />
                            </div>
                            <button 
                              onClick={() => handleUpdate({ 
                                paymentSettings: { 
                                  ...settings.paymentSettings, 
                                  bankTransfer: { ...settings.paymentSettings?.bankTransfer, qrCodeUrl: '' } 
                                } 
                              })}
                              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-2 w-2" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">Payment Instructions / Notes</Label>
                      <Textarea 
                        value={settings.paymentSettings?.bankTransfer?.instructions || ''}
                        onChange={(e) => handleUpdate({ 
                          paymentSettings: { 
                            ...settings.paymentSettings, 
                            bankTransfer: { ...settings.paymentSettings?.bankTransfer, instructions: e.target.value } 
                          } 
                        })}
                        placeholder="e.g. Please transfer the total amount to the provided details and upload a clear screenshot of your confirmation screen or receipt. Verification will take less than 10 seconds."
                        className="rounded-2xl min-h-[80px] text-sm border-gray-200"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* COD */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-3xl">
                <div>
                  <h4 className="font-bold">Cash on Delivery</h4>
                  <p className="text-xs text-gray-500">Complete payment upon package arrival.</p>
                </div>
                <Switch 
                  checked={settings.paymentSettings?.cod?.enabled || false}
                  onCheckedChange={(checked) => handleUpdate({ 
                    paymentSettings: { ...settings.paymentSettings, cod: { ...settings.paymentSettings?.cod, enabled: checked } } 
                  })}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-gray-400" />
                <CardTitle>Store Security</CardTitle>
              </div>
              <CardDescription>Privacy settings and store visibility.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border border-gray-100 rounded-2xl space-y-4">
                <h4 className="font-bold text-sm uppercase tracking-tight">Admin Authentication</h4>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">Reset Dashboard Password</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="password"
                      placeholder="Enter new password"
                      className="rounded-xl h-10 text-xs"
                      onBlur={(e) => {
                        if (e.target.value) {
                          // In a real app, this would be a real persistence call
                          alert('Password would be updated in production.');
                        }
                      }}
                    />
                    <Button variant="outline" className="rounded-xl h-10 px-4 text-[10px] font-black uppercase">Update</Button>
                  </div>
                  <p className="text-[10px] text-gray-500 italic">This will be connected to secure admin authentication.</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div>
                  <h4 className="font-bold">Maintenance Mode</h4>
                  <p className="text-xs text-gray-500">Temporarily hide your storefront from customers.</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div>
                  <h4 className="font-bold">Age Verification</h4>
                  <p className="text-xs text-gray-500">Ask customers to verify their age before entering.</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-gray-400" />
                <CardTitle>Checkout Preferences</CardTitle>
              </div>
              <CardDescription>Control how payments and orders are handled.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div>
                  <h4 className="font-bold">Guest Checkout</h4>
                  <p className="text-xs text-gray-500">Allow customers to buy without an account.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div>
                  <h4 className="font-bold">Order Tracking</h4>
                  <p className="text-xs text-gray-500">Send order status updates automatically.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <DashboardInstallCard />

          <Card className="border-none shadow-sm rounded-3xl bg-black text-white p-2">
            <CardHeader>
              <CardTitle className="text-lg">Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm opacity-70">
                Facing issues with your store configuration? Check our documentation or reach out.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl">
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-xs font-bold">Support Chat</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl">
                  <Bell className="h-4 w-4" />
                  <span className="text-xs font-bold">What's New</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl">
                  <User className="h-4 w-4" />
                  <span className="text-xs font-bold">Your Success Manager</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl p-6">
            <h3 className="text-lg font-bold mb-4">Quick Facts</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-gray-400 uppercase tracking-widest font-black">Store Domain</Label>
                <p className="font-mono text-sm underline cursor-pointer">{window.location.host || 'Not deployed yet'}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-400 uppercase tracking-widest font-black">Plan</Label>
                <p className="text-sm font-bold text-gray-700">Custom Deployment</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
