import 'server-only';
import { headers } from 'next/headers';
import { preload } from 'react-dom';

const manifestUrls = {
  dashboard: process.env.NEXT_PUBLIC_DASHBOARD_MFE_URL ?? 'http://localhost:3002/mf-manifest.json',
  transactions:
    process.env.NEXT_PUBLIC_TRANSACTIONS_MFE_URL ?? 'http://localhost:3003/mf-manifest.json',
};

type RemoteName = keyof typeof manifestUrls;

export interface RemoteManifest {
  metaData?: {
    publicPath?: string;
    remoteEntry?: { name?: string; path?: string; type?: string };
  };
  exposes?: { name?: string; assets?: { js?: { sync?: string[] } } }[];
}

export function remoteScripts(manifest: RemoteManifest, manifestUrl: string, expose: string) {
  const { publicPath, remoteEntry } = manifest.metaData ?? {};
  const base = !publicPath || publicPath === 'auto' ? manifestUrl : publicPath;
  const entryDir = remoteEntry?.path?.replace(/^\.?\/+|\/+$/g, '');
  const entry =
    remoteEntry?.type === 'global' && remoteEntry.name
      ? [entryDir ? `${entryDir}/${remoteEntry.name}` : remoteEntry.name]
      : [];
  const chunks = manifest.exposes?.find((item) => item.name === expose)?.assets?.js?.sync ?? [];
  return [...entry, ...chunks].map((path) => new URL(path, new URL(base, manifestUrl)).href);
}

async function readManifest(url: string): Promise<RemoteManifest | undefined> {
  try {
    const response = await fetch(url, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(1000),
    });
    return response.ok ? ((await response.json()) as RemoteManifest) : undefined;
  } catch {
    return undefined;
  }
}

export async function preloadRemoteExpose(remote: RemoteName, expose: string): Promise<void> {
  const manifestUrl = manifestUrls[remote];
  const manifest = await readManifest(manifestUrl);
  if (!manifest) return;
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  for (const href of remoteScripts(manifest, manifestUrl, expose)) {
    preload(href, { as: 'script', fetchPriority: 'low', nonce });
  }
}
