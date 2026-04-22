import { useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { Download, AlertCircle } from 'lucide-react';
import { decryptFile } from '../utils/encryption';

const SharedFile = () => {
  const { token } = useParams();
  const [error, setError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError('');

    try {
      const response = await api.get(`/files/shared/${token}`, {
        responseType: 'blob',
      });

      const encryptedOnClient = response.headers['x-encrypted-on-client'] === 'true';

      let fileBlob = response.data;
      let filename = 'shared-file';

      const disposition = response.headers['content-disposition'];
      if (disposition) {
        let match = /filename\*=UTF-8''([^;\n]*)/.exec(disposition);
        if (match && match[1]) {
          filename = decodeURIComponent(match[1]);
        } else {
          match = /filename[^;=\n]*=(['"]?)([^'"\n]*?)\1/i.exec(disposition);
          if (match && match[2]) {
            filename = match[2];
          }
        }
      }

      if (encryptedOnClient) {
        const ivBase64 = response.headers['x-encryption-iv'];
        const authTagBase64 = response.headers['x-encryption-auth-tag'];

        if (!ivBase64 || !authTagBase64) {
          throw new Error('Missing encryption metadata');
        }

        const password = prompt('Enter decryption password:');
        if (!password) throw new Error('Password required');

        const encoder = new TextEncoder();
        const baseKey = await crypto.subtle.importKey(
          'raw',
          encoder.encode(password),
          { name: 'PBKDF2' },
          false,
          ['deriveKey']
        );

        const key = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: encoder.encode('secure-share-salt'),
            iterations: 100000,
            hash: 'SHA-256'
          },
          baseKey,
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt']
        );

        const iv = new Uint8Array(atob(ivBase64).split('').map(c => c.charCodeAt(0)));
        const authTag = new Uint8Array(atob(authTagBase64).split('').map(c => c.charCodeAt(0)));

        const encryptedData = new Uint8Array(await response.data.arrayBuffer());

        // ✅ FIXED ORDER
        const decrypted = await decryptFile(encryptedData, key, iv, authTag);

        fileBlob = new Blob([decrypted], { type: response.headers['content-type'] });
      }

      const url = window.URL.createObjectURL(fileBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h2>Download Shared File</h2>

      {error ? (
        <div>
          <AlertCircle size={40} />
          <p>{error}</p>
        </div>
      ) : (
        <button onClick={handleDownload} disabled={isDownloading}>
          <Download size={20} />
          {isDownloading ? 'Decrypting...' : 'Download'}
        </button>
      )}
    </div>
  );
};

export default SharedFile;