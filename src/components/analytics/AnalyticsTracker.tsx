import React from 'react';
import { useLocation } from 'react-router-dom';
import { useShop } from '@/context/ShopContext';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_SCRIPT_ID = 'devsfolk-ga-script';
const GA_CONFIG_SCRIPT_ID = 'devsfolk-ga-config';
const FAVICON_LINK_ID = 'devsfolk-dynamic-favicon';
const GSC_META_ID = 'devsfolk-gsc-verification';

export const AnalyticsTracker: React.FC = () => {
  const { settings } = useShop();
  const location = useLocation();
  const measurementId = settings.analytics.googleAnalyticsId.trim();
  const searchConsoleId = settings.analytics.googleSearchConsoleId.trim();
  const faviconUrl = settings.faviconUrl?.trim() || '';

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

  // Dynamic favicon and apple-touch-icon injection
  React.useEffect(() => {
    const href = faviconUrl || '/favicon.svg';
    
    // 1. Update standard favicon
    const existing = document.getElementById(FAVICON_LINK_ID) as HTMLLinkElement | null;
    if (existing) {
      existing.href = href;
    } else {
      const link = document.createElement('link');
      link.id = FAVICON_LINK_ID;
      link.rel = 'icon';
      link.href = href;
      document.head.appendChild(link);
    }

    // 2. Update apple-touch-icon
    const APPLE_ICON_ID = 'devsfolk-apple-touch-icon';
    const existingApple = document.getElementById(APPLE_ICON_ID) as HTMLLinkElement | null;
    if (existingApple) {
      existingApple.href = href;
    } else {
      const link = document.createElement('link');
      link.id = APPLE_ICON_ID;
      link.rel = 'apple-touch-icon';
      link.href = href;
      document.head.appendChild(link);
    }
  }, [faviconUrl]);

  // Google Search Console verification meta tag injection
  React.useEffect(() => {
    const existing = document.getElementById(GSC_META_ID) as HTMLMetaElement | null;

    if (!searchConsoleId) {
      if (existing) existing.remove();
      return;
    }

    if (existing) {
      existing.content = searchConsoleId;
    } else {
      const meta = document.createElement('meta');
      meta.id = GSC_META_ID;
      meta.name = 'google-site-verification';
      meta.content = searchConsoleId;
      document.head.appendChild(meta);
    }
  }, [searchConsoleId]);

  return null;
};
