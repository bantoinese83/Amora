import React from 'react';
import { useApp } from '../context/AppContext';
import { Modal } from './common/Modal';
import { VOICES } from '../constants';
import { Card } from './common/Card';
import { CheckCircleIcon } from './common/Icons';

export const SettingsModal: React.FC = () => {
  const { modals, closeModal, selectedVoice, setSelectedVoice } = useApp();

  return (
    <Modal isOpen={modals.settings} onClose={() => closeModal('settings')}>
      <h2 className="text-2xl font-bold text-white mb-2">Voice Settings</h2>
      <p className="text-slate-400 mb-6">Choose the voice that feels most comfortable for you.</p>

      <div className="space-y-3">
        {VOICES.map(voice => {
          const isSelected = selectedVoice === voice.name;
          return (
            <Card
              key={voice.name}
              onClick={() => setSelectedVoice(voice.name)}
              className={`cursor-pointer transition-all border-2 relative hover:bg-slate-800 ${
                isSelected
                  ? 'border-amora-500 bg-slate-800'
                  : 'border-transparent hover:border-slate-600'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {voice.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
                      {voice.gender}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{voice.description}</p>
                </div>

                {isSelected && (
                  <div className="text-amora-500">
                    <CheckCircleIcon />
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </Modal>
  );
};
