import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RichTextDisplay } from './RichTextDisplay';

// feat/coach-notes-per-week (D5) : RichTextDisplay est le point de rendu unique
// des notes coach (injectées via dangerouslySetInnerHTML). Il DOIT sanitiser le
// HTML (DOMPurify) pour neutraliser tout XSS stocké affiché chez l'athlète.

describe('RichTextDisplay — sanitisation XSS', () => {
  it('retire <script> et les handlers inline (onerror)', () => {
    const out = renderToStaticMarkup(
      <RichTextDisplay html={'<img src=x onerror="alert(1)"><script>alert(2)</script><p>ok</p>'} />,
    );
    expect(out).not.toContain('onerror');
    expect(out.toLowerCase()).not.toContain('<script');
    expect(out).toContain('<p>ok</p>');
  });

  it('préserve le HTML légitime (gras, listes)', () => {
    const out = renderToStaticMarkup(
      <RichTextDisplay html={'<p><strong>Gras</strong></p><ul><li>item</li></ul>'} />,
    );
    expect(out).toContain('<strong>Gras</strong>');
    expect(out).toContain('<li>item</li>');
  });

  it('contenu vide → pas de crash', () => {
    const out = renderToStaticMarkup(<RichTextDisplay html={''} />);
    expect(out).toContain('rich-text-display');
  });
});
