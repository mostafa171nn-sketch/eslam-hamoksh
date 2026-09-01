'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { Card } from '../../../../src/components/ui/Card';
import { Button } from '../../../../src/components/ui/Button';
import { PencilLoader } from '../../../../src/components/ui/PencilLoader';
import { Alert } from '../../../../src/components/ui/ErrorAlert';
import { CenterCard } from '../../../../src/components/centers/CenterCard';
import { api, type PublicCenter } from '../../../../src/lib/api';
import { errorMessage } from '../../../../src/hooks/useApi';
import { useToast } from '../../../../src/context/ToastContext';
import { useT } from '../../../../src/i18n';

export default function FollowedCentersPage() {
  const { t } = useT();
  const [centers, setCenters] = useState<PublicCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getFollowedCenters();
      setCenters((res.data as unknown as PublicCenter[]) ?? []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const unfollow = async (centerId: string) => {
    try {
      await api.unfollowCenter(centerId);
      toast.success(t('unfollowed'));
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (loading) return <PencilLoader label={t('loadingFollowedCenters')} />;
  if (error) return <Alert message={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('followedCenters')}</h1>
        <p className="text-sm text-slate-500">{t('followedCentersSub')}</p>
      </div>

      {centers.length === 0 ? (
        <Card bodyClassName="p-8 text-center">
          <Building2 className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">{t('noFollowedCenters')}</p>
          <Link href="/centers" className="mt-4 inline-block">
            <Button>{t('browseCenters')}</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {centers.map((c, i) => (
            <div key={c.id} className="flex flex-col gap-2">
              <CenterCard center={c} index={i} />
              <Button variant="ghost" size="sm" className="w-full" onClick={() => unfollow(c.id)}>{t('unfollow')}</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
