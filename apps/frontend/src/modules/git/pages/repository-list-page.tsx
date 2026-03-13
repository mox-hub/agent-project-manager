import { RepositoryList } from '../components/repository-list';
import { RepositoryCard } from '../components/repository-card';
import { useRepositories } from '../hooks/use-repositories';
import type { Repository } from '../api/git-api';

export function RepositoryListPage() {
  const { data: repositories, isLoading } = useRepositories();
  const repositoryList = repositories ?? [];

  return (
    <div style={{ padding: '24px', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '24px', fontSize: '28px', color: '#1f2937' }}>
          Git Repositories
        </h1>

        <div style={{ marginBottom: '24px' }}>
          <RepositoryList />
        </div>

        {repositoryList.length > 0 ? (
          <div>
            <h2 style={{ marginBottom: '16px', fontSize: '20px', color: '#374151' }}>
              All Repositories ({repositoryList.length})
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
              {repositoryList.map((repo) => (
                <RepositoryCard
                  key={repo.id}
                  repository={repo}
                  onClick={() => {
                    // Navigate to repository detail page
                    console.log('Navigate to repository:', repo.id);
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          !isLoading && (
            <div
              style={{
                textAlign: 'center',
                padding: '64px 24px',
                border: '2px dashed #d1d5db',
                borderRadius: '12px',
                backgroundColor: 'white',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
              <h3 style={{ fontSize: '20px', color: '#6b7280', marginBottom: '8px' }}>
                No repositories yet
              </h3>
              <p style={{ fontSize: '14px', color: '#9ca3af' }}>
                Add your first Git repository to start tracking your code
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
