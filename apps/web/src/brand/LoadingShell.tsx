import { MatrixLoader } from '../components/MatrixLoader';
import { brandText } from './brand-text';
import { useWebBrand } from './use-brand';

/**
 * The pre-mount loading screen. Keeps the `od-loading-shell` class on the outer
 * node: the white-screen detector filters this whole subtree out by that class
 * when deciding whether the app really mounted (`src/observability/white-screen.ts`).
 */
export function LoadingShell() {
  const brand = useWebBrand();
  return (
    <div className="od-loading-shell">
      <MatrixLoader />
      <span>{brandText('Loading OpenDesign…', brand)}</span>
    </div>
  );
}
