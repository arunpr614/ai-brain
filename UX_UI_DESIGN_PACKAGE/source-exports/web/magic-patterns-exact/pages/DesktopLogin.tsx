import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Separator } from '../components/ui/Separator'
import { Brain } from 'lucide-react'
export function DesktopLogin() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Determine mode from URL or default to unlock
  const urlMode = searchParams.get('mode')
  const [mode, setMode] = useState<'unlock' | 'setup' | 'expired' | 'offline'>(
    (urlMode as any) || 'unlock',
  )
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const handleUnlock = () => {
    if (!pin.trim()) {
      setError(true)
      return
    }
    setError(false)
    setLoading(true)
    // Simulate incorrect PIN on "1111"
    if (pin === '1111') {
      setTimeout(() => {
        setLoading(false)
        setError(true)
      }, 600)
      return
    }
    setTimeout(() => {
      setLoading(false)
      navigate('/library')
    }, 900)
  }
  return (
    <div className="min-h-screen w-full bg-canvas flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bg-panel border border-line rounded-card shadow-panel p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 bg-ink text-white rounded-full flex items-center justify-center mb-4 shadow-sm">
              <Brain size={20} />
            </div>

            {mode === 'unlock' && (
              <>
                <h1 className="text-xl font-bold text-ink">Unlock AI Memory</h1>
                <p className="text-sm text-ink-500 mt-1">
                  Your private knowledge workspace
                </p>
              </>
            )}
            {mode === 'setup' && (
              <>
                <h1 className="text-xl font-bold text-ink">Set up AI Memory</h1>
                <p className="text-sm text-ink-500 mt-1">
                  Create your private knowledge workspace
                </p>
              </>
            )}
            {mode === 'expired' && (
              <>
                <h1 className="text-xl font-bold text-ink">Session Expired</h1>
                <p className="text-sm text-ink-500 mt-1">Unlock to continue</p>
              </>
            )}
            {mode === 'offline' && (
              <>
                <h1 className="text-xl font-bold text-ink">Offline Mode</h1>
                <p className="text-sm text-ink-500 mt-1">
                  Read-only access to cached items
                </p>
              </>
            )}
          </div>

          {/* UNLOCK / EXPIRED */}
          {(mode === 'unlock' || mode === 'expired') && (
            <div className="space-y-4">
              {mode === 'expired' && (
                <div className="bg-ruby-50 border border-ruby-100 rounded-chip p-3 text-sm text-ruby-700 text-center">
                  Your session expired. Please unlock again.
                </div>
              )}

              <div>
                <Input
                  type="password"
                  label="PIN or passcode"
                  placeholder="Enter your PIN"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value)
                    setError(false)
                  }}
                  error={error ? 'Incorrect PIN' : undefined}
                  onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleUnlock}
                loading={loading}
              >
                {loading ? 'Unlocking…' : 'Unlock'}
              </Button>

              <Separator spacing={8} />

              <div className="space-y-2">
                <button
                  onClick={() => setMode('setup')}
                  className="w-full text-sm text-ink-600 hover:text-ink underline transition-colors"
                >
                  Use recovery code
                </button>
                <button
                  onClick={() => setMode('offline')}
                  className="w-full text-sm text-ink-600 hover:text-ink underline transition-colors"
                >
                  Open read-only offline cache
                </button>
              </div>

              <p className="text-xs text-ink-400 text-center pt-2">
                Data is private to this Memory. It stays on your devices and is
                only unlocked with your PIN.
              </p>
            </div>
          )}

          {/* SETUP / FIRST RUN */}
          {mode === 'setup' && (
            <div className="space-y-4">
              <Input
                type="password"
                label="Create PIN"
                placeholder="Choose a PIN"
              />
              <Input
                type="password"
                label="Confirm PIN"
                placeholder="Re-enter your PIN"
              />

              <div className="bg-canvas border border-line rounded-chip p-3">
                <p className="text-xs font-bold text-ink mb-1">Recovery code</p>
                <p className="text-xs text-ink-500">
                  Save a recovery code in case you forget your PIN. You can do
                  this now or later.
                </p>
              </div>

              <Button className="w-full" onClick={() => navigate('/library')}>
                Create private Memory
              </Button>

              <button
                onClick={() => setMode('unlock')}
                className="w-full text-sm text-ink-600 hover:text-ink underline transition-colors"
              >
                Back to unlock
              </button>
            </div>
          )}

          {/* OFFLINE READ-ONLY */}
          {mode === 'offline' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-100 rounded-chip p-4 text-center">
                <p className="text-sm font-medium text-amber-900 mb-1">
                  Read-only mode
                </p>
                <p className="text-xs text-amber-700">
                  You can browse cached items but cannot capture new content or
                  use Ask.
                </p>
              </div>

              <Button className="w-full" onClick={() => navigate('/library')}>
                Continue to Library
              </Button>

              <button
                onClick={() => setMode('unlock')}
                className="w-full text-sm text-ink-600 hover:text-ink underline transition-colors"
              >
                Back to unlock
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
