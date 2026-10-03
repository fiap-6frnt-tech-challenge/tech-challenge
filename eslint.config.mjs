import shared from './packages/shared/eslint.config.mjs';
import { atomicLayers } from './packages/design-system/eslint.layers.mjs';

export default [...shared, ...atomicLayers('packages/design-system/')];
