import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(err) {
  return err?.response?.data?.error?.message || err?.message || 'An unexpected error occurred';
}

export function getFieldErrors(err) {
  return err?.response?.data?.error?.fields || {};
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
