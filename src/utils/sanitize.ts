export function sanitizeHtml(html: string): string {
  if (!html) return '';
  let safeHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  safeHtml = safeHtml.replace(/on\w+="[^"]*"/gi, '');
  safeHtml = safeHtml.replace(/on\w+='[^']*'/gi, '');
  safeHtml = safeHtml.replace(/href="javascript:[^"]*"/gi, 'href="#"');
  safeHtml = safeHtml.replace(/href='javascript:[^']*'/gi, "href='#'");
  return safeHtml;
}
