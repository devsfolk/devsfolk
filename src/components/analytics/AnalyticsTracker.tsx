import React from 'react';
import { useLocation } from 'react-router-dom';
import { useShop } from '@/context/ShopContext';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_SCRIPT_ID = 'omnistore-ga-script';
const GA_CONFIG_SCRIPT_ID = 'omnistore-ga-config';

export const AnalyticsTracker: React.FC = () => {
  const { settings } = useShop();
  const location = useLocation();
  const measurementId = settings.analytics.googleAnalyticsId.trim();

  React.useEffect(() => {
    if (!measurementId) {
      return;
    }

    const existingScript = document.getElementById(GA_SCRIPT_ID) as HTMLScriptElement | null;
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = GA_SCRIPT_ID;
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      document.head.appendChild(script);
    }

    const existingConfigScript = document.getElementById(GA_CONFIG_SCRIPT_ID) as HTMLScriptElement | null;
    if (!existingConfigScript) {
      const configScript = document.createElement('script');
      configScript.id = GA_CONFIG_SCRIPT_ID;
      configScript.text = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){window.dataLayer.push(arguments);}
        window.gtag = gtag;
      `;
      document.head.appendChild(configScript);
    }

    if (window.gtag) {
      window.gtag('js', new Date());
      window.gtag('config', measurementId, {
        send_page_view: false,
      });
    }
  }, [measurementId]);

  React.useEffect(() => {
    if (!measurementId || !window.gtag) {
      return;
    }

    window.gtag('event', 'page_view', {
      page_location: window.location.href,
      page_path: `${location.pathname}${location.search}`,
      page_title: document.title,
    });
  }, [location.pathname, location.search, measurementId]);

  return null;
};
