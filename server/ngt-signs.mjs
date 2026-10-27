// Serves Nia's NGT sign files. The app only ships the few signs its prototype uses; any other sign in the
// Performs dictionary is fetched once from the same pinned Performs commit and kept in memory.
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const PREFIX = '/data/dictionaries/NGT/Glosses/';
const UPSTREAM = 'https://cdn.jsdelivr.net/gh/upf-gti/performs@dfe48af8bc0213df0dae73929b0d69538e54b785/data/dictionaries/NGT/Glosses/';

export function ngtSignsMiddleware(publicDir) {
  const cache = new Map();
  return async (req, res, next) => {
    const path = req.url?.split('?')[0] || '';
    if (req.method !== 'GET' || !path.startsWith(PREFIX)) return next();
    const name = decodeURIComponent(path.slice(PREFIX.length));
    if (!/^[\w{}\-.]+\.(sigml|bml)$/.test(name) || name.includes('..')) return next();
    if (existsSync(join(publicDir, PREFIX, name))) return next();
    try {
      if (!cache.has(name)) {
        const upstream = await fetch(UPSTREAM + encodeURIComponent(name), { signal: AbortSignal.timeout(20000) });
        if (!upstream.ok) { res.statusCode = 404; res.end('Sign not found'); return; }
        cache.set(name, await upstream.text());
      }
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.end(cache.get(name));
    } catch {
      res.statusCode = 502; res.end('Sign could not be fetched');
    }
  };
}
