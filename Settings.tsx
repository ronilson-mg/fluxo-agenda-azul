import { useState, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let toastCount = 0;
let listeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

export const showToast = (message: string, type: ToastType = 'success') => {
  const id = ++toastCount;
  toasts = [...toasts, { id, message, type }];
  listeners.forEach(l => l(toasts));

  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    listeners.forEach(l => l(toasts));
  }, 3000);
};

export const useToasts = () => {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>(toasts);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => setCurrentToasts(newToasts);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);

  return currentToasts;
};
