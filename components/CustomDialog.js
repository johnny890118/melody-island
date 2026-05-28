'use client';

import React, { useState } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';

const CustomDialog = ({
  title,
  description,
  inputs,
  onConfirm,
  triggerLabel,
  confirmLabel,
  disabled = false,
}) => {
  const [values, setValues] = useState({});

  const handleChange = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleConfirm = () => {
    onConfirm(values);
  };

  return (
    <Dialog>
      {disabled ? (
        <div className="glass-button flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-lg px-3 py-2.5 text-center text-xs font-bold leading-tight opacity-50 sm:text-sm">
          {triggerLabel}
        </div>
      ) : (
        <DialogTrigger className="heroBtn">{triggerLabel}</DialogTrigger>
      )}

      <DialogContent className="glass-panel mx-auto max-w-lg rounded-lg p-6 text-white">
        <div className="space-y-6">
          <DialogTitle className="text-lg font-bold text-[#fff8e1] sm:text-xl">{title}</DialogTitle>
          <DialogDescription className="text-sm text-[#dfe7dc] sm:text-base">
            {description}
          </DialogDescription>

          <div className="space-y-4">
            {inputs.map(({ label, placeholder, type }, index) => (
              <Input
                key={index}
                type={type || 'text'}
                placeholder={placeholder}
                value={values[label] || ''}
                onChange={(e) => handleChange(label, e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/25 px-4 py-2 text-white placeholder:text-white/40 focus:border-[#f5d77a]/60 focus:outline-none focus:ring-2 focus:ring-[#f5d77a]/20"
              />
            ))}
          </div>

          <Button
            onClick={handleConfirm}
            className="glass-button-primary w-full rounded-lg py-2 font-bold"
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomDialog;
