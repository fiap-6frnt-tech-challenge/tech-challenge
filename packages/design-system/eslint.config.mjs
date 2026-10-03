import shared from '../shared/eslint.config.mjs';
import { atomicLayers } from './eslint.layers.mjs';

export default [...shared, ...atomicLayers()];
