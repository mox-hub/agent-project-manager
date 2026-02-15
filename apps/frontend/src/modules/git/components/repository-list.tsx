import { useRepositories, useCreateRepository } from '../hooks/use-repositories';
import { useState } from 'react';
import { type CreateRepositoryDto } from '../api/git-api';

interface RepositoryListProps {
  projectId?: string;
}

export function RepositoryList({ projectId }: RepositoryListProps) {
  const { data: repositories, isLoading } = useRepositories({ projectId });
  const createRepository = useCreateRepository();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<CreateRepositoryDto>({
    projectId: projectId || '',
    name: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId || !formData.name) {
      return;
    }

    try {
      await createRepository.mutateAsync(formData);
      setShowCreateForm(false);
      setFormData({
        projectId: projectId || '',
        name: '',
      });
    } catch (error) {
      console.error('Failed to create repository', error);
    }
  };

  if (isLoading) {
    return <div>Loading repositories...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>Repositories</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          style={{
            padding: '6px 12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Add Repository
        </button>
      </div>

      {showCreateForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '16px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px' }}>Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
              }}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px' }}>
              Local Path
            </label>
            <input
              type="text"
              value={formData.localPath || ''}
              onChange={(e) =>
                setFormData({ ...formData, localPath: e.target.value })
              }
              placeholder="E:/code/app"
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
              }}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px' }}>
              Remote URL
            </label>
            <input
              type="text"
              value={formData.remoteUrl || ''}
              onChange={(e) =>
                setFormData({ ...formData, remoteUrl: e.target.value })
              }
              placeholder="git@github.com:user/repo.git"
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="submit"
              disabled={createRepository.isPending}
              style={{
                padding: '6px 12px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {repositories && repositories.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {repositories.map((repo) => (
            <div
              key={repo.id}
              style={{
                padding: '12px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            >
              <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                {repo.name}
              </div>
              {repo.localPath && (
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {repo.localPath}
                </div>
              )}
              {repo.remoteUrl && (
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {repo.remoteUrl}
                </div>
              )}
              {repo.defaultBranch && (
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Branch: {repo.defaultBranch}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: '#6b7280', textAlign: 'center', padding: '24px' }}>
          No repositories found
        </div>
      )}
    </div>
  );
}
