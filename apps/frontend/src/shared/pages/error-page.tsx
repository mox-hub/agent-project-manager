import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';

export function ErrorPage() {
  const error = useRouteError();

  let errorMessage = 'An unexpected error occurred';
  let errorStatus: number | undefined;

  if (isRouteErrorResponse(error)) {
    errorStatus = error.status;
    errorMessage = error.statusText || error.data?.message || `Error ${error.status}`;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
        textAlign: 'center',
        backgroundColor: '#f9fafb',
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          padding: '32px',
          borderRadius: '12px',
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        {errorStatus && (
          <h1
            style={{
              margin: '0 0 16px',
              fontSize: '72px',
              fontWeight: 700,
              color: '#dc2626',
              lineHeight: 1,
            }}
          >
            {errorStatus}
          </h1>
        )}
        <h2
          style={{
            margin: '0 0 12px',
            fontSize: '24px',
            fontWeight: 600,
            color: '#111827',
          }}
        >
          {errorStatus === 404 ? 'Page Not Found' : 'Something went wrong'}
        </h2>
        <p
          style={{
            margin: '0 0 24px',
            fontSize: '14px',
            color: '#6b7280',
            lineHeight: 1.6,
          }}
        >
          {errorStatus === 404
            ? "The page you're looking for doesn't exist or has been moved."
            : errorMessage}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link
            to="/app"
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#fff',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Go Home
          </Link>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: '#fff',
              color: '#374151',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
