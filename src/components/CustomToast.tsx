// src/components/CustomToast.tsx

import React, { useEffect } from 'react';
import { Toast, ToastProps } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';

interface CustomToastProps {
  message: string;
  type?: 'default' | 'destructive';
  duration?: number;
}

export const CustomToast: React.FC<CustomToastProps> = ({ message, type = 'default', duration = 3000 }) => {
  const { toast } = useToast();

  useEffect(() => {
    if (message) {
      toast({
        variant: type,
        description: message,
        duration: duration,
      });
    }
  }, [message, type, duration, toast]);

  return null;
};