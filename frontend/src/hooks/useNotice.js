import { useCallback, useState } from 'react';

export function useNotice() {
  const [notice, setNotice] = useState(null);
  const notify = useCallback((message, variant = 'success') => setNotice({ message, variant }), []);
  const clearNotice = useCallback(() => setNotice(null), []);
  return { notice, notify, clearNotice };
}