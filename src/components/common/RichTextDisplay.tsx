import React from "react";

export const RichTextDisplay: React.FC<{
  html: string;
  className?: string;
}> = ({ html, className = "" }) => {
  return (
    <div
      className={`rich-text-display ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default RichTextDisplay;
