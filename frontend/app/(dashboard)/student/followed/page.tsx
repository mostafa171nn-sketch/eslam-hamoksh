'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { Card } from '../../../../src/components/ui/Card';
import { Button } from '../../../../src/components/ui/Button';
import { PencilLoader } from '../../../../src/components/ui/PencilLoader';
import { Alert } from '../../../../src/components/ui/ErrorAlert';
import { api, type PublicCenter } from '../../../../src/lib/api';
import { errorMessage } from '../../../../src/hooks/useApi';
import { useToast } from '../../../../src/context/ToastContext';

export default function FollowedCentersPage() {
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
      toast.success('Unfollowed');
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (loading) return <PencilLoader label="Loading followed centers…" />;
  if (error) return <Alert message={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Followed Centers</h1>
        <p className="text-sm text-slate-500">Centers you follow will notify you of new schedules.</p>
      </div>

      {centers.length === 0 ? (
        <Card bodyClassName="p-8 text-center">
          <Building2 className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">You are not following any centers yet.</p>
          <Link href="/centers" className="mt-4 inline-block">
            <Button>Browse Centers</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {centers.map((c) => (
            <Card key={c.id} bodyClassName="p-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">{c.name}</h3>
              <p className="text-xs text-slate-500">{c.city} {c.address ? `· ${c.address}` : ''}</p>
              <div className="mt-3 flex gap-2">
                <Link href={`/centers/${c.id}`} className="flex-1">
                  <Button variant="outline" className="w-full">View</Button>
                </Link>
                <Button variant="ghost" className="flex-1" onClick={() => unfollow(c.id)}>Unfollow</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
