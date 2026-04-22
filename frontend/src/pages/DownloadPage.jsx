import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { decryptFile } from '../utils/encryption';

const DownloadPage = () => {
    const { token } = useParams();
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        api.get(`/files/info/${token}`)
            .then(res => {
                setFile(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setFile("error");
                setLoading(false);
            });
    }, [token]);

    const getFileIcon = (type) => {
        if (!type) return "📁";
        if (type.startsWith("image")) return "🖼️";
        if (type === "application/pdf") return "📄";
        if (type.includes("zip") || type.includes("rar")) return "📦";
        if (type.startsWith("audio")) return "🎵";
        if (type.startsWith("video")) return "🎬";
        return "📁";
    };

    // ✅ FIXED DOWNLOAD WITH DECRYPTION
    const handleDownload = async () => {
        try {
            setDownloading(true);

            const response = await api.get(`/files/shared/${token}`, {
                responseType: 'blob',
            });

            const encryptedOnClient = response.headers['x-encrypted-on-client'] === 'true';

            let fileBlob = response.data;
            let filename = file?.fileName || "download";

            if (encryptedOnClient) {
                const ivBase64 = response.headers['x-encryption-iv'];
                const authTagBase64 = response.headers['x-encryption-auth-tag'];

                if (!ivBase64 || !authTagBase64) {
                    throw new Error("Missing encryption metadata");
                }

                // 🔐 Ask password
                const password = prompt("Enter decryption password:");
                if (!password) throw new Error("Password required");

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

                // ✅ correct decrypt
                const decrypted = await decryptFile(encryptedData, key, iv, authTag);

                fileBlob = new Blob([decrypted], {
                    type: response.headers['content-type']
                });
            }

            // ⬇️ download trigger
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
            alert(err.message || "Download failed");
        } finally {
            setDownloading(false);
        }
    };

    // 🔄 Loading
    if (loading) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: '#010e1c',
                color: '#fff'
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
            background: 'linear-gradient(135deg, #7317ec, #f45c69)',
            backgroundSize: '200% 200%',
            animation: 'gradientFlow 20s ease infinite'
        }}>

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

                <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
                    📄 {file?.fileName}
                </h2>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
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

                <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                    <p>👤 <b>Sender:</b> {file?.uploadedBy}</p>
                    <p>📦 <b>Size:</b> {(file?.fileSize / 1024).toFixed(2)} KB</p>
                    <p>📂 <b>Type:</b> {file?.fileType}</p>
                    <p>📅 <b>Date:</b> {new Date(file?.uploadedAt).toLocaleString()}</p>
                </div>

                <button
                    onClick={handleDownload}
                    disabled={downloading}
                    style={{
                        width: '100%',
                        marginTop: '20px',
                        padding: '14px',
                        borderRadius: '12px',
                        border: 'none',
                        fontSize: '16px',
                        cursor: 'pointer',
                        background: '#111827',
                        color: 'white'
                    }}
                >
                    {downloading ? "Decrypting..." : "⬇️ Download File"}
                </button>
            </div>

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