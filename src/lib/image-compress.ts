export interface CompressedImageResult {
  blob: Blob;
  extension: "webp" | "jpeg";
  contentType: "image/webp" | "image/jpeg";
  width: number;
  height: number;
}

const MAX_IMAGE_WIDTH = 1400;
const PRIMARY_QUALITY = 0.82;
const FALLBACK_QUALITY = 0.72;
const RECOMPRESS_THRESHOLD_BYTES = 2 * 1024 * 1024;

interface DecodedImage {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, targetWidth: number, targetHeight: number) => void;
  cleanup: () => void;
}

async function decodeImage(file: File | Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, targetWidth, targetHeight) => {
          ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
        },
        cleanup: () => {
          bitmap.close();
        },
      };
    } catch {
      // Fall back to HTMLImageElement decoding when createImageBitmap fails
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("이미지를 불러올 수 없습니다."));
      el.src = objectUrl;
    });

    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;

    return {
      width: naturalWidth,
      height: naturalHeight,
      draw: (ctx, targetWidth, targetHeight) => {
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      },
      cleanup: () => {
        URL.revokeObjectURL(objectUrl);
      },
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: "image/webp" | "image/jpeg",
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

export async function compressImageToWebpOrJpeg(
  file: File | Blob
): Promise<CompressedImageResult> {
  const decoded = await decodeImage(file);

  try {
    if (decoded.width <= 0 || decoded.height <= 0) {
      throw new Error("올바른 크기의 이미지가 아닙니다.");
    }

    const shouldResize = decoded.width > MAX_IMAGE_WIDTH;
    const targetWidth = shouldResize ? MAX_IMAGE_WIDTH : decoded.width;
    const targetHeight = shouldResize
      ? Math.max(1, Math.round(decoded.height * (MAX_IMAGE_WIDTH / decoded.width)))
      : decoded.height;

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("이미지 캔버스를 초기화할 수 없습니다.");
    }

    // Pre-fill white so transparent PNGs never turn dark under JPEG fallback
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    decoded.draw(ctx, targetWidth, targetHeight);

    let chosenMime: "image/webp" | "image/jpeg" = "image/webp";
    let chosenExt: "webp" | "jpeg" = "webp";
    let blob = await canvasToBlob(canvas, "image/webp", PRIMARY_QUALITY);

    if (!blob || blob.size === 0 || blob.type !== "image/webp") {
      chosenMime = "image/jpeg";
      chosenExt = "jpeg";
      blob = await canvasToBlob(canvas, "image/jpeg", PRIMARY_QUALITY);
    }

    if (!blob || blob.size === 0) {
      throw new Error("이미지를 압축하지 못했습니다.");
    }

    if (blob.size > RECOMPRESS_THRESHOLD_BYTES) {
      const smallerBlob = await canvasToBlob(canvas, chosenMime, FALLBACK_QUALITY);
      if (smallerBlob && smallerBlob.size > 0) {
        blob = smallerBlob;
      }
    }

    return {
      blob,
      extension: chosenExt,
      contentType: chosenMime,
      width: targetWidth,
      height: targetHeight,
    };
  } finally {
    decoded.cleanup();
  }
}
