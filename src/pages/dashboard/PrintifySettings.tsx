import React, { useState } from 'react';
import { useShop } from '@/context/ShopContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Key, Eye, Edit, RefreshCw, ShoppingCart, Link, AlertCircle, Save, CheckCircle2, Loader2, Play } from 'lucide-react';

export const PrintifySettings: React.FC = () => {
  const { settings, updateSettings, orders } = useShop();
  
  // Default values fallback
  const printifySettings = settings.printifySettings || {
    enabled: false,
    providerSettings: { apiKey: '', shopId: '' },
    editor: { selected: 'devsfolk', devsfolkEnabled: true, alternativeEnabled: false },
    preview: { selected: 'devsfolk', devsfolkEnabled: true, aiEnabled: false, aiConfig: { provider: 'gemini', apiKey: '', anglesCount: 3 } },
    charges: { designFee: 0, editFee: 0, sizeFees: {}, placementFees: {} }
  };

  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [syncingProducts, setSyncingProducts] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('apis');

  const handleUpdate = (updates: any) => {
    updateSettings({
      printifySettings: {
        ...printifySettings,
        ...updates
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate configuration save
    await new Promise(resolve => setTimeout(resolve, 800));
    setSaving(false);
  };

  const testConnection = async () => {
    if (!printifySettings.providerSettings.apiKey || !printifySettings.providerSettings.shopId) {
      alert('Please fill in both API Key and Shop ID first.');
      return;
    }
    setTestingConnection(true);
    setConnectionStatus('idle');
    await new Promise(resolve => setTimeout(resolve, 1500));
    setTestingConnection(false);
    // Standard basic check on input formatting
    if (printifySettings.providerSettings.apiKey.length > 10 && printifySettings.providerSettings.shopId.length > 2) {
      setConnectionStatus('success');
    } else {
      setConnectionStatus('failed');
    }
  };

  const runManualSync = async () => {
    setSyncingProducts(true);
    setSyncLogs(['[INFO] Initializing catalog sync...', '[INFO] Connecting to Printify Catalog API...']);
    await new Promise(resolve => setTimeout(resolve, 800));
    setSyncLogs(prev => [...prev, '[INFO] Fetched blueprints from Printify (T-Shirt, Sweatshirt, Mug, Hoodies)...']);
    await new Promise(resolve => setTimeout(resolve, 600));
    setSyncLogs(prev => [...prev, '[INFO] Importing size, color, and print area bounding metrics...']);
    await new Promise(resolve => setTimeout(resolve, 800));
    setSyncLogs(prev => [...prev, '[SUCCESS] Sync completed. Database catalog cache populated.']);
    setSyncingProducts(false);
  };

  // Mocking order sync states for dashboard display
  const customPrintOrders = orders.map((o, idx) => ({
    ...o,
    printifyOrderId: idx % 3 === 0 ? null : `pr_ord_${o.id.slice(0, 6)}`,
    printifySyncStatus: idx % 3 === 0 ? 'FAILED' : (idx % 3 === 1 ? 'PENDING' : 'SYNCED'),
    printifyErrorLog: idx % 3 === 0 ? 'API Connection timeout: Printify host unreachable.' : null
  }));

  return (
    <div className="space-y-4 md:space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 md:pb-6 border-b border-gray-100 px-3 md:px-0 gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-black uppercase tracking-tight">Printify Integration</h1>
          <p className="text-[8px] md:text-xs text-gray-500 uppercase font-bold opacity-60">Manage your print-on-demand setups, customizer configurations, and order pipelines.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-2xl border">
            <span className="text-[10px] font-black uppercase text-gray-400">Printify Mode</span>
            <Switch 
              checked={printifySettings.enabled}
              onCheckedChange={(checked) => handleUpdate({ enabled: checked })}
            />
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="rounded-2xl h-10 px-4 uppercase font-black tracking-wider text-[10px] bg-black text-white hover:bg-neutral-800"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Save className="h-3 w-3 mr-2" />}
            Save Settings
          </Button>
        </div>
      </div>

      {!printifySettings.enabled ? (
        <Card className="border-none shadow-sm rounded-3xl p-6 bg-white flex flex-col items-center justify-center text-center min-h-[300px]">
          <AlertCircle className="h-10 w-10 text-gray-300 mb-3" />
          <h2 className="text-base font-bold uppercase tracking-tight">Printify Integration is Disabled</h2>
          <p className="text-xs text-gray-500 max-w-sm mt-1">
            Toggle the Switch at the top right to activate Printify settings. Your existing customer storefront displays will remain unaffected.
          </p>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-gray-100 p-1 rounded-2xl w-full flex overflow-x-auto justify-start md:justify-center border">
            <TabsTrigger value="apis" className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider">APIs</TabsTrigger>
            <TabsTrigger value="editor" className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider">Editor</TabsTrigger>
            <TabsTrigger value="preview" className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider">Live Preview</TabsTrigger>
            <TabsTrigger value="sync" className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider">Product Sync</TabsTrigger>
            <TabsTrigger value="orders" className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider">Orders</TabsTrigger>
            <TabsTrigger value="webhooks" className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider">Webhooks</TabsTrigger>
          </TabsList>

          {/* APIs Tab */}
          <TabsContent value="apis" className="space-y-6 animate-in fade-in duration-200 outline-none">
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-gray-400" />
                  <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">API Configuration</CardTitle>
                </div>
                <CardDescription className="text-xs">Provide credentials to securely connect your store to Printify.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 p-5 md:p-6 pt-0">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">Printify API Access Token</Label>
                  <Input 
                    type="password"
                    value={printifySettings.providerSettings.apiKey}
                    onChange={(e) => handleUpdate({
                      providerSettings: { ...printifySettings.providerSettings, apiKey: e.target.value.trim() }
                    })}
                    placeholder="Enter your personal access token (e.g. pr_...)"
                    className="rounded-xl h-11 text-sm font-mono border-gray-200"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">Printify Shop ID</Label>
                  <Input 
                    value={printifySettings.providerSettings.shopId}
                    onChange={(e) => handleUpdate({
                      providerSettings: { ...printifySettings.providerSettings, shopId: e.target.value.trim() }
                    })}
                    placeholder="Enter your Printify Shop ID"
                    className="rounded-xl h-11 text-sm border-gray-200"
                  />
                </div>

                <div className="pt-4 border-t flex flex-col sm:flex-row items-center gap-4">
                  <Button 
                    type="button" 
                    onClick={testConnection}
                    disabled={testingConnection}
                    className="rounded-2xl h-11 px-5 uppercase font-black text-[10px] bg-black text-white hover:bg-neutral-800"
                  >
                    {testingConnection && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
                    Test API Connection
                  </Button>
                  
                  {connectionStatus === 'success' && (
                    <div className="flex items-center gap-2 text-green-600 text-xs font-bold bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                      <CheckCircle2 className="h-4 w-4" /> Connected Successfully
                    </div>
                  )}
                  {connectionStatus === 'failed' && (
                    <div className="flex items-center gap-2 text-red-600 text-xs font-bold bg-red-50 px-4 py-2 rounded-xl border border-red-100">
                      <AlertCircle className="h-4 w-4" /> Connection Failed. Check token and Shop ID.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Editor Tab */}
          <TabsContent value="editor" className="space-y-6 animate-in fade-in duration-200 outline-none">
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <Edit className="h-5 w-5 text-gray-400" />
                  <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">Customizer Editor Selection</CardTitle>
                </div>
                <CardDescription className="text-xs">Choose and enable the editing interface available to customers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-5 md:p-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* DevsFolk Editor Card */}
                  <div className={`p-5 rounded-3xl border-2 text-left transition-all ${printifySettings.editor.selected === 'devsfolk' ? 'border-black bg-neutral-50' : 'border-gray-100 bg-white'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-black uppercase text-sm leading-tight">DevsFolk Customizer</h4>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Built-in HTML5 Canvas Editor</p>
                      </div>
                      <Switch 
                        checked={printifySettings.editor.devsfolkEnabled}
                        onCheckedChange={(checked) => handleUpdate({
                          editor: { ...printifySettings.editor, devsfolkEnabled: checked }
                        })}
                      />
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed mb-4">
                      Our custom editor allows clients to upload images, write custom text, choose fonts, and resize elements directly.
                    </p>
                    <Button 
                      variant={printifySettings.editor.selected === 'devsfolk' ? 'default' : 'outline'}
                      onClick={() => handleUpdate({ editor: { ...printifySettings.editor, selected: 'devsfolk' } })}
                      disabled={!printifySettings.editor.devsfolkEnabled}
                      className="w-full rounded-xl h-9 text-[10px] font-black uppercase tracking-widest"
                    >
                      {printifySettings.editor.selected === 'devsfolk' ? 'Selected Editor' : 'Select DevsFolk Editor'}
                    </Button>
                  </div>

                  {/* Alternative Editor Card */}
                  <div className={`p-5 rounded-3xl border-2 text-left transition-all ${printifySettings.editor.selected === 'alternative' ? 'border-black bg-neutral-50' : 'border-gray-100 bg-white'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-black uppercase text-sm leading-tight">Alternative Customizer</h4>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Secondary Editor Frame</p>
                      </div>
                      <Switch 
                        checked={printifySettings.editor.alternativeEnabled}
                        onCheckedChange={(checked) => handleUpdate({
                          editor: { ...printifySettings.editor, alternativeEnabled: checked }
                        })}
                      />
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed mb-4">
                      Activate a simplified, third-party, or alternative overlay customizer interface for special configurations.
                    </p>
                    <Button 
                      variant={printifySettings.editor.selected === 'alternative' ? 'default' : 'outline'}
                      onClick={() => handleUpdate({ editor: { ...printifySettings.editor, selected: 'alternative' } })}
                      disabled={!printifySettings.editor.alternativeEnabled}
                      className="w-full rounded-xl h-9 text-[10px] font-black uppercase tracking-widest"
                    >
                      {printifySettings.editor.selected === 'alternative' ? 'Selected Editor' : 'Select Alternative Editor'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Live Preview Tab */}
          <TabsContent value="preview" className="space-y-6 animate-in fade-in duration-200 outline-none">
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <Eye className="h-5 w-5 text-gray-400" />
                  <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">Live Preview Settings</CardTitle>
                </div>
                <CardDescription className="text-xs">Control how visual mockups are rendered for customer verification.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-5 md:p-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option 1: DevsFolk Preview */}
                  <div className={`p-5 rounded-3xl border-2 text-left transition-all ${printifySettings.preview.selected === 'devsfolk' ? 'border-black bg-neutral-50' : 'border-gray-100 bg-white'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-black uppercase text-sm leading-tight">DevsFolk Live Preview</h4>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Browser-based 2D overlay</p>
                      </div>
                      <Switch 
                        checked={printifySettings.preview.devsfolkEnabled}
                        onCheckedChange={(checked) => handleUpdate({
                          preview: { ...printifySettings.preview, devsfolkEnabled: checked }
                        })}
                      />
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed mb-4">
                      Super fast and completely cost-free. Mockup overlay is generated client-side directly on the user's phone or laptop.
                    </p>
                    <Button 
                      variant={printifySettings.preview.selected === 'devsfolk' ? 'default' : 'outline'}
                      onClick={() => handleUpdate({ preview: { ...printifySettings.preview, selected: 'devsfolk' } })}
                      disabled={!printifySettings.preview.devsfolkEnabled}
                      className="w-full rounded-xl h-9 text-[10px] font-black uppercase tracking-widest"
                    >
                      {printifySettings.preview.selected === 'devsfolk' ? 'Active Renderer' : 'Select DevsFolk Preview'}
                    </Button>
                  </div>

                  {/* Option 2: AI Preview */}
                  <div className={`p-5 rounded-3xl border-2 text-left transition-all ${printifySettings.preview.selected === 'ai' ? 'border-black bg-neutral-50' : 'border-gray-100 bg-white'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-black uppercase text-sm leading-tight">AI Live Preview</h4>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">AI-generated realistic layouts</p>
                      </div>
                      <Switch 
                        checked={printifySettings.preview.aiEnabled}
                        onCheckedChange={(checked) => handleUpdate({
                          preview: { ...printifySettings.preview, aiEnabled: checked }
                        })}
                      />
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed mb-4">
                      Sends design models and templates through an AI pipeline to output premium, ultra-realistic product display visuals.
                    </p>
                    <Button 
                      variant={printifySettings.preview.selected === 'ai' ? 'default' : 'outline'}
                      onClick={() => handleUpdate({ preview: { ...printifySettings.preview, selected: 'ai' } })}
                      disabled={!printifySettings.preview.aiEnabled}
                      className="w-full rounded-xl h-9 text-[10px] font-black uppercase tracking-widest"
                    >
                      {printifySettings.preview.selected === 'ai' ? 'Active Renderer' : 'Select AI Preview'}
                    </Button>
                  </div>
                </div>

                {printifySettings.preview.aiEnabled && printifySettings.preview.selected === 'ai' && (
                  <div className="p-5 bg-gray-50 border rounded-3xl space-y-4 animate-in slide-in-from-top-4 duration-300">
                    <h4 className="font-black text-xs uppercase tracking-wider text-gray-500 pl-1">AI Pipeline Configurations</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className="text-[9px] uppercase text-gray-400 pl-1">AI Provider</Label>
                        <Select 
                          value={printifySettings.preview.aiConfig.provider} 
                          onValueChange={(val) => handleUpdate({
                            preview: {
                              ...printifySettings.preview,
                              aiConfig: { ...printifySettings.preview.aiConfig, provider: val as 'gemini' | 'openai' }
                            }
                          })}
                        >
                          <SelectTrigger className="rounded-xl h-10 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gemini">Google Gemini 2.5 Flash</SelectItem>
                            <SelectItem value="openai">OpenAI DALL-E 3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-[9px] uppercase text-gray-400 pl-1">Viewing Angles Count (1 - 5)</Label>
                        <Select 
                          value={printifySettings.preview.aiConfig.anglesCount.toString()} 
                          onValueChange={(val) => handleUpdate({
                            preview: {
                              ...printifySettings.preview,
                              aiConfig: { ...printifySettings.preview.aiConfig, anglesCount: parseInt(val) }
                            }
                          })}
                        >
                          <SelectTrigger className="rounded-xl h-10 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((val) => (
                              <SelectItem key={val} value={val.toString()}>{val} Angle{val > 1 ? 's' : ''}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label className="text-[9px] uppercase text-gray-400 pl-1">AI Provider API Secret Key</Label>
                      <Input 
                        type="password"
                        value={printifySettings.preview.aiConfig.apiKey}
                        onChange={(e) => handleUpdate({
                          preview: {
                            ...printifySettings.preview,
                            aiConfig: { ...printifySettings.preview.aiConfig, apiKey: e.target.value.trim() }
                          }
                        })}
                        placeholder="Paste your AI provider secret token..."
                        className="rounded-xl h-10 text-xs font-mono border-gray-200"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Product Sync Tab */}
          <TabsContent value="sync" className="space-y-6 animate-in fade-in duration-200 outline-none">
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-gray-400" />
                  <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">Product Catalog Synchronization</CardTitle>
                </div>
                <CardDescription className="text-xs">Configure how often Printify products, variants, and stock maps are cached locally.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-5 md:p-6 pt-0">
                <div className="bg-gray-50 border p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-gray-600">Manual Synchronization</h4>
                    <p className="text-[10px] text-gray-500 mt-1 leading-normal max-w-lg">
                      Forces an immediate fetch of Printify's catalog configurations, importing variants and sizes into the local Supabase cache.
                    </p>
                  </div>
                  <Button 
                    onClick={runManualSync}
                    disabled={syncingProducts}
                    className="rounded-xl h-10 px-4 text-[10px] font-black uppercase bg-black text-white hover:bg-neutral-800 self-stretch md:self-auto shrink-0"
                  >
                    {syncingProducts ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Play className="h-3 w-3 mr-2" />}
                    Sync Catalog now
                  </Button>
                </div>

                {syncLogs.length > 0 && (
                  <div className="rounded-2xl bg-neutral-900 p-4 font-mono text-[10px] text-green-400 space-y-1.5 h-44 overflow-y-auto border border-neutral-800">
                    <p className="text-gray-500 mb-2">// Console Output logs</p>
                    {syncLogs.map((log, idx) => (
                      <p key={idx}>{log}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6 animate-in fade-in duration-200 outline-none">
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-5 w-5 text-gray-400" />
                  <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">Printify Order Logs</CardTitle>
                </div>
                <CardDescription className="text-xs">Monitor the automated print fulfillment status of custom-designed orders.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 md:p-6 pt-0 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] uppercase font-black text-gray-400">
                      <th className="pb-3 pl-2">Order ID</th>
                      <th className="pb-3">Customer</th>
                      <th className="pb-3">Total</th>
                      <th className="pb-3 text-center">Fulfillment Status</th>
                      <th className="pb-3">Printify ID</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {customPrintOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-xs text-gray-400">No customizer orders recorded yet.</td>
                      </tr>
                    ) : (
                      customPrintOrders.map((ord) => (
                        <tr key={ord.id} className="text-xs">
                          <td className="py-4 pl-2 font-mono font-bold">#{ord.id.slice(0, 8)}</td>
                          <td className="py-4 font-bold">{ord.customerName}</td>
                          <td className="py-4 font-mono font-bold">${ord.total.toFixed(2)}</td>
                          <td className="py-4">
                            <div className="flex justify-center">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                                ord.printifySyncStatus === 'SYNCED' 
                                  ? 'bg-green-50 text-green-700 border border-green-100' 
                                  : (ord.printifySyncStatus === 'FAILED' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-amber-50 text-amber-700 border border-amber-100')
                              }`}>
                                {ord.printifySyncStatus}
                              </span>
                            </div>
                            {ord.printifySyncStatus === 'FAILED' && (
                              <p className="text-[9px] text-red-500 mt-1 pl-2 text-center max-w-[200px] truncate">{ord.printifyErrorLog}</p>
                            )}
                          </td>
                          <td className="py-4 font-mono text-gray-500">{ord.printifyOrderId || 'N/A'}</td>
                          <td className="py-4 text-right">
                            <Button 
                              variant="outline" 
                              className="rounded-lg h-8 px-3 text-[9px] font-black uppercase tracking-wider"
                              onClick={() => alert(`Retrying Printify push for Order #${ord.id}`)}
                            >
                              Push / Retry
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-6 animate-in fade-in duration-200 outline-none">
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <Link className="h-5 w-5 text-gray-400" />
                  <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">Webhook Notifications</CardTitle>
                </div>
                <CardDescription className="text-xs">Configure status listeners to capture print updates automatically.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 p-5 md:p-6 pt-0">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-gray-600">Fulfillment Webhooks</h4>
                    <p className="text-[10px] text-gray-500 mt-1 leading-normal max-w-lg">
                      Enable status syncing. Once a T-shirt is printed, packaged, and shipped, Printify webhooks automatically update order statuses in your dashboard.
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">Target Webhook Endpoint URL</Label>
                  <Input 
                    readOnly
                    value={`${window.location.origin}/api/printify/webhook`}
                    className="rounded-xl h-11 text-sm font-mono border-gray-200 bg-gray-50"
                  />
                  <p className="text-[10px] text-gray-500 italic pl-1">
                    Provide this URL inside your Printify Developer Console webhooks settings to subscribe to shipment events.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
