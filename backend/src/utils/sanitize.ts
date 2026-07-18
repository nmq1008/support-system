import sanitizeHtml from 'sanitize-html';

/** Strip all HTML — used for titles, labels and other plain-text fields. */
export function plainText(input: unknown): string {
  if (input == null) return '';
  return sanitizeHtml(String(input), { allowedTags: [], allowedAttributes: {} }).trim();
}

/** Allow a safe subset of rich text for comment / description bodies (XSS-safe). */
export function richText(input: unknown): string {
  if (input == null) return '';
  return sanitizeHtml(String(input), {
    allowedTags: ['b', 'i', 'em', 'strong', 'u', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote'],
    allowedAttributes: { a: ['href', 'title', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
    },
  }).trim();
}
