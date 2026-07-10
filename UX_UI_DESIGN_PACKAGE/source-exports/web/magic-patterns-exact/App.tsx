import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DesktopLayout } from './components/DesktopLayout'
import { DesktopLibrary } from './pages/DesktopLibrary'
import { DesktopNeedsUpgrade } from './pages/DesktopNeedsUpgrade'
import { DesktopItemDetail } from './pages/DesktopItemDetail'
import { DesktopTopic } from './pages/DesktopTopic'
import { DesktopCollection } from './pages/DesktopCollection'
import { DesktopAsk } from './pages/DesktopAsk'
import { DesktopCapture } from './pages/DesktopCapture'
import { DesktopSettings } from './pages/DesktopSettings'
import { DesktopLogin } from './pages/DesktopLogin'
import { DesktopPairDevice } from './pages/DesktopPairDevice'

function Shell({ children }: { children: React.ReactNode }) {
  return <DesktopLayout>{children}</DesktopLayout>
}

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-canvas text-ink">
        <Routes>
          <Route path="/" element={<Navigate to="/library" replace />} />
          <Route path="/login" element={<DesktopLogin />} />
          <Route path="/pair" element={<DesktopPairDevice />} />
          <Route path="/library" element={<Shell><DesktopLibrary /></Shell>} />
          <Route path="/needs-upgrade" element={<Shell><DesktopNeedsUpgrade /></Shell>} />
          <Route path="/item/:id" element={<Shell><DesktopItemDetail /></Shell>} />
          <Route path="/topics/:topicSlug" element={<Shell><DesktopTopic /></Shell>} />
          <Route path="/collections/:collectionSlug" element={<Shell><DesktopCollection /></Shell>} />
          <Route path="/ask" element={<Shell><DesktopAsk /></Shell>} />
          <Route path="/ask/:conversationId" element={<Shell><DesktopAsk /></Shell>} />
          <Route path="/capture" element={<Shell><DesktopCapture /></Shell>} />
          <Route path="/settings" element={<Shell><DesktopSettings /></Shell>} />
          <Route path="/m/*" element={<Navigate to="/library" replace />} />
          <Route path="*" element={<Navigate to="/library" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
