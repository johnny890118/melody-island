import { describe, expect, it } from 'vitest';
import { displayYouTubeTitle } from '../../lib/youtube-title';

describe('YouTube titles', () => {
  it('displays encoded punctuation in existing playlist entries', () => {
    expect(displayYouTubeTitle('蒲公英的約定 A Dandelion&#39;s Promise')).toBe("蒲公英的約定 A Dandelion's Promise");
    expect(displayYouTubeTitle('&quot;Live&quot; &#x1F3B5; &amp; &#X27;')).toBe('"Live" 🎵 & \'');
  });

  it('decodes once and preserves malformed or unsupported entities', () => {
    expect(displayYouTubeTitle('&amp;#39; &unknown; &#xD800; &#999999999;')).toBe('&#39; &unknown; &#xD800; &#999999999;');
  });
});
