import React from 'react';

interface PortraitLibraryModalProps {
  open: boolean;
  onClose: () => void;
  onSelect?: (url: string) => void;
}

const PortraitLibraryModal: React.FC<PortraitLibraryModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-[480px] rounded-xl bg-[#1e1e2e] p-6 text-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">人物库</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-gray-600 text-gray-400">
          <div className="text-center">
            <p className="mb-2 text-4xl">👤</p>
            <p className="text-sm">人物库功能开发中</p>
            <p className="mt-1 text-xs text-gray-500">敬请期待</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortraitLibraryModal;
