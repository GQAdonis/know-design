'use client';

import { useEffect } from 'react';
import { brandText } from './brand-text';
import { useWebBrand } from './use-brand';

/** Rewrites the static `<title>` and stamps `data-brand` once the profile is known. */
export function BrandDocumentTitle(): null {
  const brand = useWebBrand();
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (brand.id === 'knowdesign') document.documentElement.dataset.brand = 'knowdesign';
    else delete document.documentElement.dataset.brand;
    const next = brandText(document.title, brand);
    if (next !== document.title) document.title = next;
  }, [brand]);
  return null;
}
