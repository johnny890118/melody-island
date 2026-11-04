// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import YouTubeFrame from '../../components/YouTubeFrame';

afterEach(() => vi.unstubAllGlobals());

it('creates one iframe after the Strict Mode probe and destroys it only on actual unmount', async () => {
  const destroy = vi.fn();
  const create = vi.fn();
  class FakePlayer {
    destroy = destroy;
    constructor(node: HTMLElement) {
      create();
      node.replaceWith(document.createElement('iframe'));
    }
  }
  vi.stubGlobal('YT', { Player: FakePlayer });
  const view = render(
    <StrictMode>
      <YouTubeFrame
        onReady={vi.fn()}
        onStateChange={vi.fn()}
        onError={vi.fn()}
        onAutoplayBlocked={vi.fn()}
      />
    </StrictMode>,
  );
  await act(async () => {});
  expect(create).toHaveBeenCalledOnce();
  expect(view.container.querySelectorAll('iframe')).toHaveLength(1);
  expect(destroy).not.toHaveBeenCalled();
  view.unmount();
  expect(destroy).toHaveBeenCalledOnce();
});
