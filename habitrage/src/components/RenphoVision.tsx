import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Upload, 
  Camera, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Dna,
  Scale,
  Zap
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { HealthLog } from '../types';

interface RenphoVisionProps {
  userId: string;
  openRouterKey: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RenphoVision: React.FC<RenphoVisionProps> = ({ 
  userId, 
  openRouterKey, 
  isOpen, 
  onClose,
  onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<Partial<HealthLog> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  const processImage = async () => {
    if (!preview || !openRouterKey || !userId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: preview,
          openRouterKey,
          model: 'openai/gpt-4o'
        })
      });

      if (!response.ok) throw new Error('Vision extraction failed');

      const data = await response.json();
      setExtractedData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const commitData = async () => {
    if (!extractedData || !userId) return;

    setLoading(true);
    try {
      const logEntry = {
        ...extractedData,
        date: new Date().toISOString(),
        recoveryScore: Math.floor(Math.random() * 40) + 60, // Mocked recovery for now
      };

      await addDoc(collection(db, `users/${userId}/health_logs`), logEntry);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#2D3748]/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-[#718096] hover:bg-[#F9F7F2] rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-10 space-y-8">
          <div className="space-y-2">
            <h3 className="text-3xl font-lexend font-bold text-[#2D3748]">Renpho Vision Scan</h3>
            <p className="text-[#718096] text-sm">Upload a photo of your smart scale readout for AI extraction.</p>
          </div>

          {!extractedData ? (
            <div className="space-y-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-video border-2 border-dashed border-[#E2E8F0] rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:border-[#8DAA91] hover:bg-[#8DAA91]/5 transition-all overflow-hidden relative"
              >
                {preview ? (
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center space-y-3">
                    <div className="w-12 h-12 bg-[#F9F7F2] rounded-full flex items-center justify-center mx-auto text-[#8DAA91]">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-lexend font-bold text-[#2D3748]">Drop Image or Click</p>
                      <p className="text-xs text-[#718096]">Support JPG, PNG, WEBP</p>
                    </div>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden" 
                  accept="image/*"
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 text-sm">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}

              <button
                disabled={!file || loading}
                onClick={processImage}
                className="w-full bg-[#2D3748] text-white py-4 rounded-2xl font-lexend font-bold hover:bg-[#1A202C] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                {loading ? 'Analyzing Biometrics...' : 'Extract Telemetry'}
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Object.entries(extractedData).map(([key, value]) => (
                  <div key={key} className="p-4 bg-[#F9F7F2] rounded-2xl">
                    <p className="text-[10px] text-[#718096] uppercase font-bold tracking-widest mb-1">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                    <p className="font-lexend font-bold text-[#2D3748]">
                      {value}{typeof value === 'number' && key.toLowerCase().includes('pct') ? '%' : key.toLowerCase().includes('kg') ? 'kg' : ''}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setExtractedData(null)}
                  className="flex-1 bg-[#F9F7F2] text-[#2D3748] py-4 rounded-2xl font-lexend font-bold hover:bg-[#E2E8F0] transition-all"
                >
                  Rescan
                </button>
                <button
                  onClick={commitData}
                  disabled={loading}
                  className="flex-[2] bg-[#8DAA91] text-white py-4 rounded-2xl font-lexend font-bold hover:bg-[#7D9A81] transition-all shadow-lg shadow-[#8DAA91]/20 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Commit to Vault
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
