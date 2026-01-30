import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Check } from 'lucide-react';

interface SignaturePadProps {
  onSign: (signatureData: string) => void;
  onCancel: () => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSign, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Set drawing style
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSign = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    const signatureData = canvas.toDataURL('image/png');
    onSign(signatureData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
        <div className="p-6 border-b border-zinc-100">
          <h2 className="text-xl font-bold">Votre signature</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Dessinez votre signature dans la zone ci-dessous
          </p>
        </div>

        <div className="p-6">
          <div className="relative border-2 border-dashed border-zinc-300 rounded-xl overflow-hidden bg-zinc-50">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full touch-none"
              style={{ height: '200px' }}
            />

            {!hasSignature && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-zinc-400 text-sm">Signez ici</p>
              </div>
            )}
          </div>

          <button
            onClick={clearSignature}
            className="mt-4 flex items-center gap-2 px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700"
          >
            <Eraser className="w-4 h-4" />
            Effacer
          </button>
        </div>

        <div className="p-6 border-t border-zinc-100 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSign}
            disabled={!hasSignature}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-vibrant text-white rounded-xl font-medium hover:bg-vibrant/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            Signer
          </button>
        </div>

        <div className="px-6 pb-6">
          <p className="text-xs text-zinc-400 text-center">
            En signant, vous acceptez les termes du contrat. Cette signature a valeur légale.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignaturePad;
