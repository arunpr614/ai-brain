import React, { useState, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Lock,
  Fingerprint,
  Delete,
  WifiOff,
  CheckCircle2,
  ArrowLeft,
  QrCode,
  KeyRound,
} from 'lucide-react'
type Mode = 'unlock' | 'pair' | 'expired'
export function MobileLogin() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('unlock')
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pairState, setPairState] = useState<
    'choose' | 'unreachable' | 'connected'
  >('choose')
  const press = (d: string) => {
    setError(false)
    if (d === 'del') {
      setPin((p) => p.slice(0, -1))
    } else if (pin.length < 6) {
      setPin((p) => p + d)
    }
  }
  const handleUnlock = () => {
    if (pin.length < 4) {
      setError(true)
      return
    }
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      navigate('/library')
    }, 900)
  }
  return (
    <div className="flex flex-col h-full bg-white relative w-full">
      <div className="flex-1 overflow-auto p-6 flex flex-col">
        {/* ===== UNLOCK ===== */}
        {mode === 'unlock' && (
          <div className="flex-1 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col items-center text-center mt-12 mb-10">
              <div className="w-16 h-16 bg-slate-900 text-white rounded-xl flex items-center justify-center mb-6">
                <Lock size={28} />
              </div>
              <h1 className="text-[26px] font-bold text-slate-900 tracking-tight">
                Unlock AI Brain
              </h1>
              <p className="text-[15px] text-slate-500 mt-2">
                Your private memory workspace
              </p>
            </div>

            {/* PIN dots */}
            <div className="flex justify-center gap-4 mb-4">
              {Array.from({
                length: 6,
              }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-colors ${i < pin.length ? 'bg-slate-900' : 'bg-slate-200'}`}
                />
              ))}
            </div>

            <div className="h-6 mb-6">
              {error && (
                <p className="text-center text-[14px] font-semibold text-rose-600">
                  Incorrect PIN
                </p>
              )}
              {loading && (
                <p className="text-center text-[14px] font-medium text-slate-500">
                  Unlocking…
                </p>
              )}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-4 max-w-[280px] w-full mx-auto mb-8">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  onClick={() => press(d)}
                  className="h-16 bg-slate-50 border border-slate-200 rounded-full text-[24px] font-medium text-slate-900 active:bg-slate-100 active:scale-95 transition-all"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => press('bio')}
                aria-label="Use device unlock"
                className="h-16 flex items-center justify-center text-slate-400 active:text-slate-900 active:bg-slate-100 rounded-full transition-colors"
              >
                <Fingerprint size={28} />
              </button>
              <button
                onClick={() => press('0')}
                className="h-16 bg-slate-50 border border-slate-200 rounded-full text-[24px] font-medium text-slate-900 active:bg-slate-100 active:scale-95 transition-all"
              >
                0
              </button>
              <button
                onClick={() => press('del')}
                aria-label="Delete"
                className="h-16 flex items-center justify-center text-slate-400 active:text-slate-900 active:bg-slate-100 rounded-full transition-colors"
              >
                <Delete size={28} />
              </button>
            </div>

            <button
              className="w-full max-w-[280px] bg-slate-900 text-white font-semibold py-4 rounded-lg text-[16px] active:bg-slate-800 transition-colors disabled:opacity-40"
              onClick={handleUnlock}
              disabled={loading || pin.length < 4}
            >
              {loading ? 'Unlocking…' : 'Unlock'}
            </button>

            <div className="mt-auto pt-8 flex flex-col items-center gap-3">
              <button
                onClick={() => setMode('pair')}
                className="text-[14px] font-medium text-slate-600 active:text-slate-900"
              >
                Pair this device
              </button>
              <button
                onClick={() => setMode('expired')}
                className="text-[13px] text-slate-400 active:text-slate-600"
              >
                Use recovery code
              </button>
            </div>
          </div>
        )}

        {/* ===== FIRST-TIME PAIRING ===== */}
        {mode === 'pair' && (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col items-center text-center mt-8 mb-8">
              <div className="w-16 h-16 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center mb-6">
                <Lock size={28} />
              </div>
              <h1 className="text-[26px] font-bold text-slate-900 tracking-tight">
                Connect to your Brain
              </h1>
              <p className="text-[15px] text-slate-500 mt-2 leading-relaxed px-4">
                Pair this phone with your existing Brain to sync data.
              </p>
            </div>

            {pairState === 'choose' && (
              <div className="space-y-4 w-full max-w-[300px] mx-auto">
                <button
                  className="w-full bg-slate-900 text-white font-semibold py-4 rounded-lg text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  onClick={() => setPairState('connected')}
                >
                  <QrCode size={20} />
                  Scan QR from web
                </button>
                <button
                  className="w-full bg-white border border-slate-300 text-slate-700 font-semibold py-4 rounded-lg text-[15px] flex items-center justify-center gap-2 active:bg-slate-50 transition-colors"
                  onClick={() => setPairState('connected')}
                >
                  <KeyRound size={20} />
                  Enter pairing code
                </button>

                <div className="pt-6 flex flex-col items-center gap-3">
                  <button
                    onClick={() => navigate('/offline')}
                    className="text-[14px] font-medium text-slate-600 active:text-slate-900"
                  >
                    Continue offline
                  </button>
                  <button
                    onClick={() => setPairState('unreachable')}
                    className="text-[13px] text-slate-400 active:text-slate-600"
                  >
                    Connection issues?
                  </button>
                </div>
              </div>
            )}

            {pairState === 'unreachable' && (
              <div className="space-y-6 w-full max-w-[300px] mx-auto">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <WifiOff size={24} className="text-amber-600" />
                  </div>
                  <p className="text-[16px] font-bold text-amber-900 mb-2">
                    Can't reach your Brain
                  </p>
                  <p className="text-[14px] text-amber-800 leading-relaxed">
                    Make sure your Brain is online, then try again.
                  </p>
                </div>

                <button
                  className="w-full bg-slate-900 text-white font-semibold py-4 rounded-lg text-[15px] active:scale-[0.98] transition-transform"
                  onClick={() => setPairState('choose')}
                >
                  Try again
                </button>

                <button
                  onClick={() => navigate('/offline')}
                  className="w-full text-[14px] font-medium text-slate-600 text-center active:text-slate-900"
                >
                  Read offline items
                </button>
              </div>
            )}

            {pairState === 'connected' && (
              <div className="space-y-6 w-full max-w-[300px] mx-auto">
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 text-center">
                  <div className="w-14 h-14 bg-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} className="text-white" />
                  </div>
                  <p className="text-[18px] font-bold text-teal-900">
                    Device connected
                  </p>
                  <p className="text-[14px] text-teal-700 mt-2">
                    Your Brain is now synced.
                  </p>
                </div>

                <button
                  className="w-full bg-slate-900 text-white font-semibold py-4 rounded-lg text-[15px] active:scale-[0.98] transition-transform"
                  onClick={() => navigate('/library')}
                >
                  Open Library
                </button>
              </div>
            )}

            <button
              onClick={() => setMode('unlock')}
              className="mt-auto pt-8 mx-auto flex items-center gap-2 text-[14px] font-medium text-slate-500 active:text-slate-900"
            >
              <ArrowLeft size={16} />
              Back to unlock
            </button>
          </div>
        )}

        {/* ===== SESSION EXPIRED / RECONNECT ===== */}
        {mode === 'expired' && (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col items-center text-center mt-12 mb-8">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-6">
                <Lock size={28} />
              </div>
              <h1 className="text-[26px] font-bold text-slate-900 tracking-tight">
                Session Expired
              </h1>
              <p className="text-[15px] text-slate-500 mt-2 leading-relaxed px-4">
                For your privacy, the session timed out. Please unlock again.
              </p>
            </div>

            <div className="space-y-4 w-full max-w-[300px] mx-auto">
              <button
                className="w-full bg-slate-900 text-white font-semibold py-4 rounded-lg text-[15px] active:scale-[0.98] transition-transform"
                onClick={() => setMode('unlock')}
              >
                Unlock
              </button>

              <button
                className="w-full bg-white border border-slate-300 text-slate-700 font-semibold py-4 rounded-lg text-[15px] active:bg-slate-50 transition-colors"
                onClick={() => setMode('pair')}
              >
                Re-pair device
              </button>

              <button
                onClick={() => navigate('/offline')}
                className="w-full text-[14px] font-medium text-slate-600 text-center pt-4 active:text-slate-900"
              >
                Read offline items
              </button>
            </div>

            <p className="text-[13px] text-slate-400 text-center mt-auto pt-8 px-6 leading-relaxed">
              Offline reads still work. Ask and capture sync need a connection.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
