import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { Download, AlertCircle } from 'lucide-react';

const SharedFile = () => {
  const { token } = useParams();
  const [error, setError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  // Note: We don't fetch file details via a separate API in this simplified version, 
  // but just try to download directly when the user clicks the button.
  // In a full app, you'd have a GET /api/files/shared-info/:token to show filename before download.

  const handleDownload = async () => {
    setIsDownloading(true);
    setError('');
    
    try {
      const response = await api.get(`/files/shared/${token}`, {
        responseType: 'blob',
      });
      
      // Extract filename from Content-Disposition header if possible
      let filename = 'shared-file';
      const disposition = response.headers['content-disposition'];
      if (disposition) {
        // Try RFC 5987 format first (filename*=UTF-8''...)
        let match = /filename\*=UTF-8''([^;\n]*)/.exec(disposition);
        if (match && match[1]) {
          filename = decodeURIComponent(match[1]);
        } else {
          // Fallback to standard format (filename="...")
          match = /filename[^;=\n]*=(['"]?)([^'"\n]*?)\1/i.exec(disposition);
          if (match && match[2]) {
            filename = match[2];
          }
        }
      }

      // const url = window.URL.createObjectURL(new Blob([response.data]));
      // const link = document.createElement('a');
      // link.href = url;
      // link.setAttribute('download', filename);
      // document.body.appendChild(link);
      // link.click();
      // link.remove();
      // window.URL.revokeObjectURL(url);
      // ✅ NEW FIXED VERSION

// Create blob with correct MIME type
const blob = new Blob([response.data], {
  type: response.headers['content-type'] || 'application/octet-stream'
});

// Create download URL
const url = window.URL.createObjectURL(blob);

// Create link
const link = document.createElement('a');
link.href = url;

// Use extracted filename
link.setAttribute('download', filename);

// Trigger download
document.body.appendChild(link);
link.click();

// Cleanup
link.remove();
window.URL.revokeObjectURL(url);


    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 410) {
        setError('This share link has expired.');
      } else if (err.response && err.response.status === 404) {
        setError('Invalid or expired share link.');
      } else {
        setError('Error downloading file.');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="auth-container" style={{ textAlign: 'center' }}>
      <h2>Download Shared File</h2>
      
      {error ? (
        <div style={{ color: 'var(--danger)', marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <AlertCircle size={48} style={{ marginBottom: '1rem' }} />
          <p>{error}</p>
        </div>
      ) : (
        <div style={{ marginTop: '2rem' }}>
          <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>
            Someone has shared a secure file with you. Click below to decrypt and download it.
          </p>
          <button 
            className="btn-primary" 
            onClick={handleDownload} 
            disabled={isDownloading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <Download size={20} />
            {isDownloading ? 'Decrypting & Downloading...' : 'Download File'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SharedFile;
