import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const uploadsDir = path.resolve(process.env.MEDIA_UPLOAD_DIR || path.join(process.cwd(), 'uploads'));

function publicBaseUrl(fallbackUrl = '') {
  const configured = String(process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  if (configured) return configured;
  try {
    return new URL(fallbackUrl).origin;
  } catch {
    return '';
  }
}

function isConvertibleImageMime(mime = '') {
  return ['image/png', 'image/webp', 'image/gif'].includes(String(mime).toLowerCase());
}

export async function normalizeUploadedMedia(buffer, mime, rawName = 'media') {
  const lowerMime = String(mime || '').toLowerCase();
  const originalExt = path.extname(rawName).toLowerCase();

  if (!isConvertibleImageMime(lowerMime)) {
    const extByMime = {
      'image/jpeg': '.jpg',
      'video/mp4': '.mp4',
      'video/quicktime': '.mov',
      'video/webm': '.webm'
    };
    return {
      buffer,
      mime: lowerMime,
      ext: extByMime[lowerMime] || originalExt || '.bin',
      converted: false
    };
  }

  const jpeg = await sharp(buffer, { animated: false })
    .rotate()
    .flatten({ background: '#ffffff' })
    .resize({
      width: 4096,
      height: 4096,
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();

  return {
    buffer: jpeg,
    mime: 'image/jpeg',
    ext: '.jpg',
    converted: true
  };
}

export async function ensureInstagramCompatibleMediaUrl(mediaUrl, mediaType = 'image') {
  const type = String(mediaType || '').toLowerCase();
  if (!mediaUrl || type === 'video' || type === 'reel') {
    return { url: mediaUrl, converted: false };
  }

  let parsed;
  try {
    parsed = new URL(mediaUrl);
  } catch {
    return { url: mediaUrl, converted: false };
  }

  if (/\.jpe?g$/i.test(parsed.pathname)) {
    return { url: mediaUrl, converted: false };
  }

  const shouldConvertByExt = /\.(png|webp|gif)$/i.test(parsed.pathname);
  let sourceBuffer = null;

  if (parsed.pathname.startsWith('/uploads/')) {
    const filename = path.basename(parsed.pathname);
    const localPath = path.join(uploadsDir, filename);
    try {
      sourceBuffer = await fs.readFile(localPath);
    } catch {
      sourceBuffer = null;
    }
  }

  if (!sourceBuffer && shouldConvertByExt) {
    const response = await fetch(mediaUrl);
    if (!response.ok) {
      throw new Error(`Impossible de récupérer le média à convertir pour Instagram (HTTP ${response.status}).`);
    }
    sourceBuffer = Buffer.from(await response.arrayBuffer());
  }

  if (!sourceBuffer) {
    return { url: mediaUrl, converted: false };
  }

  let jpeg;
  try {
    jpeg = await sharp(sourceBuffer, { animated: false })
      .rotate()
      .flatten({ background: '#ffffff' })
      .resize({
        width: 4096,
        height: 4096,
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();
  } catch (error) {
    throw new Error(`Conversion JPEG impossible pour Instagram: ${error.message}`);
  }

  await fs.mkdir(uploadsDir, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomUUID()}.jpg`;
  await fs.writeFile(path.join(uploadsDir, filename), jpeg);

  const base = publicBaseUrl(mediaUrl);
  if (!base) {
    throw new Error('PUBLIC_BASE_URL est nécessaire pour publier le média converti sur Instagram.');
  }

  return {
    url: `${base}/uploads/${filename}`,
    converted: true,
    mime: 'image/jpeg',
    filename
  };
}
