import React, { useMemo } from "react";
import DOMPurify from "dompurify";

/**
 * Affiche du HTML riche (notes du coach, consignes) chez l'athlète.
 *
 * SÉCURITÉ : le contenu est injecté via dangerouslySetInnerHTML. Il est
 * systématiquement sanitisé avec DOMPurify pour neutraliser tout HTML
 * malveillant (script, gestionnaires onerror/onclick, etc.). C'est le point
 * de rendu unique des blocs-texte (template + notes par semaine), donc
 * sanitiser ici couvre tous les appelants.
 */
export const RichTextDisplay: React.FC<{
  html: string;
  className?: string;
}> = ({ html, className = "" }) => {
  const clean = useMemo(() => DOMPurify.sanitize(html ?? ""), [html]);
  return (
    <div
      className={`rich-text-display ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
};

export default RichTextDisplay;
