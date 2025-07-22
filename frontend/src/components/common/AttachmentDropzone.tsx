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
        // Appeler onUpload avec le fichier original pour l'affichage temporaire
        onUpload([file]);
      } catch (e) {
        console.error('Erreur lors de l’upload de la pièce jointe :', e);
      }
    }
  };

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 transition-all duration-300 cursor-pointer ${
          isDragActive 
            ? 'bg-blue-100 border-blue-500 scale-105 shadow-lg' 
            : 'bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-300 hover:border-blue-400 hover:shadow-md'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} dark:from-blue-900/20 dark:to-indigo-900/20 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 dark:border-blue-700`}
        aria-disabled={disabled}
        aria-label={ariaLabel}
      >
        <input {...getInputProps()} ref={inputRef} id="attachment-upload-input" name="attachment-upload" />
        <label htmlFor="attachment-upload-input" className="w-full flex flex-col items-center cursor-pointer">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full mb-4">
            <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-blue-800 dark:text-blue-300 font-bold text-lg mb-2">{helpText}</p>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
            ou <span className="underline cursor-pointer text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-800 dark:hover:text-blue-300 transition-colors">{uploadingText || 'parcourir'}</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1 rounded-full">
            Taille max : {Math.round(maxSize / 1024 / 1024)} Mo
          </p>
        </label>
      </div>
      {files.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Fichiers joints ({files.length})
          </h4>
          <ul className="space-y-3">
          {files.map(file => (
            <li key={file.id || file.name} className="flex items-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-4 py-3 hover:shadow-md transition-all duration-200">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg mr-3">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block font-medium text-gray-900 dark:text-white truncate">{file.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024).toFixed(1)} Ko</span>
              </div>
              <div className="flex items-center gap-2 ml-3">
              {onDownload && file.id && file.url && (
                <button 
                  onClick={() => onDownload(file.id!)} 
                  className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200" 
                  title={downloadText} 
                  aria-label={downloadText}
                >
                  <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </button>
              )}
              <button 
                onClick={() => file.id && onDelete(file.id)} 
                className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors duration-200" 
                title={deleteText} 
                aria-label={deleteText}
              >
                <X className="w-4 h-4 text-red-600 dark:text-red-400" />
              </button>
              </div>
            </li>
          ))}
        </ul>
        </div>
      )}
    </div>
  );
};