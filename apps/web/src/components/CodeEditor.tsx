import Editor from '@monaco-editor/react';
import { useTheme } from '../theme/ThemeContext';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
}

export function CodeEditor({ value, onChange, height = '100%' }: CodeEditorProps) {
  const { theme } = useTheme();

  return (
    <div className="editor-frame">
      <Editor
        height={height}
        language="python"
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        value={value}
        onChange={(next) => onChange(next ?? '')}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          tabSize: 4,
          padding: { top: 12 },
        }}
      />
    </div>
  );
}
