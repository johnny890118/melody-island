// Search results and existing room documents can contain YouTube's escaped titles.
// Decode once for plain-text rendering; never interpret the result as HTML.
const namedEntities: ReadonlyMap<string, string> = new Map([
  ['amp', '&'],
  ['apos', "'"],
  ['quot', '"'],
  ['lt', '<'],
  ['gt', '>'],
]);

export function displayYouTubeTitle(title: string): string {
  return title.replace(/&(#(?:[0-9]+|[xX][0-9a-fA-F]+)|amp|apos|quot|lt|gt);/g, (entity, name: string) => {
    if (!name.startsWith('#')) return namedEntities.get(name) ?? entity;
    const hexadecimal = name[1]?.toLowerCase() === 'x';
    const codePoint = Number.parseInt(name.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
    if (!codePoint || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) return entity;
    return String.fromCodePoint(codePoint);
  });
}
