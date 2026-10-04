/** Même résolution des formats dans le navigateur et sur le serveur. */
globalThis.NidalMediaFormat = (() => {
  function resolve(job = {}) {
    const metadata = job.metadata || {};
    const items = metadata.mediaItems || job.mediaItems || [];
    const raw = String(job.media_type || job.mediaType || '').toLowerCase();
    const format = String(metadata.format || job.format || '').toLowerCase();
    const placement = String(metadata.placement || job.plateforme || '').toLowerCase();
    const mime = String(metadata.mediaMime || items[0]?.type || '').toLowerCase();
    const url = job.media_url || job.mediaUrl || '';
    const video = mime.startsWith('video/') || /\.(mp4|mov|webm)(?:[?#]|$)/i.test(url);
    let type;
    if (raw.startsWith('story') || format === 'story' || placement.includes('story')) {
      type = raw === 'story_video' || video ? 'story_video' : 'story_image';
    } else if (raw === 'carousel' || raw === 'carrousel' || format === 'carrousel') {
      type = 'carousel';
    } else if (raw === 'reel' || placement.includes('reel')) type = 'reel';
    else if (raw === 'video' || format === 'video') type = 'video';
    else if (items.length > 1) type = 'carousel';
    else if (raw === 'text') type = 'text';
    else type = url ? 'image' : 'text';
    return { type, isStory: type.startsWith('story_'), isVideo: ['story_video', 'reel', 'video'].includes(type), mime };
  }
  return { resolve };
})();
