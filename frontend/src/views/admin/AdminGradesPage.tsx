import CatalogManager from './CatalogManager';
import { useT } from '../../i18n';

export default function AdminGradesPage() {
  const { t } = useT();
  return (
    <CatalogManager
      title={t('gradesNav')}
      subtitle={t('gradesManageSub')}
      endpoint="/admin/grades"
      addLabel={t('addGrade')}
      fields={[
        { key: 'name', label: t('nameCol'), type: 'text', required: true },
        { key: 'level', label: t('gradeOrderLabel'), type: 'number' },
      ]}
    />
  );
}
