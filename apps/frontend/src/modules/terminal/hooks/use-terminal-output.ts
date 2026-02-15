import { useEffect, useState, useRef } from 'react';
import { useEventSubscription } from '../../../infrastructure/hooks/use-event-subscription';

export interface TerminalOutput {
  sessionId: string;
  chunk: string;
  isError: boolean;
  isEnd: boolean;
}

export function useTerminalOutput(sessionId: string | null) {
  const [output, setOutput] = useState<string>('');
  const [errorOutput, setErrorOutput] = useState<string>('');
  const outputRef = useRef<string>('');
  const errorOutputRef = useRef<string>('');

  const handleOutput = (data: TerminalOutput) => {
    if (!sessionId || data.sessionId !== sessionId) {
      return;
    }

    if (data.isError) {
      errorOutputRef.current += data.chunk;
      setErrorOutput(errorOutputRef.current);
    } else {
      outputRef.current += data.chunk;
      setOutput(outputRef.current);
    }

    if (data.isEnd) {
      // Command completed, could trigger callback here
    }
  };

  useEventSubscription('terminal.output', handleOutput, [sessionId]);

  const clear = () => {
    outputRef.current = '';
    errorOutputRef.current = '';
    setOutput('');
    setErrorOutput('');
  };

  return {
    output,
    errorOutput,
    clear,
  };
}
