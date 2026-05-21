# @bytebank/stores

Shared Zustand stores for apps in the Bytebank monorepo.

## Planned Usage

```ts
import { useAuthStore, useUIStore } from '@bytebank/stores';

const user = useAuthStore((state) => state.user);
const filterPanelOpen = useUIStore((state) => state.filterPanelOpen);
```

## Current Status

Empty Sprint 0 scaffold. Implementation is planned for Sprint 1 in `docs/phase-2/sprint-1-auth-state.md`.
