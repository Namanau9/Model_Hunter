import { useMemo } from "react";
import { synthesize, toImageData, perturbationImageData } from "../../lib/adversarial/engine";

/** Memoised perturbation pipeline → ready-to-paint ImageData objects. */
export default function useAdversarial(image, { attack, epsilon, steps = 10, seed = 7, view = "signed" }) {
  const result = useMemo(
    () => (image ? synthesize(image, { attack, epsilon, steps, seed }) : null),
    [image, attack, epsilon, steps, seed]
  );
  const original = useMemo(() => (image ? toImageData(image) : null), [image]);
  const adversarial = useMemo(() => (result ? toImageData(result.adv) : null), [result]);
  const perturbation = useMemo(
    () => (result && image ? perturbationImageData(result.delta, image.w, image.h, epsilon, view) : null),
    [result, image, epsilon, view]
  );
  return { result, original, adversarial, perturbation, stats: result?.stats };
}
