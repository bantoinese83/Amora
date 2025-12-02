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
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Voice Settings</h2>
        <p className="text-slate-600 mb-3">Choose the voice that feels most comfortable for you.</p>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full w-fit">
          <span className="text-[10px] text-slate-600 font-medium">Therapist • Coach • Journal</span>
        </div>
      </div>

      <div className="space-y-3">
        {VOICES.map(voice => {
          const isSelected = selectedVoice === voice.name;
          return (
            <Card
              key={voice.name}
              onClick={() => setSelectedVoice(voice.name)}
              className={`cursor-pointer transition-all border-2 relative hover:bg-slate-50 ${
                isSelected
                  ? 'border-amora-500 bg-amora-50'
                  : 'border-transparent hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-bold ${isSelected ? 'text-amora-900' : 'text-slate-900'}`}>
                      {voice.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {voice.gender}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{voice.description}</p>
                </div>

                {isSelected && (
                  <div className="text-amora-600">
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
