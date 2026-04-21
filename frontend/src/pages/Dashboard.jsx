import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { UploadCloud, Download, Share2, Trash2, Link as LinkIcon } from 'lucide-react';

const Dashboard = () => {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const fetchFiles = async () => {
    try {
      const { data } = await api.get('/files');
      setFiles(data);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check size limit (50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('File size exceeds 50MB limit');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setUploadProgress(0);

    try {
      await api.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });

      // Reset input and fetch files
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchFiles();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      fileInputRef.current.files = e.dataTransfer.files;
      // Trigger onChange event manually
      const event = new Event('change', { bubbles: true });
      fileInputRef.current.dispatchEvent(event);
      handleFileUpload({ target: fileInputRef.current });
    }
  };

  const handleDownload = async (fileId, filename) => {
    try {
      const response = await api.get(`/files/download/${fileId}`, {
        responseType: 'blob',
      });

      // Extract filename from Content-Disposition header if available
      let downloadFilename = filename; // Fallback to passed filename
      const disposition = response.headers['content-disposition'];
      if (disposition) {
        // Try RFC 5987 format first (filename*=UTF-8''...)
        let match = /filename\*=UTF-8''([^;\n]*)/.exec(disposition);
        if (match && match[1]) {
          downloadFilename = decodeURIComponent(match[1]);
        } else {
          // Fallback to standard format (filename="...")
          match = /filename[^;=\n]*=(['"]?)([^'"\n]*?)\1/i.exec(disposition);
          if (match && match[2]) {
            downloadFilename = match[2];
          }
        }
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', downloadFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed');
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    try {
      await api.delete(`/files/${fileId}`);
      fetchFiles();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Delete failed');
    }
  };

  const handleShare = async (fileId) => {
    try {
      const expiresInHours = prompt(
        'Enter expiration in hours (leave blank for no expiration):',
        ''
      );

      const payload = expiresInHours ? { expiresInHours } : {};

      const { data } = await api.post(`/files/${fileId}/share`, payload);

      fetchFiles(); // refresh UI

      const link = data.shareUrl;

      // 🔥 FORCE COPY (works everywhere)
      try {
        await navigator.clipboard.writeText(link);
        alert("✅ Link copied!");
      } catch (err) {
        const tempInput = document.createElement("input");
        tempInput.value = link;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);

        alert("✅ Link copied!");
      }

    } catch (error) {
      console.error('Share failed:', error);
      alert('❌ Share failed');
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div>
      <div
        className="upload-section"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
      >
        <UploadCloud size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
        <h3>Drag & Drop Files Here</h3>
        <p style={{ color: '#0f1d35ff', marginTop: '0.5rem' }}>or click to browse (Max 50MB)</p>

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />

        {isUploading && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ background: '#e5e7eb', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ background: 'var(--primary)', height: '100%', width: `${uploadProgress}%`, transition: 'width 0.2s' }}></div>
            </div>
            <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Uploading: {uploadProgress}%</p>
          </div>
        )}
      </div>

      <div className="files-grid">
        {files.map(file => (
          <div key={file._id} className="file-card">
            <div className="file-header">
              <div className="file-info">
                <h3>{file.originalName}</h3>
                <p>{formatSize(file.size)} • {new Date(file.createdAt).toLocaleString()}</p>
              </div>
            </div>

            {file.isPublic && file.shareToken && (
              <div className="share-link-container">
                <LinkIcon size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                <span>
                  Shared (Expires: {file.expirationDate
                    ? new Date(file.expirationDate).toLocaleString()
                    : 'Never'})
                </span>
              </div>
            )}

            <div className="file-actions">
              <button className="btn-action" onClick={() => handleDownload(file._id, file.originalName)} title="Download">
                <Download size={18} />
              </button>
              <button className="btn-action" onClick={() => handleShare(file._id)} title="Share">
                <Share2 size={18} />
              </button>
              <button className="btn-action btn-danger" onClick={() => handleDelete(file._id)} title="Delete">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {files.length === 0 && (
          <p style={{ color: 'var(--text-muted)', gridColumn: '1 / -1', textAlign: 'center', marginTop: '2rem' }}>
            No files uploaded yet.
          </p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
