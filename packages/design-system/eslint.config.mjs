import shared from '../shared/eslint.config.mjs';
import { sharedDeprecations } from '../../eslint.boundaries.mjs';
import { atomicLayers } from './eslint.layers.mjs';

export default [...shared, ...atomicLayers(), ...sharedDeprecations()];
