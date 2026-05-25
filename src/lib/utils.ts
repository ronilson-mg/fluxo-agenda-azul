import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateStr: string | Date): string {
  if (!dateStr) return '';
  
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }
  
  try {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(dateStr));
  } catch (e) {
    return String(dateStr);
  }
}

export function checkBusinessHours(): { isAllowed: boolean; message?: string } {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  
  // LGPD/CDC Compliance: Seg-Sex 08h-18h, Sáb 08h-13h, Dom/Feriado Proibido (Horário de Brasília)
  // For production, we'd ideally use a real time API or server-side time to avoid client-side spoofing,
  // but for the applet demo, this local check is the standard pattern used in Invoices.tsx.
  const isAllowed = day !== 0 && (day === 6 ? hour >= 8 && hour < 13 : hour >= 8 && hour < 18);
  
  if (!isAllowed) {
    return {
      isAllowed: false,
      message: '⚠️ Horário Não Permitido: Conforme LGPD e o Código de Defesa do Consumidor, cobranças só são permitidas de Seg-Sex (08h-18h) e Sáb (08h-13h).'
    };
  }
  
  return { isAllowed: true };
}
