import React, { useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Download } from 'lucide-react';
import { uploadAttachment } from '@/services/api';

interface Attachment {
  id?: string;
  name: string;
  size: number;
  type: string;
  url?: string;
}

interface AttachmentDropzoneProps {
  files: Attachment[];
  onUpload: (files: File[]) => void;
  onDelete: (id: string) => void;
  onDownload?: (id: string) => void;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
  helpText?: string;
  uploadingText?: string;
  errorText?: string;
  downloadText?: string;
  deleteText?: string;
  previewText?: string;
  'aria-label'?: string;
  relatedTo: string;
  relatedId: string;
}

export const AttachmentDropzone: React.FC<AttachmentDropzoneProps> = ({
  files,
  onUpload,
  onDelete,
  onDownload,
  accept = '*',
  maxSize = 10 * 1024 * 1024,
  disabled = false,
  helpText = 'Glissez-déposez vos fichiers ici',
  uploadingText,
  errorText,
  downloadText = 'Télécharger',
  deleteText = 'Supprimer',
  previewText = 'Aperçu',
  'aria-label': ariaLabel,
  relatedTo,
  relatedId,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  // Correction de la prop accept pour react-dropzone :
  // On convertit la chaîne accept (séparée par des virgules) en un objet Accept (clé: type MIME, valeur: extensions[])
  const parseAccept = (accept: string | undefined) => {
    if (!accept || accept === '*') return undefined;
    if (typeof accept !== 'string') return accept;
    const types = accept.split(',').map(t => t.trim()).filter(Boolean);
    // Si tous sont des types MIME (contiennent '/'), on construit un objet Accept
    if (types.every(t => t.includes('/'))) {
      const acceptObj: Record<string, string[]> = {};
      types.forEach(type => { acceptObj[type] = []; });
      return acceptObj;
    }
    // Sinon, on retourne undefined (pour éviter l'avertissement)
    return undefined;
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: parseAccept(accept),
    maxSize,
    disabled,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) handleUpload(acceptedFiles);
    },
  });

  const handleUpload = async (files: File[]) => {
    if (!relatedId || !relatedTo) return;
    for (const file of files) {
      try {
        const attachment = await uploadAttachment({ file, relatedTo: relatedTo as 'task' | 'project' | 'user', relatedId });
        onUpload([...files, attachment]); // Ajoute la nouvelle pièce jointe à la liste
      } catch (e) {
        console.error('Erreur lors de l’upload de la pièce jointe :', e);
      }
    }
  };

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 transition-colors duration-200 cursor-pointer bg-blue-50 hover:bg-blue-100 border-blue-300 ${isDragActive ? 'bg-blue-100 border-blue-500' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-disabled={disabled}
        aria-label={ariaLabel}
      >
        <input {...getInputProps()} ref={inputRef} id="attachment-upload-input" name="attachment-upload" />
        <label htmlFor="attachment-upload-input" className="w-full flex flex-col items-center cursor-pointer">
          <Upload className="w-10 h-10 text-blue-400 mb-2" />
          <p className="text-blue-700 font-medium mb-1">{helpText}</p>
          <p className="text-gray-500 text-sm">ou <span className="underline cursor-pointer text-blue-600">{uploadingText || 'parcourir'}</span></p>
          <p className="text-xs text-gray-400 mt-1">Taille max : {Math.round(maxSize / 1024 / 1024)} Mo</p>
        </label>
      </div>
      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map(file => (
            <li key={file.id || file.name} className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 px-3 py-2">
              <FileText className="w-5 h-5 text-blue-400 mr-2" />
              <span className="flex-1 truncate text-gray-900">{file.name}</span>
              <span className="text-xs text-gray-500 ml-2">{(file.size / 1024).toFixed(1)} Ko</span>
              {onDownload && file.id && file.url && (
                <button onClick={() => onDownload(file.id!)} className="ml-2 p-1 rounded hover:bg-blue-100" title={downloadText} aria-label={downloadText}>
                  <Download className="w-4 h-4 text-blue-500" />
                </button>
              )}
              <button onClick={() => file.id && onDelete(file.id)} className="ml-2 p-1 rounded hover:bg-red-100" title={deleteText} aria-label={deleteText}>
                <X className="w-4 h-4 text-red-500" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};