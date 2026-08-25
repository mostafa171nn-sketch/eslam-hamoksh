import CatalogManager from './CatalogManager';

export default function AdminGradesPage() {
  return (
    <CatalogManager
      title="Grades"
      subtitle="Manage grade levels for students."
      endpoint="/admin/grades"
      addLabel="Add grade"
      fields={[
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'level', label: 'Level (order)', type: 'number' },
      ]}
    />
  );
}
