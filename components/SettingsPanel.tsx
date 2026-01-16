import React, { useState, useEffect } from 'react';
import { Save, CreditCard, Loader2 } from 'lucide-react';

export interface AccountSettings {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

interface SettingsPanelProps {
  accountSettings: AccountSettings;
  onSaveAccountSettings: (settings: AccountSettings) => Promise<boolean>;
  isLoading?: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  accountSettings,
  onSaveAccountSettings,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<AccountSettings>(accountSettings);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    setFormData(accountSettings);
  }, [accountSettings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setSaveState('idle');
  };

  const handleSave = async () => {
    setSaveState('saving');
    const success = await onSaveAccountSettings(formData);
    if (success) {
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } else {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">

        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <CreditCard className="text-brand-green w-5 h-5" />
            <h2 className="text-lg font-bold text-gray-800">기본 계좌 정보 설정</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            설정한 계좌 정보가 새 요청서 작성 시 자동으로 입력됩니다.
          </p>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">은행명</label>
            <input
              type="text"
              name="bankName"
              value={formData.bankName}
              onChange={handleChange}
              placeholder="예: 농협은행"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">계좌번호</label>
            <input
              type="text"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleChange}
              placeholder="예: 302-1234-5678-91"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">예금주</label>
            <input
              type="text"
              name="accountHolder"
              value={formData.accountHolder}
              onChange={handleChange}
              placeholder="예: 홍길동"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green outline-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saveState === 'saving'}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              saveState === 'saved'
                ? 'bg-green-500 text-white'
                : saveState === 'error'
                ? 'bg-red-500 text-white'
                : saveState === 'saving'
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-brand-green text-white hover:bg-green-700'
            }`}
          >
            {saveState === 'saving' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saveState === 'saving' ? '저장 중...' : saveState === 'saved' ? '저장되었습니다!' : saveState === 'error' ? '저장 실패' : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
};
