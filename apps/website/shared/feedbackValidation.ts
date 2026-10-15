export const MAX_FEEDBACK_MESSAGE_LENGTH = 3000;

const EMAIL_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;

export function isFeedbackEmail(value: string): boolean {
  if (value.length > 254 || /[\s\u0000-\u001f\u007f]/.test(value)) return false;
  const localPart = value.slice(0, value.lastIndexOf('@'));
  return localPart.length > 0 && localPart.length <= 64
    && !localPart.startsWith('.') && !localPart.endsWith('.')
    && !localPart.includes('..') && EMAIL_PATTERN.test(value);
}
