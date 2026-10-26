// Fetching the completed clip gives playback a local Blob URL; do this before a question is answered.
export function createVideoCache({ fetchImpl = fetch, makeUrl = blob => URL.createObjectURL(blob), revokeUrl = url => URL.revokeObjectURL(url) } = {}) {
  const entries = new Map();
  let disposed = false;
  return {
    preload(help) {
      if (disposed) return Promise.reject(new Error('Video cache has been disposed'));
      if (help.status !== 'ready' || !help.videoUrl) return Promise.reject(new Error('Signed explanation is not ready'));
      const key = `${help.id}:${help.version || ''}:${help.videoUrl}`;
      if (!entries.has(key)) {
        const entry = { url: null, promise: null };
        entry.promise = fetchImpl(help.videoUrl).then(response => {
          if (!response.ok) throw new Error(`Signed video failed to load (${response.status})`);
          return response.blob();
        }).then(blob => {
          if (!blob.size) throw new Error('Signed video is empty');
          if (disposed) throw new Error('Video cache has been disposed');
          entry.url = makeUrl(blob);
          return entry.url;
        }).catch(error => { entries.delete(key); throw error; });
        entries.set(key, entry);
      }
      return entries.get(key).promise;
    },
    dispose() {
      disposed = true;
      for (const entry of entries.values()) if (entry.url) revokeUrl(entry.url);
      entries.clear();
    },
  };
}
