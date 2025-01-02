"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const CustomDialog = ({
    title,
    description,
    inputs,
    onConfirm,
    triggerLabel,
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
            <DialogTrigger asChild>
                <Button>{triggerLabel}</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
                <div className="space-y-4">
                    {inputs.map(({ label, placeholder, type }, index) => (
                        <Input
                            key={index}
                            type={type || "text"}
                            placeholder={placeholder}
                            value={values[label] || ""}
                            onChange={(e) =>
                                handleChange(label, e.target.value)
                            }
                            className="w-full"
                        />
                    ))}
                </div>
                <Button onClick={handleConfirm} className="mt-4 w-full">
                    Confirm
                </Button>
            </DialogContent>
        </Dialog>
    );
};

export default CustomDialog;
