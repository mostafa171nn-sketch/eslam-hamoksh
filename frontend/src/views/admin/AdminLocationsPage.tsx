import CatalogManager from './CatalogManager';

export default function AdminLocationsPage() {
  return (
    <CatalogManager
      title="Branches"
      subtitle="Manage branches and addresses."
      endpoint="/admin/locations"
      addLabel="Add branch"
      fields={[
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'address', label: 'Address', type: 'text' },
      ]}
    />
  );
}
