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
        <div className="bg-gray-800 text-[#fff8e1] font-bold p-4 rounded-xl w-full sm:w-96 opacity-50 cursor-not-allowed flex justify-center">
          {triggerLabel}
        </div>
      ) : (
        <DialogTrigger className="bg-gray-800 text-[#fff8e1] font-bold p-4 rounded-xl hover:bg-[#fff8e1] hover:text-gray-800 transition w-full sm:w-96 active:scale-95">
          {triggerLabel}
        </DialogTrigger>
      )}

      <DialogContent className="bg-gray-900 text-white max-w-lg mx-auto p-6 rounded-lg">
        <div className="space-y-6">
          <DialogTitle className="text-lg sm:text-xl font-bold text-[#fff8e1]">{title}</DialogTitle>
          <DialogDescription className="text-sm sm:text-base text-gray-300">
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
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ))}
          </div>

          <Button
            onClick={handleConfirm}
            className="w-full font-bold py-2 rounded-md bg-[#fff8e1] text-gray-800 hover:bg-[#fff8e1] hover:text-gray-800 transition-transform transform active:scale-95"
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomDialog;
