export const DEFAULT_WHATSAPP_NUMBER = '+8801923948150';

export function normalizeWhatsAppNumber(phoneNumber?: string): string {
  const raw = (phoneNumber || '').trim();
  let digits = raw.replace(/[^0-9]/g, '');
  if (!digits || digits === '8801234567890' || digits === '01234567890') {
    return '8801923948150';
  }
  if (digits.length === 11 && digits.startsWith('01')) {
    digits = `88${digits}`;
  }
  return digits;
}

export function resolveDisplayWhatsAppNumber(phoneNumber?: string): string {
  const digits = (phoneNumber || '').replace(/[^0-9]/g, '');
  if (!digits || digits === '8801234567890' || digits === '01234567890') {
    return DEFAULT_WHATSAPP_NUMBER;
  }
  return phoneNumber!.trim();
}

export function buildWhatsAppLink(phoneNumber: string, message: string): string {
  const digits = normalizeWhatsAppNumber(phoneNumber);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${encoded}`;
}

export function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString();
}
