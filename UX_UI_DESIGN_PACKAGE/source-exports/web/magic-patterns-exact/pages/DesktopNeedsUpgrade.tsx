import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { getWeakSources } from '../data/sources'
export function DesktopNeedsUpgrade() {
  const navigate = useNavigate()
  const weakSources = getWeakSources()
  const groupedSources = {
    'Needs transcript': weakSources.filter(
      (s) => s.needsUpgradeReason === 'Needs transcript',
    ),
    'Needs pasted text': weakSources.filter(
      (s) => s.needsUpgradeReason === 'Needs pasted text',
    ),
    'Preview only': weakSources.filter(
      (s) => s.needsUpgradeReason === 'Preview only',
    ),
    'Retry extraction': weakSources.filter(
      (s) => s.needsUpgradeReason === 'Retry extraction',
    ),
  }
  const getActionButton = (reason: string, sourceId: string) => {
    switch (reason) {
      case 'Needs transcript':
        return (
          <Button
            size="small"
            variant="primary"
            onClick={() => navigate(`/item/${sourceId}`)}
          >
            Add transcript
          </Button>
        )
      case 'Needs pasted text':
        return (
          <Button
            size="small"
            variant="primary"
            onClick={() => navigate(`/item/${sourceId}`)}
          >
            Paste text
          </Button>
        )
      case 'Preview only':
        return (
          <Button
            size="small"
            variant="primary"
            onClick={() => navigate(`/item/${sourceId}`)}
          >
            Add full text
          </Button>
        )
      case 'Retry extraction':
        return (
          <Button size="small" variant="primary">
            Retry
          </Button>
        )
      default:
        return null
    }
  }
  return (
    <div className="h-full overflow-auto bg-canvas">
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-ink mb-2">Needs Upgrade</h1>
          <p className="text-sm text-ink-500">
            These items need additional content to be useful in Ask.
          </p>
        </div>

        <div className="space-y-8">
          {Object.entries(groupedSources).map(([reason, items]) => {
            if (items.length === 0) return null
            return (
              <div key={reason}>
                <h2 className="text-xs font-bold text-ink-600 uppercase tracking-wider mb-3 pb-2 border-b border-line">
                  {reason}
                </h2>

                <div className="space-y-3">
                  {items.map((source) => (
                    <div
                      key={source.id}
                      className="bg-panel border border-line rounded-card p-4 hover:border-line-strong hover:shadow-panel transition-all cursor-pointer group"
                      onClick={() => navigate(`/item/${source.id}`)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-base font-bold text-ink truncate group-hover:text-azure-600 transition-colors">
                              {source.title}
                            </h3>
                            <Badge size="small" variant="ruby" style="soft">
                              {source.quality}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-x-3 gap-y-1 text-xs text-ink-500 flex-wrap">
                            <span className="font-medium text-ink-700">
                              {source.sourceType}
                            </span>
                            <span className="text-line-strong">•</span>
                            <span>Via {source.capturedVia}</span>
                            <span className="text-line-strong">•</span>
                            <span>{source.savedDate}</span>
                          </div>
                        </div>

                        <div
                          className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {getActionButton(reason, source.id)}
                          <Button size="small" variant="secondary">
                            Mark good enough
                          </Button>
                          <Button size="small" variant="danger">
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {weakSources.length === 0 && (
            <div className="text-center py-12">
              <p className="text-ink-500">All your items are fully upgraded.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
