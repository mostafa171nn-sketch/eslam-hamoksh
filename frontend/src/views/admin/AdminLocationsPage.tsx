import CatalogManager from './CatalogManager';
import { useT } from '../../i18n';

export default function AdminLocationsPage() {
  const { t } = useT();
  return (
    <CatalogManager
      title={t('branches')}
      subtitle={t('branchesManageSub')}
      endpoint="/admin/locations"
      addLabel={t('addBranch')}
      fields={[
        { key: 'name', label: t('nameCol'), type: 'text', required: true },
        { key: 'address', label: t('address'), type: 'text' },
      ]}
    />
  );
}
