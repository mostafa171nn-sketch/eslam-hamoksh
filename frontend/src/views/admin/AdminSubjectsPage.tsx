import CatalogManager from './CatalogManager';

export default function AdminSubjectsPage() {
  return (
    <CatalogManager
      title="Subjects"
      subtitle="Manage the subjects offered at your center."
      endpoint="/admin/subjects"
      addLabel="Add subject"
      fields={[
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'icon', label: 'Icon (emoji)', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' },
      ]}
    />
  );
}
