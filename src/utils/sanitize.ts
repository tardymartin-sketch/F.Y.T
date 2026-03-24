/**
 * Simple HTML sanitizer to prevent XSS while allowing basic rich text tags.
 * Whitelist approach: only specific tags and attributes are allowed.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // Use a DOM-based approach (works in browser)
  if (typeof window !== 'undefined' && window.DOMParser) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;

    // Allowed tags and their allowed attributes
    const allowedTags: Record<string, string[]> = {
      'p': ['style', 'class'],
      'br': [],
      'strong': ['style', 'class'],
      'b': ['style', 'class'],
      'em': ['style', 'class'],
      'i': ['style', 'class'],
      'u': ['style', 'class'],
      'h1': ['style', 'class'],
      'h2': ['style', 'class'],
      'h3': ['style', 'class'],
      'h4': ['style', 'class'],
      'h5': ['style', 'class'],
      'h6': ['style', 'class'],
      'ul': ['style', 'class'],
      'ol': ['style', 'class'],
      'li': ['style', 'class'],
      'span': ['style', 'class', 'data-color'],
      'div': ['style', 'class'],
      'a': ['href', 'target', 'rel', 'style', 'class', 'title'],
      // Expanded SVG whitelist for icons and badges
      'svg': ['viewbox', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'class', 'xmlns', 'style', 'opacity', 'transform'],
      'path': ['d', 'fill', 'stroke', 'stroke-width', 'class', 'opacity', 'transform', 'stroke-linecap', 'stroke-linejoin'],
      'circle': ['cx', 'cy', 'r', 'fill', 'stroke', 'stroke-width', 'class', 'opacity', 'transform'],
      'rect': ['x', 'y', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'class', 'opacity', 'transform', 'rx', 'ry'],
      'line': ['x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width', 'class', 'opacity', 'transform', 'stroke-linecap'],
      'polyline': ['points', 'fill', 'stroke', 'stroke-width', 'class', 'opacity', 'transform', 'stroke-linecap', 'stroke-linejoin'],
      'polygon': ['points', 'fill', 'stroke', 'stroke-width', 'class', 'opacity', 'transform', 'stroke-linecap', 'stroke-linejoin'],
      'ellipse': ['cx', 'cy', 'rx', 'ry', 'fill', 'stroke', 'stroke-width', 'class', 'opacity', 'transform'],
      'g': ['fill', 'stroke', 'stroke-width', 'class', 'opacity', 'transform', 'stroke-linecap', 'stroke-linejoin'],
      'text': ['x', 'y', 'fill', 'stroke', 'stroke-width', 'class', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'opacity', 'transform'],
      'tspan': ['x', 'y', 'dx', 'dy', 'fill', 'stroke', 'stroke-width', 'class', 'opacity', 'transform'],
    };

    const sanitizeElement = (element: Element) => {
      const tagName = element.tagName.toLowerCase();

      // Clean attributes first
      const allowedAttrs = allowedTags[tagName] || [];
      const attrs = Array.from(element.attributes);
      for (const attr of attrs) {
        const attrName = attr.name.toLowerCase();

        // Remove event handlers (on*) - critical for security
        if (attrName.startsWith('on')) {
          element.removeAttribute(attr.name);
          continue;
        }

        if (!allowedAttrs.includes(attrName)) {
          element.removeAttribute(attr.name);
          continue;
        }

        // Special check for href/src to prevent javascript: protocol
        if (attrName === 'href' || attrName === 'src') {
          const val = attr.value.toLowerCase().trim();
          if (val.startsWith('javascript:') || val.startsWith('data:') || val.startsWith('vbscript:')) {
            element.setAttribute(attr.name, '#');
          }
        }

        // Special check for style to prevent expression() or other exploits
        if (attrName === 'style') {
           const val = attr.value.toLowerCase();
           if (val.includes('expression') || val.includes('url(') || val.includes('javascript:')) {
               element.removeAttribute(attr.name);
           }
        }
      }

      // Recursively sanitize children BEFORE potentially removing the current element
      const children = Array.from(element.children);
      children.forEach(sanitizeElement);

      // Now check if the tag itself is allowed
      if (!allowedTags[tagName]) {
        // Tag is not allowed, move its children to the parent and remove it
        while (element.firstChild) {
          element.parentNode?.insertBefore(element.firstChild, element);
        }
        element.parentNode?.removeChild(element);
      }
    };

    // First, remove all script tags entirely
    const scripts = Array.from(body.getElementsByTagName('script'));
    scripts.forEach(s => s.parentNode?.removeChild(s));

    // Sanitize all elements starting from the body's direct children
    const bodyChildren = Array.from(body.children);
    bodyChildren.forEach(sanitizeElement);

    // Remove comments
    const iterator = doc.createNodeIterator(body, NodeFilter.SHOW_COMMENT);
    let currentNode;
    while (currentNode = iterator.nextNode()) {
      currentNode.parentNode?.removeChild(currentNode);
    }

    return body.innerHTML;
  }

  // Fallback for non-browser environment (SSR)
  // This is a minimal fallback that removes obvious script tags and event handlers.
  // In a real SSR scenario, a library like 'jsdom' would be used with the logic above.
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
             .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
             .replace(/javascript\s*:\s*[^\s>]+/gi, '#');
}
