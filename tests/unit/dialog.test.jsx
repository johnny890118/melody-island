// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import CustomDialog from '../../components/CustomDialog';
afterEach(cleanup);
it('labels fields and prevents duplicate asynchronous submissions', async () => {
  let finish;
  const confirm = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(
    <CustomDialog
      title="加入島嶼"
      description="輸入密碼"
      inputs={[{ label: 'password', placeholder: '島嶼密碼', type: 'password' }]}
      onConfirm={confirm}
      triggerLabel="加入"
      confirmLabel="確認加入"
    />,
  );
  fireEvent.click(screen.getByText('加入'));
  fireEvent.change(screen.getByLabelText('島嶼密碼'), { target: { value: 'secret123' } });
  const form = screen.getByText('確認加入').closest('form');
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(confirm).toHaveBeenCalledTimes(1);
  finish();
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
it('keeps the form available after a server error', async () => {
  render(
    <CustomDialog
      title="加入島嶼"
      description="輸入密碼"
      inputs={[]}
      onConfirm={() => Promise.reject(new Error('密碼不正確'))}
      triggerLabel="加入"
      confirmLabel="確認加入"
    />,
  );
  fireEvent.click(screen.getByText('加入'));
  fireEvent.click(screen.getByText('確認加入'));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', '密碼不正確');
});
