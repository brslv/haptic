import React from 'react';

export function QuickUpdatePreview({ content }) {
  return (
    <div
      className="prose prose-yellow"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}