// utils/cropImage.js
/**
 * Crop + rotate image utility
 * @param {File|Blob} imageFile - The input image file
 * @param {Object} pixelCrop - The crop area { x, y, width, height }
 * @param {number} rotation - Rotation angle in degrees (default: 0)
 * @returns {Promise<Blob>} Cropped image blob
 */
export default async function getCroppedImg(imageFile, pixelCrop, rotation = 0) {
  // Load image as HTMLImageElement
  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // 🔹 avoids CORS issues
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
    });

  try {
    const image = await createImage(URL.createObjectURL(imageFile));
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) throw new Error("Canvas context not available");

    // Safe area ensures rotated image fits without clipping
    const maxSize = Math.max(image.width, image.height);
    const safeArea = maxSize * 2;

    canvas.width = safeArea;
    canvas.height = safeArea;

    // Move to center, rotate, move back
    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-safeArea / 2, -safeArea / 2);

    // Draw image in the center
    ctx.drawImage(
      image,
      safeArea / 2 - image.width / 2,
      safeArea / 2 - image.height / 2
    );

    // Get rotated image data
    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    // Resize canvas to crop size
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Place cropped area
    ctx.putImageData(
      data,
      Math.round(0 - safeArea / 2 + image.width / 2 - pixelCrop.x),
      Math.round(0 - safeArea / 2 + image.height / 2 - pixelCrop.y)
    );

    // Return blob promise
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Canvas is empty"));
          resolve(blob);
        },
        imageFile.type || "image/jpeg",
        0.95 // 🔹 quality factor
      );
    });
  } catch (error) {
    console.error("❌ cropImage error:", error);
    throw error;
  }
}
