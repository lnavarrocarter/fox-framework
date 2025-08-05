import React from 'react';

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  return (
    <div className="my-6 rounded-lg overflow-hidden">
      <div className="bg-gray-800 text-gray-200 px-4 py-2 text-sm">
        {language}
      </div>
      <pre className="bg-gray-900 p-4 overflow-x-auto">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
};

export default CodeBlock;
