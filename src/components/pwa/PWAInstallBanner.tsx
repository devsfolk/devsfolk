import React from 'react';
import { Smartphone, Download, X, CheckCircle2, Share, PlusSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'motion/react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallBanner: React.FC = () => {
  const [installPrompt, setInstallPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [isInstalling, setIsInstalling] = React.useState(false);
  const [isDismissed, setIsDismissed] = React.useState(false);
  const [showIosGuide, setShowIosGuide] = React.useState(false);

  // Platform detection
  const isIos = React.useMemo(() => {
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream
    );
  }, []);

  const isSafari = React.useMemo(() => {
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('crios');
  }, []);

  React.useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed in last 7 days
    const dismissedTime = localStorage.getItem('devsfolk_pwa_dismissed');
    if (dismissedTime) {
      const parsed = parseInt(dismissedTime, 10);
      const diff = Date.now() - parsed;
      // 7 days in milliseconds
      if (diff < 7 * 24 * 60 * 60 * 1000) {
        setIsDismissed(true);
      }
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      setIsInstalling(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (isIos && isSafari) {
      setShowIosGuide(true);
      return;
    }

    if (!installPrompt) {
      // If no native prompt is available (e.g. desktop manual or other browsers), show custom warning/guideline or trigger general download
      return;
    }

    setIsInstalling(true);
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome !== 'accepted') {
      setIsInstalling(false);
    }
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('devsfolk_pwa_dismissed', Date.now().toString());
  };

  // If already installed, dismissed, or PWA is not promptable and not on iOS, do not render banner.
  // Note: On mobile/tablet we always want to show either the native install trigger or the iOS safari guide.
  const shouldShow = React.useMemo(() => {
    if (isInstalled || isDismissed) return false;
    // Show on iOS safari (for manual guide) or if native prompt event fired
    return (isIos && isSafari) || installPrompt !== null;
  }, [isInstalled, isDismissed, isIos, isSafari, installPrompt]);

  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-8 md:w-[380px] z-50">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <Card className="border border-white/20 bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden relative">
            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-100/50 hover:bg-gray-100 text-gray-500 hover:text-black transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <CardContent className="p-6 space-y-4">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white shadow-lg shadow-black/10 flex-shrink-0">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div className="flex-1 pr-6">
                  <h3 className="font-black text-sm uppercase tracking-tight text-gray-900 leading-snug">
                    Install DevsFolk App
                  </h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5 leading-none">
                    Add to Home Screen
                  </p>
                  <p className="text-[11px] text-gray-500 leading-relaxed mt-2 pl-0.5">
                    Pin the dashboard to your home screen for rapid access and native push alert sync.
                  </p>
                </div>
              </div>

              {/* iOS Manual Guide Tooltip */}
              {showIosGuide ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="rounded-2xl bg-indigo-50/50 border border-indigo-100 p-4 space-y-3"
                >
                  <p className="text-[10px] font-black uppercase tracking-wider text-indigo-900 leading-none">
                    iOS / Safari Manual Install
                  </p>
                  <ol className="text-[10px] text-indigo-950/80 space-y-2 leading-relaxed font-semibold pl-1">
                    <li className="flex items-center gap-2">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-100 text-[8px] font-black">1</span>
                      <span>Tap the share icon <Share className="h-3 w-3 inline mx-0.5 text-indigo-700" /> at bottom menu.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-100 text-[8px] font-black">2</span>
                      <span>Scroll down and select <span className="font-bold">Add to Home Screen <PlusSquare className="h-3 w-3 inline mx-0.5 text-indigo-700" /></span>.</span>
                    </li>
                  </ol>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowIosGuide(false)}
                    className="w-full h-8 text-[9px] font-black uppercase tracking-wider text-indigo-600 hover:bg-indigo-100/50 rounded-xl"
                  >
                    Got it, thanks
                  </Button>
                </motion.div>
              ) : (
                <div className="flex gap-2.5">
                  <Button
                    onClick={() => void handleInstall()}
                    disabled={isInstalling}
                    className="flex-1 h-12 rounded-2xl font-black uppercase tracking-wider text-[10px] shadow-lg shadow-black/10 transition-all hover:translate-y-[-1px] active:translate-y-0"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isInstalling ? 'Verifying...' : 'Install Now'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDismiss}
                    className="h-12 rounded-2xl font-black uppercase tracking-wider text-[10px] border-2"
                  >
                    Maybe Later
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
