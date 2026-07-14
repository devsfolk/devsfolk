export interface GoogleFontOption {
  name: string;
  family: string;
}

export const GOOGLE_HERO_FONTS: GoogleFontOption[] = [
  { name: 'Playfair Display', family: 'Playfair+Display' },
  { name: 'Oswald', family: 'Oswald' },
  { name: 'Bebas Neue', family: 'Bebas+Neue' },
  { name: 'Montserrat', family: 'Montserrat' },
  { name: 'Raleway', family: 'Raleway' },
  { name: 'Cormorant Garamond', family: 'Cormorant+Garamond' },
  { name: 'Libre Baskerville', family: 'Libre+Baskerville' },
  { name: 'Lora', family: 'Lora' },
  { name: 'Inter', family: 'Inter' },
  { name: 'Poppins', family: 'Poppins' },
  { name: 'Nunito', family: 'Nunito' },
  { name: 'DM Sans', family: 'DM+Sans' },
  { name: 'Pacifico', family: 'Pacifico' },
  { name: 'Dancing Script', family: 'Dancing+Script' },
  { name: 'Abril Fatface', family: 'Abril+Fatface' },
  { name: 'Anton', family: 'Anton' },
  { name: 'Archivo Black', family: 'Archivo+Black' },
  { name: 'Merriweather', family: 'Merriweather' },
  { name: 'Josefin Sans', family: 'Josefin+Sans' },
  { name: 'Space Grotesk', family: 'Space+Grotesk' },
  { name: 'Sora', family: 'Sora' },
  { name: 'Cinzel', family: 'Cinzel' },
  { name: 'Manrope', family: 'Manrope' },
  { name: 'Outfit', family: 'Outfit' },
  { name: 'League Spartan', family: 'League+Spartan' },
];

const loadedFonts = new Set<string>();

export const loadGoogleFont = (family?: string) => {
  if (!family || typeof document === 'undefined') return;
  if (loadedFonts.has(family)) return;

  const existing = Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[data-google-font-family]'))
    .some((link) => link.dataset.googleFontFamily === family);

  if (existing) {
    loadedFonts.add(family);
    return;
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${family}:wght@400;600;700;800;900&display=swap`;
  link.dataset.googleFontFamily = family;
  document.head.appendChild(link);
  loadedFonts.add(family);
};

export const loadGoogleFonts = (families: Array<string | undefined | null>) => {
  families.forEach((family) => loadGoogleFont(family || undefined));
};
