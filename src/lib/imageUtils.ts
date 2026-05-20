
/**
 * Optimizes an image for web use.
 * Resizes to a maximum dimension and compresses while maintaining high quality.
 */
export async function optimizeImage(file: File, maxWidth = 800, maxHeight = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(img.src); // Fallback to original
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        // Dynamically compress using WebP (best) or JPEG fallback at 0.60 quality
        let dataUrl = '';
        try {
          dataUrl = canvas.toDataURL('image/webp', 0.60);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.60);
          }
        } catch {
          dataUrl = canvas.toDataURL('image/jpeg', 0.60);
        }
        resolve(dataUrl);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}
