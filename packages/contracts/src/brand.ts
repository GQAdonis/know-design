// The pure brand descriptor, re-exported so the web client can resolve the brand
// without depending on the release package directly. `resolveBrand` is left out on
// purpose: it defaults to `process.env`, which contracts must not touch.
export {
  BRANDS,
  KNOWDESIGN_BRAND,
  OPEN_DESIGN_BRAND,
  brandById,
  type BrandDescriptor,
  type BrandId,
} from '@open-design/release';
