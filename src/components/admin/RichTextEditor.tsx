"use client";

import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
import { useMemo } from "react";

// @ts-ignore
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

export default function RichTextEditor({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
  }), []);

  return (
    <div style={{ background: "white", color: "black", borderRadius: "4px" }}>
      <ReactQuill theme="snow" value={value} onChange={onChange} modules={modules} />
      <style>{`
        .ql-editor { min-height: 200px; font-family: inherit; font-size: 15px; }
        .ql-toolbar { border-top-left-radius: 4px; border-top-right-radius: 4px; }
        .ql-container { border-bottom-left-radius: 4px; border-bottom-right-radius: 4px; }
      `}</style>
    </div>
  );
}
