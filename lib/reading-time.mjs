const MEDIA_DURATION = /\bdata-roof-(?:audio|video)-duration="([1-9]\d*)"/gu;

export function plainText(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function mediaDurationSeconds(html) {
  return [...html.matchAll(MEDIA_DURATION)].reduce(
    (total, match) => total + Number(match[1]),
    0,
  );
}

export function readMinutes(html) {
  const text = plainText(html);
  const cjk = (text.match(/[㐀-鿿豈-﫿]/g) || []).length;
  const latin = (text.match(/[A-Za-z0-9]+/g) || []).length;
  const mediaMinutes = mediaDurationSeconds(html) / 60;
  return Math.max(1, Math.round((cjk + latin) / 400 + mediaMinutes));
}
