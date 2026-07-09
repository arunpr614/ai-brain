import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Separator } from '../components/ui/Separator'
import { Smartphone, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react'
export function DesktopPairDevice() {
  const navigate = useNavigate()
  const [isPaired, setIsPaired] = useState(false)
  const [pairingCode, setPairingCode] = useState('4823 9170')
  const handleRegenerateCode = () => {
    const newCode = Math.floor(10000000 + Math.random() * 90000000)
      .toString()
      .match(/.{1,4}/g)
      ?.join(' ')
    setPairingCode(newCode || '0000 0000')
  }
  return (
    <div className="min-h-screen w-full bg-canvas flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bg-panel border border-line rounded-card shadow-panel p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 bg-ink text-white rounded-full flex items-center justify-center mb-4 shadow-sm">
              <Smartphone size={20} />
            </div>

            <h1 className="text-xl font-bold text-ink">
              {isPaired ? 'Device Connected' : 'Pair a device'}
            </h1>
            <p className="text-sm text-ink-500 mt-1">
              {isPaired
                ? 'Your Android app is synced'
                : 'Connect your Android app to this Memory'}
            </p>
          </div>

          {!isPaired ? (
            <div className="space-y-4">
              {/* QR placeholder */}
              <div className="mx-auto w-40 h-40 border border-line-strong rounded-card flex items-center justify-center bg-canvas">
                <div className="grid grid-cols-4 gap-1 p-2">
                  {Array.from({
                    length: 16,
                  }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-5 h-5 rounded-sm ${(i * 7) % 3 === 0 ? 'bg-ink' : 'bg-line-strong'}`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-ink-500 text-center">
                Scan with the Android app or enter the pairing code.
              </p>

              {/* Manual code */}
              <div className="border border-line-strong rounded-chip p-3 text-center bg-canvas">
                <p className="text-xs text-ink-500 mb-1">Pairing code</p>
                <p className="font-mono text-lg tracking-widest text-ink font-bold">
                  {pairingCode}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => setIsPaired(true)}
                >
                  Confirm paired device
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  leftIcon={<RefreshCw size={14} />}
                  onClick={handleRegenerateCode}
                >
                  Regenerate
                </Button>
              </div>

              <p className="text-xs text-ink-400 text-center pt-2">
                The code expires in 10 minutes. Your device will sync
                automatically after pairing.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-lime-50 border border-lime-100 rounded-chip p-4 flex flex-col items-center text-center">
                <CheckCircle2 size={32} className="text-lime-600 mb-2" />
                <p className="text-sm font-bold text-lime-800">Pixel 8 Pro</p>
                <p className="text-xs text-lime-700 mt-1">
                  Last synced: Just now
                </p>
              </div>

              <Button
                className="w-full"
                variant="secondary"
                onClick={() => navigate('/settings')}
              >
                Manage Devices
              </Button>
            </div>
          )}

          <Separator spacing={16} />

          <button
            onClick={() => navigate('/library')}
            className="w-full flex items-center justify-center gap-1 text-sm text-ink-600 hover:text-ink transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Library
          </button>
        </div>
      </div>
    </div>
  )
}
