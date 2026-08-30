import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, Clock, Send } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { errorMessage } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useT } from '../../i18n';
import type { Exam, ExamQuestion } from '../../lib/types';

interface StartResponse {
  attempt: { id: string; status: string; score: number | null; percentage: number | null; maxScore: number | null };
  questions: ExamQuestion[];
  alreadySubmitted: boolean;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function ExamTakingPage() {
  const { t } = useT();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();
  const [startData, setStartData] = useState<StartResponse | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const submittedRef = useRef(false);

  useEffect(() => {
    let active = true;
    Promise.all([api.get<Exam>(`/exams/${id}`), api.post<StartResponse>(`/exams/${id}/start`)])
      .then(([examRes, startRes]) => {
        if (!active) return;
        setExam(examRes.data);
        setStartData(startRes.data);
        const initial: Record<string, string> = {};
        for (const q of startRes.data.questions) {
          const savedAnswer = (startRes.data.attempt as unknown as { answers: { questionId: string; answer: string | null }[] }).answers?.find(
            (a) => a.questionId === q.id,
          );
          if (savedAnswer?.answer != null) initial[q.id] = savedAnswer.answer;
        }
        setAnswers(initial);
        setTimeLeft(new Date(examRes.data.endTime).getTime() - Date.now());
      })
      .catch((err) => {
        if (active) setLoadError(errorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (timeLeft === null || startData?.alreadySubmitted) return;
    const timer = setInterval(() => setTimeLeft(new Date(exam?.endTime ?? Date.now()).getTime() - Date.now()), 1000);
    return () => clearInterval(timer);
  }, [timeLeft === null, exam?.endTime, startData?.alreadySubmitted]);

  const doSubmit = async () => {
    if (!startData || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await api.post<{ attempt: { id: string } }>(`/exams/attempts/${startData.attempt.id}/submit`);
      router.replace(`/student/exams/results/${res.data.attempt.id}`);
    } catch (err) {
      submittedRef.current = false;
      setSubmitting(false);
      setSubmitError(errorMessage(err));
      setConfirmOpen(false);
    }
  };

  useEffect(() => {
    if (timeLeft === null || timeLeft > 0 || startData?.alreadySubmitted) return;
    void doSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const saveAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    if (!startData) return;
    setSaved((prev) => ({ ...prev, [questionId]: 'saving' }));
    api
      .post(`/exams/attempts/${startData.attempt.id}/answers/${questionId}`, { answer: answer || null })
      .then(() => setSaved((prev) => ({ ...prev, [questionId]: 'saved' })))
      .catch(() => setSaved((prev) => ({ ...prev, [questionId]: 'error' })));
  };

  if (loading) return <PencilLoader label={t('preparingExam')} />;
  if (loadError) return <Alert message={loadError} />;
  if (!startData || !exam) return null;

  if (startData.alreadySubmitted) {
    const a = startData.attempt;
    return (
      <div className="mx-auto max-w-xl">
        <Card className="p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{t('alreadySubmitted')}</h2>
          <p className="mt-1 text-sm text-slate-500">{exam.name}</p>
          {a.percentage !== null && (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
              {t('score')}: <span className="text-lg font-bold text-slate-900 dark:text-white">{a.percentage}%</span>
              {a.score !== null && a.maxScore !== null && ` (${a.score}/${a.maxScore})`}
            </p>
          )}
          <div className="mt-6">
            <Button onClick={() => router.push(`/student/exams/results/${a.id}`)}>{t('viewFullResult')}</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{exam.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {exam.questions.length} {t('questionsCount')} · {exam.durationMinutes} {t('minutesShort')}
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
            timeLeft !== null && timeLeft < 5 * 60 * 1000 ? 'bg-red-50 text-red-700' : 'bg-brand-50 text-brand-700'
          }`}
        >
          <Clock className="h-4 w-4" />
          {timeLeft !== null ? formatCountdown(timeLeft) : '…'}
        </div>
      </div>

      {submitError && <Alert message={submitError} className="mb-4" />}

      <div className="space-y-4">
        {startData.questions.map((q, i) => (
          <Card key={q.id} bodyClassName="space-y-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {i + 1}. {q.question}
              </p>
              <span className="shrink-0 text-xs font-medium text-slate-400">{q.points} {t('points')}</span>
            </div>
            {q.type === 'MULTIPLE_CHOICE' && (
              <div className="space-y-2">
                {q.options?.map((opt) => {
                  const checked = answers[q.id] === opt;
                  return (
                    <label
                      key={opt}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                        checked ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40 dark:bg-slate-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={opt}
                        checked={checked}
                        onChange={(e) => saveAnswer(q.id, e.target.value)}
                        className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>
            )}
            {q.type === 'TRUE_FALSE' && (
              <div className="flex gap-3">
                {['true', 'false'].map((opt) => {
                  const checked = answers[q.id] === opt;
                  return (
                    <label
                      key={opt}
                      className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${
                        checked ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40 dark:bg-slate-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={opt}
                        checked={checked}
                        onChange={(e) => saveAnswer(q.id, e.target.value)}
                        className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      {opt === 'true' ? t('trueOption') : t('falseOption')}
                    </label>
                  );
                })}
              </div>
            )}
            {q.type === 'WRITTEN' && (
              <>
                <Textarea
                  rows={4}
                  placeholder={t('typeYourAnswer')}
                  value={answers[q.id] ?? ''}
                  onChange={(e) => saveAnswer(q.id, e.target.value)}
                />
                <p className="text-[11px] text-slate-400">{t('answersSavedNote')}</p>
              </>
            )}
            <div className="flex items-center justify-end gap-2 text-xs">
              {saved[q.id] === 'saving' && <span className="text-slate-400">{t('savingAnswer')}</span>}
              {saved[q.id] === 'saved' && <span className="text-emerald-600">{t('savedAnswer')}</span>}
              {saved[q.id] === 'error' && <span className="text-red-600">{t('saveFailedRetry')}</span>}
            </div>
          </Card>
        ))}
      </div>

      <div className="sticky bottom-4 mt-6 flex justify-end">
        <Button size="lg" onClick={() => setConfirmOpen(true)}>
          <Send className="h-4 w-4" /> {t('submitExam')}
        </Button>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('submitExamConfirm')}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>{t('keepWorking')}</Button>
            <Button onClick={doSubmit} loading={submitting}>{t('submitNow')}</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t('submitExamWarning')}
        </p>
      </Modal>
    </div>
  );
}
