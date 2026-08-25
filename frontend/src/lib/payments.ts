import type { PaymentMethodType, PaymentStatusType, PaymentType } from './types';
import type { Dict } from '../i18n/ar';

/**
 * Single source of truth for the payment methods the backend supports
 * (mirrors the Prisma `PaymentMethod` enum). `labelKey` maps each method to
 * its translation key so labels follow the active language.
 */
export const PAYMENT_METHODS: {
  value: PaymentMethodType;
  label: string;
  labelKey: keyof Dict;
  placeholder: string;
}[] = [
  { value: 'VODAFONE_CASH', label: 'Vodafone Cash', labelKey: 'vodafoneCash', placeholder: '010XXXXXXXX' },
  { value: 'ETISALAT_CASH', label: 'Etisalat Cash', labelKey: 'etisalatCash', placeholder: '011XXXXXXXX' },
  { value: 'ORANGE_CASH', label: 'Orange Cash', labelKey: 'orangeCash', placeholder: '012XXXXXXXX' },
  { value: 'INSTAPAY', label: 'InstaPay', labelKey: 'instaPay', placeholder: 'username / payment address' },
  { value: 'TELDA', label: 'Telda', labelKey: 'telda', placeholder: 'payment identifier' },
];

export const PAYMENT_TYPE_OPTIONS: { value: PaymentType; labelKey: keyof Dict; label: string }[] = [
  { value: 'SESSION', labelKey: 'payPerSession', label: 'Pay Per Session' },
  { value: 'MONTHLY', labelKey: 'monthlySubscription', label: 'Monthly Subscription' },
];

export const PAYMENT_STATUS_OPTIONS: { value: PaymentStatusType; labelKey: keyof Dict; label: string }[] = [
  { value: 'PENDING', labelKey: 'paymentStatusPending', label: 'Pending' },
  { value: 'PAID', labelKey: 'paymentStatusPaid', label: 'Paid' },
  { value: 'REJECTED', labelKey: 'paymentStatusRejected', label: 'Rejected' },
  { value: 'EXPIRED', labelKey: 'paymentStatusExpired', label: 'Expired' },
  { value: 'REFUNDED', labelKey: 'paymentStatusRefunded', label: 'Refunded' },
];

export function paymentStatusLabel(
  status: PaymentStatusType,
  t?: (k: keyof Dict) => string,
): string {
  const opt = PAYMENT_STATUS_OPTIONS.find((s) => s.value === status);
  if (t && opt) return t(opt.labelKey);
  return opt?.label ?? status;
}

/** Localized status filter list ("All statuses" + every status). */
export function paymentStatusFilters(t: (k: keyof Dict) => string) {
  return [
    { value: '', label: t('allStatus') },
    ...PAYMENT_STATUS_OPTIONS.map((s) => ({ value: s.value, label: t(s.labelKey) })),
  ];
}
