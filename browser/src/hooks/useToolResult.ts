import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export const useToolResult = (result: any) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { getAccessTokenSilently } = useAuth0();
  const isAuthEnabled = process.env.REACT_APP_AUTH0_ENABLE === 'true';

  useEffect(() => {
    const resolveResult = async () => {
      if (!result) {
        setData(null);
        return;
      }

      // The structured content might be nested inside the result object
      const structuredContent = result.structuredContent || result;

      if (structuredContent?.toolResultId) {
        setIsLoading(true);
        setError(null);
        try {
          const headers: HeadersInit = {};
          if (isAuthEnabled) {
            const token = await getAccessTokenSilently();
            headers.Authorization = `Bearer ${token}`;
          }
          const response = await fetch(`/api/copilotkit/tool_results/${structuredContent.toolResultId}`, { headers });
          if (!response.ok) {
            throw new Error(`Failed to fetch tool result: ${response.statusText}`);
          }
          const fetchedData = await response.json();
          setData(fetchedData);
        } catch (e: any) {
          setError(e);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Data is available directly
        setData(structuredContent);
        setIsLoading(false);
        setError(null);
      }
    };

    resolveResult();
  }, [result, getAccessTokenSilently, isAuthEnabled]);

  return { data, isLoading, error };
};
