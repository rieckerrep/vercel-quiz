import { toast } from 'react-hot-toast';

export const useErrorHandler = () => {
  const handleError = (error: Error | string) => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    
    toast.error(errorMessage, {
      position: 'bottom-left',
      duration: 5000,
      style: {
        background: 'rgba(51, 51, 51, 0.9)',
        color: '#fff',
        borderRadius: '10px',
        padding: '16px',
        fontSize: '14px',
        maxWidth: '400px',
        border: '1px solid #ffc107'
      },
    });
  };

  return { handleError };
}; 