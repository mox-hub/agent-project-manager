/**
 * Test File Template
 *
 * Copy this template to create new test files
 *
 * Usage:
 * 1. Copy this file to your desired location
 * 2. Replace placeholders (marked with TODO comments)
 * 3. Customize test cases for your specific needs
 *
 * File Naming:
 * - Hooks: use-{feature}.test.tsx
 * - API modules: {feature}-api.test.ts
 * - Components: {ComponentName}.test.tsx
 * - Pages: {page-name}-page.test.tsx
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
// For hooks and components:
import { renderHook, render, screen, waitFor, fireEvent, userEvent } from '@testing-library/react';
// For hooks:
import { QueryClient, QueryClientProvider } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// For pages/components with router:
import { MemoryRouter } from 'react-router-dom';

// TODO: Import the module you're testing
import { useYourHook } from './your-hook';
import { YourComponent } from './your-component';
import { yourApi } from './your-api';

// TODO: Mock external dependencies
vi.mock('@/infrastructure/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/infrastructure/event-client', () => ({
  eventClient: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    isConnected: vi.fn(() => false),
  },
}));

/**
 * ========================================
 * HOOK TEST TEMPLATE
 * ========================================
 */

describe('useYourHook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Create fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    // Clear all mocks
    vi.clearAllMocks();
  });

  // Test wrapper with providers
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useYourHook(), { wrapper });

    // TODO: Add assertions for initial state
    expect(result.current).toBeDefined();
  });

  it('should fetch data successfully', async () => {
    // TODO: Setup mock data
    const mockData = { id: '1', name: 'Test' };
    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useYourHook(), { wrapper });

    // Wait for async operation
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // TODO: Add assertions for success case
    expect(result.current.data).toEqual(mockData);
    expect(api.get).toHaveBeenCalledWith('/endpoint');
  });

  it('should handle errors', async () => {
    // Setup error mock
    const mockError = new Error('API Error');
    vi.mocked(api.get).mockRejectedValue(mockError);

    const { result } = renderHook(() => useYourHook(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // TODO: Add assertions for error case
    expect(result.current.error).toEqual(mockError);
  });

  it('should handle loading state', () => {
    // Setup pending mock
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useYourHook(), { wrapper });

    // TODO: Add assertions for loading state
    expect(result.current.isLoading).toBe(true);
  });

  // TODO: Add more test cases as needed
  // - Test mutations
  // - Test cache invalidation
  // - Test refetching
  // - Test edge cases
});

/**
 * ========================================
 * COMPONENT TEST TEMPLATE
 * ========================================
 */

describe('YourComponent', () => {
  // Default props for testing
  const defaultProps = {
    title: 'Test Title',
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with default props', () => {
    render(<YourComponent {...defaultProps} />);

    // TODO: Add assertions for rendering
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should call callback when button clicked', () => {
    render(<YourComponent {...defaultProps} />);

    // Simulate user interaction
    const button = screen.getByRole('button', { name: /save/i });
    fireEvent.click(button);

    // Verify callback was called
    expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
  });

  it('should handle user input', async () => {
    render(<YourComponent {...defaultProps} />);

    const input = screen.getByRole('textbox', { name: /title/i });

    // Simulate user typing
    await userEvent.type(input, 'New Title');

    // Verify input value changed
    expect(input).toHaveValue('New Title');
  });

  it('should show loading state', () => {
    render(<YourComponent {...defaultProps} loading />);

    // TODO: Add assertions for loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show error message', () => {
    render(<YourComponent {...defaultProps} error="Failed to load" />);

    // TODO: Add assertions for error state
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<YourComponent {...defaultProps} disabled />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  // TODO: Add more test cases as needed
  // - Test conditional rendering
  // - Test accessibility
  // - Test edge cases
  // - Test integration with hooks
});

/**
 * ========================================
 * API TEST TEMPLATE
 * ========================================
 */

describe('yourApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getList', () => {
    it('should fetch list with params', async () => {
      // Setup mock response
      const mockResponse = {
        data: [{ id: '1', name: 'Test' }],
        meta: { page: 1, pageSize: 10, total: 1 },
      };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      // Call API
      const result = await yourApi.getList({ page: 1, pageSize: 10 });

      // Verify result
      expect(result).toEqual(mockResponse);
      expect(api.get).toHaveBeenCalledWith('/endpoint', { page: 1, pageSize: 10 });
    });

    it('should handle errors', async () => {
      const mockError = new Error('Network Error');
      vi.mocked(api.get).mockRejectedValue(mockError);

      await expect(yourApi.getList()).rejects.toThrow('Network Error');
    });
  });

  describe('getDetail', () => {
    it('should fetch item by ID', async () => {
      const mockItem = { id: '1', name: 'Test Item' };
      vi.mocked(api.get).mockResolvedValue({ data: mockItem });

      const result = await yourApi.getDetail('1');

      expect(result.data).toEqual(mockItem);
      expect(api.get).toHaveBeenCalledWith('/endpoint/1');
    });

    it('should handle not found error', async () => {
      vi.mocked(api.get).mockResolvedValue({
        error: { code: 'NOT_FOUND', message: 'Item not found' },
      });

      await expect(yourApi.getDetail('999')).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('should create new item', async () => {
      const mockData = { name: 'New Item' };
      const mockResponse = {
        data: { id: 'new-id', ...mockData },
      };
      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const result = await yourApi.create(mockData);

      expect(result.data).toEqual(mockResponse.data);
      expect(api.post).toHaveBeenCalledWith('/endpoint', mockData);
    });

    it('should handle validation errors', async () => {
      const mockError = {
        error: { code: 'VALIDATION_ERROR', message: 'Invalid data' },
      };
      vi.mocked(api.post).mockResolvedValue(mockError);

      await expect(yourApi.create({})).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update item', async () => {
      const mockData = { name: 'Updated Item' };
      const mockResponse = { data: { id: '1', ...mockData } };
      vi.mocked(api.patch).mockResolvedValue(mockResponse);

      const result = await yourApi.update('1', mockData);

      expect(result.data).toEqual(mockResponse.data);
      expect(api.patch).toHaveBeenCalledWith('/endpoint/1', mockData);
    });
  });

  describe('delete', () => {
    it('should delete item', async () => {
      vi.mocked(api.delete).mockResolvedValue({ data: null });

      await yourApi.delete('1');

      expect(api.delete).toHaveBeenCalledWith('/endpoint/1');
    });
  });

  // TODO: Add more test cases as needed
  // - Test other API methods
  // - Test edge cases
  // - Test error scenarios
});

/**
 * ========================================
 * PAGE TEST TEMPLATE
 * ========================================
 */

describe('YourPage', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={['/test']}>
      {children}
    </MemoryRouter>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    // Setup pending mock
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));

    render(<YourPage />, { wrapper });

    // TODO: Add assertions for loading state
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should render page content', async () => {
    // Setup successful mock
    const mockData = [{ id: '1', name: 'Test' }];
    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    render(<YourPage />, { wrapper });

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });

  it('should render error state', async () => {
    // Setup error mock
    vi.mocked(api.get).mockRejectedValue(new Error('Failed to fetch'));

    render(<YourPage />, { wrapper });

    // Wait for error to display
    await waitFor(() => {
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });
  });

  it('should navigate on button click', async () => {
    // Setup mock
    vi.mocked(api.get).mockResolvedValue({ data: [] });

    // TODO: Mock router navigation
    const mockNavigate = vi.fn();
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useNavigate: () => mockNavigate,
      };
    });

    render(<YourPage />, { wrapper });

    const button = screen.getByRole('button', { name: /navigate/i });
    fireEvent.click(button);

    // TODO: Add assertions for navigation
    expect(mockNavigate).toHaveBeenCalledWith('/destination');
  });

  // TODO: Add more test cases as needed
  // - Test user interactions
  // - Test routing
  // - Test integration with multiple hooks
  // - Test edge cases
});

/**
 * ========================================
 * WEBSOCKET HOOK TEST TEMPLATE
 * ========================================
 */

describe('useWebSocketHook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should subscribe to event on mount', () => {
    const handler = vi.fn();

    renderHook(() => useWebSocketHook('event-name', handler));

    expect(eventClient.on).toHaveBeenCalledWith('event-name', expect.any(Function));
  });

  it('should unsubscribe on unmount', () => {
    const handler = vi.fn();

    const { unmount } = renderHook(() => useWebSocketHook('event-name', handler));

    unmount();

    expect(eventClient.off).toHaveBeenCalledWith('event-name', expect.any(Function));
  });

  it('should call handler when event is emitted', () => {
    const handler = vi.fn();

    renderHook(() => useWebSocketHook('event-name', handler));

    // Get the registered handler
    const onCalls = eventClient.on.mock.calls;
    const eventHandler = onCalls.find(call => call[0] === 'event-name')?.[1];

    // Simulate event emission
    const mockPayload = { data: 'test' };
    eventHandler?.(mockPayload);

    expect(handler).toHaveBeenCalledWith(mockPayload);
  });

  it('should connect WebSocket if not connected', () => {
    vi.mocked(eventClient.isConnected).mockReturnValue(false);

    const handler = vi.fn();

    renderHook(() => useWebSocketHook('event-name', handler));

    expect(eventClient.connect).toHaveBeenCalled();
  });

  // TODO: Add more test cases as needed
  // - Test multiple event subscriptions
  // - Test error handling
  // - Test reconnection
});

/**
 * ========================================
 * UTILITY FUNCTIONS
 * ========================================
 */

/**
 * Helper function to create custom wrapper with providers
 */
export function createWrapper(options: {
  route?: string;
  queryClient?: QueryClient;
}) {
  const {
    route = '/',
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    }),
  } = options;

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/**
 * Helper function to render with custom wrapper
 */
export function customRender(
  ui: React.ReactNode,
  options?: {
    route?: string;
    queryClient?: QueryClient;
  },
) {
  const Wrapper = createWrapper(options || {});
  return render(ui, { wrapper: Wrapper });
}

/**
 * Helper function to wait for async operations
 */
export async function waitForLoadingToFinish() {
  await waitFor(
    () => {
      expect(screen.queryByTestId(/loading/i)).not.toBeInTheDocument();
    },
    { timeout: 3000 },
  );
}

/**
 * Helper function to type in an input field
 */
export async function typeInInput(
  input: HTMLElement,
  text: string,
) {
  await userEvent.clear(input);
  await userEvent.type(input, text);
}

/**
 * Helper function to select an option from a dropdown
 */
export async function selectOption(
  trigger: HTMLElement,
  optionText: string,
) {
  await userEvent.click(trigger);
  const option = screen.getByRole('option', { name: optionText });
  await userEvent.click(option);
}

/**
 * ========================================
 * COMMON TEST PATTERNS
 * ========================================
 */

/**
 * Test that a component renders correctly
 */
function testComponentRenders() {
  const { container } = render(<YourComponent />);
  expect(container.firstChild).toMatchSnapshot();
}

/**
 * Test that a hook returns expected initial state
 */
function testHookInitialState() {
  const { result } = renderHook(() => useYourHook());
  expect(result.current).toMatchSnapshot();
}

/**
 * Test that an API function is called with correct parameters
 */
function testApiCallWithParams() {
  yourApi.getDetail('123');
  expect(api.get).toHaveBeenCalledWith('/endpoint/123');
}

/**
 * Test error handling
 */
function testErrorHandling() {
  vi.mocked(api.get).mockRejectedValue(new Error('API Error'));
  return expect(yourApi.getList()).rejects.toThrow('API Error');
}

/**
 * Test loading state
 */
function testLoadingState() {
  vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));
  const { result } = renderHook(() => useYourHook());
  expect(result.current.isLoading).toBe(true);
}

/**
 * Test user interaction
 */
function testUserInteraction() {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click me</Button>);
  fireEvent.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalledTimes(1);
}

/**
 * ========================================
 * EXAMPLE: COMPLETE HOOK TEST
 * ========================================
 */

describe('useAuth (Example)', () => {
  let queryClient: QueryClient;
  const mockNavigate = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
    vi.mock('react-router-dom', () => ({
      ...vi.importActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('should login successfully', async () => {
    const mockResponse = {
      data: {
        accessToken: 'test-token',
        user: { id: '1', username: 'testuser', displayName: 'Test User' },
      },
    };
    vi.mocked(api.post).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Login
    await act(async () => {
      result.current.login({ username: 'test', password: 'password' });
    });

    // Verify
    await waitFor(() => {
      expect(result.current.currentUser).toEqual(mockResponse.data.user);
      expect(result.current.isAuthenticated).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith('access_token', 'test-token');
      expect(mockNavigate).toHaveBeenCalledWith('/app');
    });
  });

  it('should logout successfully', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Logout
    await act(async () => {
      result.current.logout();
    });

    // Verify
    await waitFor(() => {
      expect(result.current.currentUser).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
});

/**
 * ========================================
 * EXAMPLE: COMPLETE COMPONENT TEST
 * ========================================
 */

describe('Button (Example)', () => {
  it('should render with default props', () => {
    const { getByRole } = render(<Button>Click me</Button>);
    expect(getByRole('button')).toHaveTextContent('Click me');
  });

  it('should call onClick handler', () => {
    const handleClick = vi.fn();
    const { getByRole } = render(
      <Button onClick={handleClick}>Click me</Button>
    );

    fireEvent.click(getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when loading', () => {
    const { getByRole, getByText } = render(
      <Button loading>Loading...</Button>
    );

    expect(getByText('Loading...')).toBeInTheDocument();
    expect(getByRole('button')).toBeDisabled();
  });

  it('should apply variant classes', () => {
    const { getByRole } = render(
      <Button variant="danger">Delete</Button>
    );

    expect(getByRole('button')).toHaveClass('variant-danger');
  });

  it('should be keyboard accessible', () => {
    const handleClick = vi.fn();
    const { getByRole } = render(
      <Button onClick={handleClick}>Click me</Button>
    );

    getByRole('button').focus();
    fireEvent.keyDown(getByRole('button'), { key: 'Enter' });

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

// Export everything for use in tests
export * from 'vitest';
export * from '@testing-library/react';
export { QueryClient, QueryClientProvider } from '@tanstack/react-query';
export { MemoryRouter } from 'react-router-dom';
