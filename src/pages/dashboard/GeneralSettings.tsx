import React from 'react';
import { useShop } from '@/context/ShopContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Globe, Shield, CreditCard, MessageSquare, Bell, User, Truck, ShieldCheck, RotateCcw, Zap, Gift, BadgeCheck, CreditCard as CreditCardIcon, Plus, Trash2, Instagram, Facebook, Youtube, Twitter, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FeatureIcon, SocialLink, StoreFeature } from '@/types';
import { DashboardInstallCard } from '@/components/pwa/DashboardInstallCard';

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
                <Label className="text-[10px] font-black uppercase text-gray-400 pl-1 mb-3 block">Analytics</Label>
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
              <div className="space-y-4 p-4 border border-gray-100 rounded-3xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold">Bank Transfer</h4>
                    <p className="text-xs text-gray-500">Manual verification of bank deposits</p>
                  </div>
                  <Switch 
                    checked={settings.paymentSettings?.bankTransfer?.enabled || false}
                    onCheckedChange={(checked) => handleUpdate({ 
                      paymentSettings: { ...settings.paymentSettings, bankTransfer: { ...settings.paymentSettings?.bankTransfer, enabled: checked } } 
                    })}
                  />
                </div>
                {settings.paymentSettings?.bankTransfer?.enabled && (
                  <div className="grid gap-2 pt-2">
                    <Label className="text-[10px] uppercase font-black opacity-50">Account Details</Label>
                    <Textarea 
                      value={settings.paymentSettings?.bankTransfer?.accountDetails || ''}
                      onChange={(e) => handleUpdate({ 
                        paymentSettings: { ...settings.paymentSettings, bankTransfer: { ...settings.paymentSettings?.bankTransfer, accountDetails: e.target.value } } 
                      })}
                      placeholder="Enter Bank Name, Account Number, etc."
                      className="rounded-xl min-h-[80px] text-xs"
                    />
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
