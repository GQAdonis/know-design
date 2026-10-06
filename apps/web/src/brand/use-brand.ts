import { useCallback } from 'react';
import type { BrandDescriptor } from '@open-design/contracts';
import { useWebBuildProfile } from '../collab/build-profile';
import { brandForProfile, brandText } from './brand-text';

/** The active brand; re-renders the caller when the profile arrives late. */
export function useWebBrand(): BrandDescriptor {
  return brandForProfile(useWebBuildProfile());
}

/** A render-time string branding function that re-renders on profile change. */
export function useBrandText(): (text: string) => string {
  const brand = useWebBrand();
  return useCallback((text: string) => brandText(text, brand), [brand]);
}
