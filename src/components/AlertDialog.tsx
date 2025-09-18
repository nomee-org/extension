import React from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import Modal from './Modal';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText?: string;
  type?: 'warning' | 'error' | 'info' | 'success';
}

const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  buttonText = 'OK',
  type = 'info'
}) => {
  const getIcon = () => {
    switch (type) {
      case 'error':
        return <XCircle className="w-8 h-8 text-red-400" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-8 h-8 text-yellow-400" />;
      default:
        return <Info className="w-8 h-8 text-blue-400" />;
    }
  };

  const getButtonStyle = () => {
    switch (type) {
      case 'error':
        return 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700';
      case 'success':
        return 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700';
      case 'warning':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700';
      default:
        return 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="text-center">
        <div className="flex justify-center mb-4">
          {getIcon()}
        </div>
        
        <p className="text-gray-300 mb-6">{message}</p>
        
        <button
          onClick={onClose}
          className={`w-full px-4 py-2 text-white rounded-lg transition-all transform hover:scale-[1.02] ${getButtonStyle()}`}
        >
          {buttonText}
        </button>
      </div>
    </Modal>
  );
};

export default AlertDialog;