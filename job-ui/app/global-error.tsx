'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900">Something went wrong</h2>
          <p className="text-xs text-gray-500 mt-1">{error?.message || 'An unexpected error occurred.'}</p>
          <button
            onClick={() => reset()}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

