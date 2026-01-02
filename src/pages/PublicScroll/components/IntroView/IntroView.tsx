import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from 'qrcode.react';
import { Logo } from '../../../../components/Logo';
import type { Scroll } from "../../../../types/scroll";
import "./IntroView.css";

type IntroViewProps = {
  scroll: Scroll;
  isOwner: boolean;
  isAuthenticated: boolean;
  transitioning: boolean;
  onActivateLinks: () => Promise<void>;
  onStartSession: () => Promise<void>;
};

export function IntroView({
  scroll,
  isOwner,
  isAuthenticated,
  transitioning,
  onActivateLinks,
  onStartSession,
}: IntroViewProps) {
  const navigate = useNavigate();
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);

  const getShareableLink = () => {
    if (!scroll?.key) return null;
    const baseUrl = window.location.origin;
    return `${baseUrl}/scroll/${scroll.id}?key=${scroll.key}`;
  };

  const handleCopyLink = () => {
    const link = getShareableLink();
    if (link) {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyQR = async () => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = async () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);

        canvas.toBlob(async (blob) => {
          if (blob) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            setQrCopied(true);
            setTimeout(() => setQrCopied(false), 2000);
          }
        }, 'image/png');
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    } catch (err) {
      console.error('Failed to copy QR code:', err);
    }
  };

  const handleDownloadQR = () => {
    if (!qrRef.current || !scroll) return;

    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      const link = document.createElement('a');
      link.download = `${scroll.name.replace(/\s+/g, '-')}-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="public-scroll-container">
      <header className="public-scroll-header">
        <div className="public-scroll-header-left">
          <Logo size="small" />
        </div>
        <div className="public-scroll-header-center">
          <h1 className="public-scroll-title">{scroll.name}</h1>
        </div>
        <div className="public-scroll-header-right">
          {isAuthenticated && (
            <button
              className="dashboard-link-button"
              onClick={() => navigate('/')}
            >
              ← Dashboard
            </button>
          )}
        </div>
      </header>
      <main className="public-scroll-main">
        <div className="intro-container">
          <div className="intro-content">
            <h2>Welcome!</h2>
            <p>This session has {scroll.modules.length} {scroll.modules.length === 1 ? 'module' : 'modules'}.</p>

            {isOwner && scroll.key && (
              <div className="intro-share-section">
                <h3>Share this session</h3>
                <div className="share-link-group">
                  <label>Public Link</label>
                  <div className="share-link-row">
                    <input
                      type="text"
                      value={getShareableLink() || ''}
                      readOnly
                      className="share-link-input"
                      onClick={(e) => e.currentTarget.select()}
                    />
                    <button
                      onClick={handleCopyLink}
                      className="copy-link-btn"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="qr-code-section">
                  <div className="qr-code-box" ref={qrRef}>
                    <QRCodeSVG
                      value={getShareableLink() || ''}
                      size={160}
                      level="M"
                      includeMargin={true}
                    />
                  </div>
                  <div className="qr-actions">
                    <button onClick={handleCopyQR} className="qr-btn">
                      {qrCopied ? 'Copied!' : 'Copy QR'}
                    </button>
                    <button onClick={handleDownloadQR} className="qr-btn">
                      Download PNG
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isOwner && (
              <button
                className="start-session-button"
                onClick={scroll.status === 'draft' ? onActivateLinks : onStartSession}
                disabled={transitioning}
              >
                {transitioning
                  ? (scroll.status === 'draft' ? 'Activating...' : 'Starting...')
                  : (scroll.status === 'draft' ? 'Activate Links' : 'Start Session')
                }
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
