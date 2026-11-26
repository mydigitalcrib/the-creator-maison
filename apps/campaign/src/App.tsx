import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect } from 'react';
import { AboutPanel, BriefPanel, IndexPanel, ProofPanel, WorkPanel } from './components/Chapters';
import { Header } from './components/Header';
import { HeroSequence } from './components/HeroSequence';
import { DrawerProvider } from './components/VideoDrawer';
import { useImmersive } from './immersive';

/**
 * One page, no menu. On desktop everything happens inside the pinned scene as you scroll.
 * On small screens or with reduced motion, the chapters are stacked under the scene instead.
 */
export function App() {
  const immersive = useImmersive();

  // load every font style up front (not the first time a chapter uses it), then re-measure
  useEffect(() => {
    const styles = ['300 1em Fraunces', 'italic 300 1em Fraunces', '400 1em Fraunces', 'italic 400 1em Fraunces', '500 1em Fraunces'];
    Promise.all(styles.map((f) => document.fonts?.load(f)))
      .catch(() => {})
      .then(() => document.fonts?.ready)
      .then(() => ScrollTrigger.refresh());
  }, []);

  return (
    <DrawerProvider>
      <Header />
      <main id="main">
        <HeroSequence immersive={immersive} />
        {!immersive && (
          <div className="stacked">
            <WorkPanel active={false} stacked />
            <IndexPanel active={false} stacked />
            <AboutPanel active={false} stacked />
            <ProofPanel active={false} stacked />
            <BriefPanel active={false} stacked />
          </div>
        )}
      </main>
    </DrawerProvider>
  );
}
