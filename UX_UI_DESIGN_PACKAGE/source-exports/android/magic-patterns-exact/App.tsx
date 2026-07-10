import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MobileFrame } from './components/MobileFrame'
import { MobileLibrary } from './pages/MobileLibrary'
import { MobileShareCapture } from './pages/MobileShareCapture'
import { MobileRepair } from './pages/MobileRepair'
import { MobileItemDetail } from './pages/MobileItemDetail'
import { MobileTopic } from './pages/MobileTopic'
import { MobileCollection } from './pages/MobileCollection'
import { MobileOffline } from './pages/MobileOffline'
import { MobileAsk } from './pages/MobileAsk'
import { MobileCapture } from './pages/MobileCapture'
import { MobileMore } from './pages/MobileMore'
import { MobileLogin } from './pages/MobileLogin'
import { MobileNeedsUpgrade } from './pages/MobileNeedsUpgrade'

function Phone({ children }: { children: React.ReactNode }) {
  return <MobileFrame>{children}</MobileFrame>
}

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-200 flex items-center justify-center p-4 sm:p-8">
        <Routes>
          <Route path="/" element={<Navigate to="/library" replace />} />
          <Route path="/login" element={<Phone><MobileLogin /></Phone>} />
          <Route path="/library" element={<Phone><MobileLibrary /></Phone>} />
          <Route path="/share-capture" element={<Phone><MobileShareCapture /></Phone>} />
          <Route path="/repair/:id" element={<Phone><MobileRepair /></Phone>} />
          <Route path="/item/:id" element={<Phone><MobileItemDetail /></Phone>} />
          <Route path="/topic/:topicSlug" element={<Phone><MobileTopic /></Phone>} />
          <Route path="/collection/:collectionSlug" element={<Phone><MobileCollection /></Phone>} />
          <Route path="/offline" element={<Phone><MobileOffline /></Phone>} />
          <Route path="/needs-upgrade" element={<Phone><MobileNeedsUpgrade /></Phone>} />
          <Route path="/ask" element={<Phone><MobileAsk /></Phone>} />
          <Route path="/capture" element={<Phone><MobileCapture /></Phone>} />
          <Route path="/more" element={<Phone><MobileMore /></Phone>} />
          <Route path="/m/*" element={<Navigate to="/library" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
