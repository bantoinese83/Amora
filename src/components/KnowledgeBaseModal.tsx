import React, { useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useRagUpload } from '../hooks/useRagUpload';
import { Modal } from './common/Modal';
import { UploadIcon } from './common/Icons';
import { Card } from './common/Card';

export const KnowledgeBaseModal: React.FC = () => {
  const { modals, closeModal, setRagStoreName, ragStoreName } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSuccess = (storeName: string) => {
    setRagStoreName(storeName);
    closeModal('knowledge');
  };

  const { isProcessing, status, error, uploadFile } = useRagUpload(handleSuccess);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  return (
    <Modal isOpen={modals.knowledge} onClose={() => closeModal('knowledge')}>
      <h2 className="text-2xl font-bold text-white mb-2">Knowledge Base</h2>
      <p className="text-slate-400 mb-6">
        Upload a document (PDF, TXT) to give Amora context about your relationship goals or history.
      </p>

      <div className="space-y-6">
        <Card>
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-300 font-medium">Current Context</span>
            {ragStoreName ? (
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">
                Active
              </span>
            ) : (
              <span className="text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded-full">
                None
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 truncate">
            {ragStoreName || 'No documents loaded.'}
          </p>
        </Card>

        {!isProcessing ? (
          <form onSubmit={e => e.preventDefault()} noValidate>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-amora-500 hover:bg-slate-800/30 transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,.csv"
                className="hidden"
                onChange={handleFileSelect}
                aria-label="Upload document"
              />
              <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-3 group-hover:bg-amora-500/20 group-hover:text-amora-400 text-slate-400 transition-colors">
                <UploadIcon />
              </div>
              <p className="text-slate-300 font-medium">Click to upload document</p>
              <p className="text-xs text-slate-500 mt-1">PDF or Text up to 10MB</p>
            </div>
          </form>
        ) : (
          <div className="text-center py-8">
            <div className="w-10 h-10 border-2 border-amora-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-amora-300 font-medium animate-pulse">{status}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400 text-center">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
};
