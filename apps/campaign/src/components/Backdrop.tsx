/**
 * The cottagecore backdrop: a hand-painted meadow (cherry tree, stone path, river, a little train
 * on a bridge), under a soft green haze so the type and the model stay readable.
 * The painting drifts very slowly, like a camera breathing, so it never feels frozen; the scroll
 * adds its own slow zoom and pan on the wrapper (see HeroSequence). Reduced motion: it stays still.
 */
import { asset } from '../content';

export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="backdrop-media">
        <img
          className="backdrop-art"
          src={asset('bg/meadow.webp')}
          alt=""
          width={1402}
          height={1122}
          decoding="async"
          fetchPriority="high"
        />
      </div>
      <div className="backdrop-haze" />
    </div>
  );
}
