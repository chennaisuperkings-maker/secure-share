import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const DownloadPage = () => {
    const { token } = useParams();
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`http://10.46.47.10:5000/api/files/info/${token}`)
            .then(res => {
                setFile(res.data);
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
                setFile("error");
            });
    }, [token]);

    const handleDownload = () => {
        window.open(`http://10.46.47.10:5000/api/files/shared/${token}`);
    };

    // 🔄 Loading UI
    if (loading) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: '#0f172a',
                color: 'white'
            }}>
                <h2>⏳ Loading File...</h2>
            </div>
        );
    }
    if (file === "error") {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: '#10c319d3',
                color: 'white'
            }}>
                <h2>❌ Invalid or Expired Link</h2>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'radial-gradient(circle at top left, #1e293b, #020617)'
        }}>
            <div style={{
                backdropFilter: 'blur(20px)',
                background: 'rgba(172, 22, 213, 0.93)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '30px',
                borderRadius: '20px',
                width: '420px',
                color: 'white',
                boxShadow: '0 0 40px rgba(27, 133, 77, 0.49), 0 20px 60px rgba(190, 57, 242, 0.6)'
            }}>

                {/* File Name */}
                <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
                    📄 {file.fileName}
                </h2>

                {/* Preview Section */}
                {file?.fileType?.startsWith("image") && (
                    <img
                        src={`http://10.46.47.10:5000/api/files/shared/${token}`}
                        alt="preview"
                        style={{
                            width: '100%',
                            height: '200px',
                            objectFit: 'cover',
                            borderRadius: '12px',
                            marginBottom: '15px',
                            boxShadow: '0 10px 20px rgba(0,0,0,0.4)'
                        }}
                    />
                )}

                {file?.fileType === "application/pdf" && (
                    <iframe
                        src={`http://10.46.47.10:5000/api/files/shared/${token}`}
                        style={{ width: '100%', height: '200px', borderRadius: '10px' }}
                    />
                )}

                {/* File Info */}
                <div style={{ marginTop: '15px' }}>
                    <p>👤 <b>Sender:</b> {file.uploadedBy}</p>
                    <p>📦 <b>Size:</b> {(file.fileSize / 1024).toFixed(2)} KB</p>
                    <p>📂 <b>Type:</b> {file.fileType}</p>
                    <p>📅 <b>Date:</b> {new Date(file.uploadedAt).toLocaleString()}</p>
                </div>

                {/* Download Button */}
                <button
                    onClick={handleDownload}
                    style={{
                        width: '100%',
                        marginTop: '20px',
                        padding: '15px',
                        borderRadius: '12px',
                        border: 'none',
                        fontSize: '18px',
                        cursor: 'pointer',
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                        color: 'white',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                        transition: '0.3s'
                    }}
                    onMouseOver={e => e.target.style.transform = 'scale(1.05)'}
                    onMouseOut={e => e.target.style.transform = 'scale(1)'}
                >
                    ⬇️ Download File
                </button>

            </div>
        </div>
    );
};

export default DownloadPage;