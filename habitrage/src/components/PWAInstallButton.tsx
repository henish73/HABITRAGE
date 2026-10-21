import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Download, Share } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 px-4 py-2 bg-[#2D34FB] text-white rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg"
      >
        <Download className="w-4 h-4" />
        Install App
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E2E8F0] text-[#718096] rounded-xl font-bold text-sm hover:border-[#2D34FB]/30 transition-all"
        >
          <Download className="w-4 h-4" />
          Install on iOS
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-[32px] bg-white p-8 shadow-2xl">
              <h3 className="text-xl font-bold text-[#2D3748] font-lexend">Install on iOS</h3>
              <div className="mt-6 space-y-6 text-[#718096]">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#F9F7F2] flex items-center justify-center flex-shrink-0 text-[#2D34FB] font-bold">1</div>
                  <p className="text-sm">
                    Tap the <span className="inline-block p-1 bg-gray-100 rounded"><Share className="w-4 h-4 inline" /> Share</span> button in the Safari toolbar.
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#F9F7F2] flex items-center justify-center flex-shrink-0 text-[#2D34FB] font-bold">2</div>
                  <p className="text-sm">
                    Scroll down and tap <span className="font-bold text-[#2D3748]">Add to Home Screen</span>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-8 w-full rounded-2xl bg-[#F9F7F2] py-4 text-sm font-bold text-[#2D3748] hover:bg-[#E2E8F0] transition-all"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
