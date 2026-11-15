import shared from './packages/shared/eslint.config.mjs';
import { atomicLayers } from './packages/design-system/eslint.layers.mjs';
import {
  coreBoundaries,
  mfeBoundaries,
  sharedDeprecations,
  shellBoundaries,
} from './eslint.boundaries.mjs';

export default [
  ...shared,
  ...atomicLayers('packages/design-system/'),
  ...coreBoundaries('packages/core/'),
  ...mfeBoundaries('apps/*-mfe/'),
  ...shellBoundaries('apps/shell/'),
  ...sharedDeprecations(['apps/shell/src/lib/federation.ts']),
];
