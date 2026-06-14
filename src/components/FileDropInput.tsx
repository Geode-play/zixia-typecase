import { useState } from "react";

type FileDropInputProps = {
  id: string;
  label: string;
  hint: string;
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
};

export function FileDropInput({
  id,
  label,
  hint,
  accept,
  multiple = false,
  onFiles,
}: FileDropInputProps) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <label
      className={isDragging ? "file-drop is-dragging" : "file-drop"}
      htmlFor={id}
      onDragLeave={() => setIsDragging(false)}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        onFiles(Array.from(event.dataTransfer.files ?? []));
      }}
    >
      <span className="file-drop__label">{label}</span>
      <span className="file-drop__hint">{hint}</span>
      <input
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
    </label>
  );
}
