import {
  accountOverviewQuery,
  dashboardSummaryQuery,
  queryClient,
  transactionsPageQuery,
} from '@bytebank/api-client';
import { fromBrowserSearchParams } from '@bytebank/core';
import { onContentReady, shouldPrefetch, whenIdle } from '@bytebank/shared';

type Federation = typeof import('./federation');

interface RoutePreload {
  remotes: (federation: Federation) => void;
  data: (search: URLSearchParams) => void;
}

const routes: Record<string, RoutePreload> = {
  '/': {
    remotes: (federation) => {
      federation.preloadAccountOverview();
      federation.preloadDashboard();
    },
    data: () => {
      void queryClient.prefetchQuery(accountOverviewQuery());
      void queryClient.prefetchQuery(dashboardSummaryQuery());
    },
  },
  '/transactions': {
    remotes: (federation) => federation.preloadTransactionsPage(),
    data: (search) => {
      const { filter, page } = fromBrowserSearchParams(search);
      void queryClient.prefetchQuery(transactionsPageQuery({ ...filter, page }));
    },
  },
};

const likelyNextRoute: Record<string, string> = {
  '/': '/transactions',
  '/transactions': '/',
};

const currentRouteRemote: Record<string, (federation: Federation) => void> = {
  '/': (federation) => federation.preloadAccountOverview(),
  '/transactions': (federation) => federation.preloadTransactionsPage(),
};

const currentRouteReady: Record<string, string> = {
  '/': 'overview',
  '/transactions': 'transactions',
};

function preloadRemotes(route: RoutePreload) {
  import('./federation').then(route.remotes, () => undefined);
}

export function preloadRoute(href: string) {
  if (!shouldPrefetch()) return;
  const url = new URL(href, window.location.origin);
  const route = routes[url.pathname];
  if (!route) return;
  route.data(url.searchParams);
  preloadRemotes(route);
}

export function preloadLikelyNextRoute(pathname: string) {
  const next = likelyNextRoute[pathname];
  if (!next || !shouldPrefetch()) return;
  preloadRemotes(routes[next]);
}

export function preloadCurrentRoute(pathname: string) {
  const remote = currentRouteRemote[pathname];
  if (!remote || !shouldPrefetch()) return;
  import('./federation').then(remote, () => undefined);
}

export function preloadLikelyNextRouteWhenReady(pathname: string): () => void {
  const ready = currentRouteReady[pathname];
  if (!ready) return () => undefined;
  let cancelIdle = () => {};
  const stopWaiting = onContentReady(ready, () => {
    cancelIdle = whenIdle(() => preloadLikelyNextRoute(pathname));
  });
  return () => {
    stopWaiting();
    cancelIdle();
  };
}
