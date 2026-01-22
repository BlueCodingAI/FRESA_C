"use client";

import { useState, useRef, useEffect } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter text...",
  rows = 8,
  className = "",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#3b82f6"); // Default blue

  // Common colors for quick selection
  const colors = [
    { name: "Blue", value: "#3b82f6" },
    { name: "Cyan", value: "#06b6d4" },
    { name: "Green", value: "#10b981" },
    { name: "Yellow", value: "#eab308" },
    { name: "Orange", value: "#f97316" },
    { name: "Red", value: "#ef4444" },
    { name: "Purple", value: "#a855f7" },
    { name: "Pink", value: "#ec4899" },
    { name: "White", value: "#ffffff" },
    { name: "Gray", value: "#9ca3af" },
    { name: "Black", value: "#000000" },
  ];

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const applyColor = (color: string, keepOpen: boolean = false) => {
    execCommand("foreColor", color);
    setSelectedColor(color);
    if (!keepOpen) {
      setShowColorPicker(false);
    }
  };

  const getSelectionColor = () => {
    if (typeof window === 'undefined') {
      return selectedColor;
    }
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const element = container.nodeType === 3 ? container.parentElement : container as HTMLElement;
      if (element) {
        const color = window.getComputedStyle(element).color;
        return color;
      }
    }
    return selectedColor;
  };

  const minHeight = rows * 24; // Approximate line height

  return (
    <div className={`rich-text-editor ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-[#0a0e27]/70 border border-cyan-500/30 rounded-t-lg flex-wrap">
        {/* Bold */}
        <button
          type="button"
          onClick={() => execCommand("bold")}
          className="p-2 hover:bg-cyan-500/20 rounded transition-colors"
          title="Bold (Ctrl+B)"
          onMouseDown={(e) => e.preventDefault()}
        >
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4v8a4 4 0 01-4 4H6a4 4 0 01-4-4V8a4 4 0 014-4z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6" />
          </svg>
        </button>

        {/* Italic */}
        <button
          type="button"
          onClick={() => execCommand("italic")}
          className="p-2 hover:bg-cyan-500/20 rounded transition-colors"
          title="Italic (Ctrl+I)"
          onMouseDown={(e) => e.preventDefault()}
        >
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </button>

        {/* Underline */}
        <button
          type="button"
          onClick={() => execCommand("underline")}
          className="p-2 hover:bg-cyan-500/20 rounded transition-colors"
          title="Underline (Ctrl+U)"
          onMouseDown={(e) => e.preventDefault()}
        >
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19h14M5 5h14M5 12h14" />
          </svg>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-cyan-500/30" />

        {/* Color Picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-2 hover:bg-cyan-500/20 rounded transition-colors flex items-center gap-1"
            title="Text Color"
            onMouseDown={(e) => e.preventDefault()}
          >
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <div
              className="w-3 h-3 rounded border border-gray-500"
              style={{ backgroundColor: getSelectionColor() }}
            />
          </button>

          {/* Color Picker Dropdown */}
          {showColorPicker && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowColorPicker(false)}
              />
              <div 
                className="absolute top-full left-0 mt-1 bg-[#1a1f3a] border border-cyan-500/30 rounded-lg shadow-xl p-3 z-20 min-w-[200px]"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="text-xs text-gray-400 mb-2">Text Color</div>
                <div className="grid grid-cols-5 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => applyColor(color.value)}
                      className="w-8 h-8 rounded border-2 transition-all hover:scale-110"
                      style={{
                        backgroundColor: color.value,
                        borderColor: selectedColor === color.value ? "#06b6d4" : "transparent",
                      }}
                      title={color.name}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    />
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-cyan-500/20">
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => {
                      const newColor = e.target.value;
                      setSelectedColor(newColor);
                      applyColor(newColor, true); // Keep picker open when using color input
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full h-8 rounded cursor-pointer"
                    title="Custom Color"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-cyan-500/30" />

        {/* Remove Format */}
        <button
          type="button"
          onClick={() => execCommand("removeFormat")}
          className="p-2 hover:bg-cyan-500/20 rounded transition-colors"
          title="Remove Formatting"
          onMouseDown={(e) => e.preventDefault()}
        >
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
        }}
        style={{
          minHeight: `${minHeight}px`,
        }}
        className="w-full px-4 py-3 bg-[#0a0e27]/50 border-x border-b border-cyan-500/30 rounded-b-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 overflow-y-auto prose prose-invert max-w-none"
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      <style jsx global>{`
        .rich-text-editor [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #6b7280;
          pointer-events: none;
        }
        .rich-text-editor [contenteditable] {
          line-height: 1.6;
        }
        .rich-text-editor [contenteditable] p {
          margin: 0.5em 0;
        }
        .rich-text-editor [contenteditable] p:first-child {
          margin-top: 0;
        }
        .rich-text-editor [contenteditable] p:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
}

