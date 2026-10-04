import { listAccountMedia } from './meta.js';
import { listContents, upsertContent } from '../repository.js';

const running = new Map();
export function syncMetaLibrary(brand) {
  if (running.has(brand)) return running.get(brand);
  const task = synchronize(brand).finally(() => running.delete(brand));
  running.set(brand, task);
  return task;
}
async function synchronize(brand) {
  const library = await listAccountMedia(brand);
  const existing = await listContents(brand);
  let imported = 0;
  const seen = new Set();
  for (const item of library.items) {
    const key = `${item.platform}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const url = item.permalink || item.permalink_url || '';
    const previous = existing.find(row => (row.external_media_id === item.id && String(row.platform || row.data?.plateforme).toLowerCase().includes(item.platform)) || (url && (row.final_url || row.data?.finalUrl) === url));
    const caption = item.caption || item.message || item.description || previous?.data?.message || '';
    const attachments = item.attachments?.data || [];
    const carousel = item.media_type === 'CAROUSEL_ALBUM' || attachments.some(a => a.subattachments?.data?.length > 1);
    const video = item.media_type === 'VIDEO' || (item.story && !item.media_type && previous?.data?.mediaType === 'story_video') || attachments.some(a => /video|reel/i.test(a.media_type || a.type || ''));
    const timestamp = item.timestamp || item.created_time || library.syncedAt;
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) continue;
    const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Africa/Casablanca', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date).split(' ');
    const mediaUrl = item.media_url || item.full_picture || previous?.data?.mediaUrl || '';
    const data = {
      ...previous?.data,
      titre: previous?.data?.titre || caption.slice(0, 100) || `${item.story ? 'Story' : video ? 'Reel / vidéo' : carousel ? 'Carrousel' : 'Post'} ${parts[0]}`,
      message: caption,
      format: item.story ? 'story' : carousel ? 'carrousel' : video ? 'video' : 'post',
      statut: 'publie', datePublication: parts[0], heure: parts[1],
      plateforme: item.platform === 'instagram' ? 'Instagram (IG)' : 'Facebook (FB)',
      mediaUrl, thumbnailUrl: item.thumbnail_url || item.full_picture || mediaUrl,
      mediaType: item.story ? (video ? 'story_video' : 'story_image') : carousel ? 'carousel' : video ? 'video' : 'image',
      mediaItems: item.children?.data?.length ? item.children.data.map(child => ({ url: child.media_url, type: child.media_type === 'VIDEO' ? 'video/mp4' : 'image/jpeg' })) : previous?.data?.mediaItems || [],
      importedFromMeta: previous ? Boolean(previous.data?.importedFromMeta) : true,
      publishedAt: timestamp, finalUrl: url,
      resultats: { ...previous?.data?.resultats, ...(item.like_count != null ? { reactions: item.like_count } : {}), ...(item.comments_count != null ? { commentaires: item.comments_count } : {}) }
    };
    await upsertContent({ id: previous?.id || `meta-${brand}-${item.platform}-${item.id}`, brand, data, platform: item.platform, finalUrl: url, externalMediaId: item.id, syncStatus: 'connected', lastSyncedAt: library.syncedAt });
    imported++;
  }
  return { imported, errors: library.errors, syncedAt: library.syncedAt, storiesNote: 'Stories actives accessibles via Meta ; les stories déjà récupérées restent dans la liste après expiration.' };
}
