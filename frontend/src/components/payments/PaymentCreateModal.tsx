'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { InlineError } from '../ui/ErrorAlert';
import { api } from '../../lib/api';
import { useT, type Dict } from '../../i18n';
import { errorMessage } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { PAYMENT_METHODS } from '../../lib/payments';
import type { PaymentMethodType, PaymentType } from '../../lib/types';

interface TeacherOption {
  id: string;
  fullName: string;
  sessionEnabled: boolean;
  monthlyEnabled: boolean;
  sessionPrice: number;
  monthlyPrice: number;
  methods: Record<PaymentMethodType, string | null>;
}

interface StudentOption {
  id: string;
  fullName: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  role: 'STUDENT' | 'PARENT';
  studentId?: string;
}

export function PaymentCreateModal({ open, onClose, onCreated, role, studentId }: Props) {
  const toast = useToast();
  const { t } = useT();
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [teacherId, setTeacherId] = useState('');
  const [studentSel, setStudentSel] = useState('');
  const [type, setType] = useState<PaymentType>('SESSION');
  const [method, setMethod] = useState<PaymentMethodType | ''>('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setTeacherId('');
    setStudentSel(studentId ?? '');
    setType('SESSION');
    setMethod('');
    setAmount('');
    setReference('');
    setProof(null);
    setErr('');
    api.get<TeacherOption[]>('/payments/teachers').then((r) => setTeachers(r.data)).catch(() => {});
    if (role === 'PARENT') {
      api.get<StudentOption[]>('/payments/students').then((r) => setStudents(r.data)).catch(() => {});
    }
  }, [open, role, studentId]);

  const teacher = useMemo(() => teachers.find((t) => t.id === teacherId), [teachers, teacherId]);

  const typeOptions = useMemo(() => {
    if (!teacher) return [];
    const opts: { value: PaymentType; label: string }[] = [];
    if (teacher.sessionEnabled) opts.push({ value: 'SESSION', label: t('payPerSessionPrice').replace('{price}', String(teacher.sessionPrice)) });
    if (teacher.monthlyEnabled) opts.push({ value: 'MONTHLY', label: t('monthlySubscriptionPrice').replace('{price}', String(teacher.monthlyPrice)) });
    return opts;
  }, [teacher]);

  const methodOptions = useMemo(() => {
    if (!teacher) return [];
    return PAYMENT_METHODS.filter((m) => teacher.methods[m.value]).map((m) => ({
      value: m.value,
      label: `${t(m.labelKey as keyof Dict)} — ${teacher.methods[m.value]}`,
    }));
  }, [teacher, t]);

  useEffect(() => {
    if (teacher) {
      const price = type === 'SESSION' ? teacher.sessionPrice : teacher.monthlyPrice;
      setAmount(String(price));
    }
  }, [teacher, type]);

  const submit = async () => {
    setErr('');
    if (!teacherId) return setErr(t('selectTeacherFirst'));
    if (role === 'PARENT' && !studentSel) return setErr(t('selectStudentFirst'));
    if (!method) return setErr(t('selectMethodFirst'));
    if (!amount || Number(amount) <= 0) return setErr(t('validAmount'));
    if (!proof) return setErr(t('uploadProofFirst'));

    const form = new FormData();
    form.append('teacherId', teacherId);
    form.append('studentId', role === 'PARENT' ? studentSel : (studentId as string));
    form.append('type', type);
    form.append('method', method);
    form.append('amount', amount);
    if (reference) form.append('transactionReference', reference);
    form.append('proof', proof);

    setLoading(true);
    try {
      await api.postForm('/payments', form);
      toast.success(t('paymentSubmittedToast'));
      onCreated();
      onClose();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('newPaymentModalTitle')} size='lg'>
      <div className="space-y-4">
        {role === 'PARENT' && (
          <Select
            label={t('selectStudent')}
            placeholder={t('selectStudent')}
            options={students.map((s) => ({ value: s.id, label: s.fullName }))}
            value={studentSel}
            onChange={(e) => setStudentSel(e.target.value)}
          />
        )}
        <Select
          label={t('selectTeacher')}
          placeholder={t('selectTeacher')}
          options={teachers.map((t) => ({ value: t.id, label: t.fullName }))}
          value={teacherId}
          onChange={(e) => {
            setTeacherId(e.target.value);
            setMethod('');
          }}
        />
        {teacher && (
          <>
            <Select
              label={t('paymentType')}
              options={typeOptions}
              value={type}
              onChange={(e) => setType(e.target.value as PaymentType)}
            />
            <Select
              label={t('method')}
              placeholder={t('selectMethodFirst')}
              options={methodOptions}
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethodType)}
            />
            <Input
              label={t('amountLabel')}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Input
              label={t('referenceOptionalLabel')}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{t('paymentProofLabel')}</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProof(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
              />
            </div>
          </>
        )}
        {err && <InlineError message={err} />}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button onClick={submit} loading={loading} disabled={!teacher}>
            {t('submitPayment')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
