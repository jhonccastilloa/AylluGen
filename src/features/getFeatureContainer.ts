import type { FeatureContainer } from '@/features/container';

let cachedContainer: FeatureContainer | null = null;

export const getFeatureContainer = (): FeatureContainer | null => {
  if (cachedContainer) return cachedContainer;

  try {
    // Lazy-load to avoid runtime issues from module init order in Metro.
    const module = require('@/features/container') as
      | { default?: FeatureContainer; featureContainer?: FeatureContainer }
      | undefined;

    cachedContainer = module?.default ?? module?.featureContainer ?? null;
    return cachedContainer;
  } catch (error) {
    console.warn('Feature container is not available yet', error);
    return null;
  }
};
