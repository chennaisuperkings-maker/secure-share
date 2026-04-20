import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const DownloadPage = () => {
    const { token } = useParams();
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        axios.get(`http://10.46.47.10:5000/api/files/info/${token}`)
            .then(res => {
                setFile(res.data);
                setLoading(false);
            })
            .catch(() => {
                setFile("error");
                setLoading(false);
            });
    }, [token]);
    useEffect(() => {
        if (!file?.expiresAt) return;

        const interval = setInterval(() => {
            const now = new Date();
            const expiry = new Date(file.expiresAt);
            const diff = expiry - now;

            if (diff <= 0) {
                setTimeLeft("expired");
                clearInterval(interval);
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff / (1000 * 60)) % 60);
            const seconds = Math.floor((diff / 1000) % 60);

            setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        }, 1000);

        return () => clearInterval(interval);
    }, [file]);

    const getFileIcon = (type) => {
        if (!type) return "📁";

        if (type.startsWith("image")) return "🖼️";
        if (type === "application/pdf") return "📄";
        if (type.includes("zip") || type.includes("rar")) return "📦";
        if (type.startsWith("audio")) return "🎵";
        if (type.startsWith("video")) return "🎬";

        return "📁";
    };

    const handleDownload = () => {
        window.open(
            `http://10.46.47.10:5000/api/files/shared/${token}`,
            "_blank",
            "noopener,noreferrer"
        );
    };

    // 🔄 Loading
    if (loading) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: '#010e1cff',
                color: '#111827'
            }}>
                <h2>⏳ Loading File...</h2>
            </div>
        );
    }

    // ❌ Error
    if (file === "error") {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: '#020617',
                color: '#ef4444'
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
            background: 'linear-gradient(135deg, #7317eceb, #f45c69ff)',
            backgroundSize: '200% 200%',
            animation: 'gradientFlow 20s ease infinite'
        }}>

            {/* Card */}
            <div style={{
                backdropFilter: 'blur(18px)',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '30px',
                borderRadius: '20px',
                width: '420px',
                color: '#ffffff',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
            }}>

                {/* File Name */}
                <h2 style={{
                    textAlign: 'center',
                    marginBottom: '20px',
                    fontWeight: '600',
                    fontSize: '22px'
                }}>
                    📄 {file?.fileName}
                </h2>

                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '20px'
                }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.15)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontSize: '40px'
                    }}>
                        {getFileIcon(file?.fileType)}
                    </div>
                </div>

                {/* Preview */}


                {/* Info */}
                <div style={{
                    fontSize: '14px',
                    color: '#f1f5f9',
                    lineHeight: '1.8'
                }}>
                    <p>👤 <b>Sender:</b> {file?.uploadedBy}</p>
                    <p>📦 <b>Size:</b> {(file?.fileSize / 1024).toFixed(2)} KB</p>
                    <p>📂 <b>Type:</b> {file?.fileType}</p>
                    <p>📅 <b>Date:</b> {new Date(file?.uploadedAt).toLocaleString()}</p>
                    <p>
                        ⏳ <b>Expires in:</b> {
                            timeLeft === "expired"
                                ? "❌ Expired"
                                : timeLeft || "Loading..."
                        }
                    </p>
                </div>

                {/* Button */}
                <button
                    onClick={handleDownload}
                    disabled={timeLeft === "expired"}
                    style={{
                        width: '100%',
                        marginTop: '20px',
                        padding: '14px',
                        borderRadius: '12px',
                        border: 'none',
                        fontSize: '16px',
                        cursor: 'pointer',
                        background: '#111827',
                        color: 'white',
                        fontWeight: '600',
                        transition: '0.3s'
                    }}
                    onMouseOver={e => e.target.style.transform = 'scale(1.05)'}
                    onMouseOut={e => e.target.style.transform = 'scale(1)'}
                >
                    ⬇️ Download File
                </button>

            </div>

            {/* Animation */}
            <style>
                {`
            @keyframes gradientFlow {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
            `}
            </style>
        </div>
    );
};

export default DownloadPage;