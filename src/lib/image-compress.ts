/**
 * Compresses an image file by drawing it to a canvas and exporting as a JPEG Data URL.
 * This helps circumvent 1MB Firestore document limits for direct base64 uploads.
 *
 * @param file The original Image File object
 * @param maxWidth The maximum width for the compressed image (default 1200)
 * @param maxHeight The maximum height for the compressed image (default 1200)
 * @param quality The JPEG compression quality from 0.0 to 1.0 (default 0.7)
 * @returns A Promise that resolves to the compressed Base64 Data URL string
 */
export const compressImage = (
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.7
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate the new dimensions keeping aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert the canvas to a data URL with specified quality
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };

      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
