import React from 'react';
import { Download, CheckCircle2, Smartphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const DashboardInstallCard: React.FC = () => {
  const [installPrompt, setInstallPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [isInstalling, setIsInstalling] = React.useState(false);

  React.useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
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
    if (!installPrompt) {
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

  return (
    <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
      <CardHeader className="p-5 md:p-6">
        <div className="flex items-center gap-3">
          <Smartphone className="h-5 w-5 text-gray-400" />
          <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">Add to Home Screen</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5 md:p-6 pt-0">
        <p className="text-xs text-gray-500 leading-relaxed">
          Install the dashboard on your phone for faster access and an app-like experience.
        </p>

        {isInstalled ? (
          <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-bold">Dashboard Installed</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Open it from your home screen</p>
            </div>
          </div>
        ) : installPrompt ? (
          <Button
            onClick={() => void handleInstall()}
            disabled={isInstalling}
            className="w-full h-11 rounded-2xl font-black uppercase tracking-widest text-[10px]"
          >
            <Download className="h-4 w-4 mr-2" />
            {isInstalling ? 'Waiting for confirmation...' : 'Install Dashboard App'}
          </Button>
        ) : (
          <div className="space-y-2 rounded-2xl bg-gray-50 p-4">
            <p className="text-sm font-bold">Manual Install</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">
              On iPhone: Safari Share menu → Add to Home Screen
            </p>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">
              On Android: Browser menu → Install App / Add to Home Screen
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
