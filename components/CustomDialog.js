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

      <DialogContent className="glass-panel liquid-glass mx-auto max-w-[92vw] rounded-2xl border-white/20 p-6 text-white sm:max-w-lg">
        <div className="relative z-10 space-y-6">
          <DialogTitle className="text-xl font-black text-[#fff8e1] sm:text-2xl">{title}</DialogTitle>
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
                className="w-full rounded-full border border-white/15 bg-white/[0.08] px-4 py-2 text-white placeholder:text-white/45 focus:border-[#8df5ff]/70 focus:outline-none focus:ring-2 focus:ring-[#8df5ff]/20"
              />
            ))}
          </div>

          <Button
            onClick={handleConfirm}
            className="glass-button-primary w-full rounded-full py-2.5 font-bold"
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomDialog;
