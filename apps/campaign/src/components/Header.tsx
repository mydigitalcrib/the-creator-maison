import { profile } from '../content';
import { goToBrief } from '../immersive';

const [first, ...others] = profile.name.split(' ');
const rest = others.join(' ');

/** Name on the left; "Send a brief" glides to the last chapter (same page, no menu). */
export function Header() {
  return (
    <header className="site-header">
      <p className="brand">
        <span className="brand-mark">
          {first} <em>{rest}</em>
        </span>
        <span className="label muted brand-meta">{profile.role}</span>
      </p>
      <button type="button" className="nav-cta label" onClick={goToBrief}>
        Send a brief
      </button>
    </header>
  );
}
