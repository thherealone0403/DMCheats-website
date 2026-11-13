import executorCover from '../assets/images/cobalt_executor_cover_1794598527419.jpg';
import vanityCover from '../assets/images/cobalt_monolith_cover_1794598528148.jpg';
import type { Product } from '../types';

export function resolveProductCover(coverKey: Product['coverKey']): string | null {
  if (coverKey === 'executor') return executorCover;
  if (coverKey === 'vanity') return vanityCover;
  return null;
}
