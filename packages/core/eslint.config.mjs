import base from '../shared/eslint.config.mjs';
import { coreBoundaries } from '../../eslint.boundaries.mjs';

export default [...base, ...coreBoundaries()];
