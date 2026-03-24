import React, { useMemo } from "react";
import { sanitizeHtml } from "../../utils/sanitize";

export const RichTextDisplay: React.FC<{
  html: string;
  className?: string;
}> = ({ html, className = "" }) => {
  const sanitizedHtml = useMemo(() => sanitizeHtml(html), [html]);

  return (
    <div
      className={`rich-text-display ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

export default RichTextDisplay;
