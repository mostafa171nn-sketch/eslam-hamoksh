import CatalogManager from './CatalogManager';
import { useT } from '../../i18n';

export default function AdminSubjectsPage() {
  const { t } = useT();
  return (
    <CatalogManager
      title={t('subjects')}
      subtitle={t('subjectsManageSub')}
      endpoint="/admin/subjects"
      addLabel={t('addSubject')}
      fields={[
        { key: 'name', label: t('nameCol'), type: 'text', required: true },
        { key: 'icon', label: t('iconEmoji'), type: 'text' },
        { key: 'description', label: t('description'), type: 'textarea' },
      ]}
    />
  );
}
