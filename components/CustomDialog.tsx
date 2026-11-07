'use client';
import { useLocale } from '@/components/LocaleProvider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import React, { useId, useRef, useState } from 'react';
import { errorMessage } from '@/lib/errors';
import type { FormEvent } from 'react';
import { ArrowUpRight, LoaderCircle } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';

export type FormValues = Record<string, string>;
interface DialogInput {
  label: string;
  placeholder: string;
  type?: React.HTMLInputTypeAttribute;
  minLength?: number;
  maxLength?: number;
}
interface CustomDialogProps {
  title: string;
  description: string;
  inputs: DialogInput[];
  onConfirm(values: FormValues): void | Promise<void>;
  triggerLabel: string;
  confirmLabel: string;
  disabled?: boolean;
  initialValues?: FormValues;
}
export default function CustomDialog({
  title,
  description,
  inputs,
  onConfirm,
  triggerLabel,
  confirmLabel,
  disabled = false,
  initialValues = {},
}: CustomDialogProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(initialValues);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const id = useId();
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      await onConfirm(values);
      setOpen(false);
      setValues(initialValues);
    } catch (cause) {
      setError(errorMessage(cause, t('暫時無法完成，請再試一次。')));
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!busy.current) {
          setOpen(value);
          setError('');
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" disabled={disabled} className="action-button">
          <span>{triggerLabel}</span>
          <ArrowUpRight size={18} />
        </Button>
      </DialogTrigger>
      <DialogContent className="island-dialog">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <form onSubmit={submit} className="island-form">
          {inputs.map(({ label, placeholder, type, minLength, maxLength }) => (
            <label key={label} htmlFor={`${id}-${label}`}>
              <span>{placeholder}</span>
              <Input
                id={`${id}-${label}`}
                type={type || 'text'}
                required
                minLength={minLength}
                maxLength={maxLength || 128}
                autoComplete={type === 'password' ? 'off' : undefined}
                value={values[label] || ''}
                disabled={pending}
                onChange={(event) =>
                  setValues((previous) => ({ ...previous, [label]: event.target.value }))
                }
              />
            </label>
          ))}
          {error && (
            <p role="alert" className="form-error">
              {t(error)}
            </p>
          )}
          <Button
            variant="ghost"
            className="action-button primary"
            disabled={pending}
            type="submit"
          >
            {pending ? t('正在處理…') : confirmLabel}
            {pending ? <LoaderCircle size={18} className="spin" /> : <ArrowUpRight size={18} />}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
