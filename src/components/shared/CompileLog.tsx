/**
 * CompileLog — tabbed panel showing structured compilation output.
 */

import React, { useState, useEffect } from 'react'
import type { CompilationLog, LogCategory, LogItem } from '../../constants'
import { EMPTY_COMPILATION_LOG } from '../../constants'

interface CompileLogProps {
  compilationLog: CompilationLog
  onJumpToLine?: (line: number, file?: string) => void
  forceOpen?: boolean
  height?: number
  onOpenChange?: (open: boolean) => void
}

interface TabDef {
  id: LogCategory
  label: string
  countKey: 'errorsCount' | 'warningsCount' | 'badboxesCount' | 'missingRefsCount' | null
  badgeClass: string
}

const TABS: TabDef[] = [
  { id: 'errors', label: 'Errors', countKey: 'errorsCount', badgeClass: 'compile-log-badge-error' },
  { id: 'warnings', label: 'Warnings', countKey: 'warningsCount', badgeClass: 'compile-log-badge-warning' },
  { id: 'badboxes', label: 'Bad Boxes', countKey: 'badboxesCount', badgeClass: 'compile-log-badge-muted' },
  { id: 'missingRefs', label: 'Missing Refs', countKey: 'missingRefsCount', badgeClass: 'compile-log-badge-muted' },
  { id: 'rawLog', label: 'Raw Log', countKey: null, badgeClass: '' },
]

function getDefaultTab(log: CompilationLog): LogCategory {
  if (log.summary.errorsCount > 0) return 'errors'
  if (log.summary.warningsCount > 0) return 'warnings'
  if (log.summary.badboxesCount > 0) return 'badboxes'
  if (log.summary.missingRefsCount > 0) return 'missingRefs'
  if (log.rawLog) return 'rawLog'
  return 'errors'
}

function getItemsForTab(log: CompilationLog, tab: LogCategory): LogItem[] {
  switch (tab) {
    case 'errors': return log.errors
    case 'warnings': return log.warnings
    case 'badboxes': return log.badboxes
    case 'missingRefs': return log.missingRefs
    default: return []
  }
}

function LogEntry({
  item,
  severity,
  onJumpToLine,
}: {
  item: LogItem
  severity: 'error' | 'warning' | 'muted'
  onJumpToLine?: (line: number, file?: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const hasContext = !!item.context

  const severityClass =
    severity === 'error' ? 'compile-log-item-error'
    : severity === 'warning' ? 'compile-log-item-warning'
    : 'compile-log-item-muted'

  return (
    <div className={`compile-log-item ${severityClass}`}>
      <button
        className="compile-log-item-header"
        onClick={() => hasContext && setExpanded(!expanded)}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`shrink-0 transition-transform duration-150 ${hasContext ? (expanded ? 'rotate-90' : '') : 'opacity-0'}`}>
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span className="compile-log-item-icon">
          {severity === 'error' ? '×' : severity === 'warning' ? '!' : '○'}
        </span>
        <span className="compile-log-item-message">{item.message}</span>
        {item.package && <span className="compile-log-item-package">{item.package}</span>}
        {item.file && <span className="compile-log-item-file">{item.file}</span>}
        {item.line != null && (
          <button
            className="compile-log-item-line"
            onClick={(e) => { e.stopPropagation(); onJumpToLine?.(item.line!, item.file) }}
            title={`Go to line ${item.line}`}
          >
            L{item.line}
          </button>
        )}
      </button>
      {expanded && hasContext && (
        <pre className="compile-log-item-context">{item.context}</pre>
      )}
    </div>
  )
}

export function CompileLog({ compilationLog, onJumpToLine, forceOpen, height, onOpenChange }: CompileLogProps) {
  const log = compilationLog || EMPTY_COMPILATION_LOG
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<LogCategory>(() => getDefaultTab(log))

  const totalIssues =
    log.summary.errorsCount + log.summary.warningsCount +
    log.summary.badboxesCount + log.summary.missingRefsCount

  useEffect(() => {
    setActiveTab(getDefaultTab(log))
  }, [
    log.summary.errorsCount,
    log.summary.warningsCount,
    log.summary.badboxesCount,
    log.summary.missingRefsCount,
    log.rawLog,
  ])

  useEffect(() => {
    if (forceOpen) setIsOpen(true)
  }, [forceOpen])

  useEffect(() => {
    onOpenChange?.(isOpen)
  }, [isOpen, onOpenChange])

  const items = getItemsForTab(log, activeTab)
  const severity: 'error' | 'warning' | 'muted' =
    activeTab === 'errors' ? 'error'
    : activeTab === 'warnings' ? 'warning'
    : 'muted'

  const hasAnyOutput = totalIssues > 0 || !!log.rawLog || log.compiled

  return (
    <div className="compile-log-panel">
      {isOpen && (
        <div className="compile-log-body" style={height ? { height, minHeight: height } : undefined}>
          <div className="compile-log-tabs">
            {TABS.map((tab) => {
              const count = tab.countKey ? log.summary[tab.countKey] : (tab.id === 'rawLog' && log.rawLog ? 1 : 0)
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  className={`compile-log-tab ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span>{tab.label}</span>
                  {tab.countKey != null && count > 0 && (
                    <span className={`compile-log-tab-badge ${tab.badgeClass}`}>{count}</span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="compile-log-content">
            {!hasAnyOutput ? (
              <div className="compile-log-empty">
                Compile your resume to see structured errors, warnings, and the raw compiler log.
              </div>
            ) : activeTab === 'rawLog' ? (
              <pre className="compile-log-raw">{log.rawLog || 'No compilation log available.'}</pre>
            ) : items.length === 0 ? (
              <div className="compile-log-empty">
                {totalIssues === 0 && log.compiled
                  ? 'Compilation completed with no structured issues.'
                  : `No ${activeTab === 'errors' ? 'errors' : activeTab === 'warnings' ? 'warnings' : activeTab === 'badboxes' ? 'bad boxes' : 'missing references'} found.`}
              </div>
            ) : (
              items.map((item, i) => (
                <LogEntry key={i} item={item} severity={severity} onJumpToLine={onJumpToLine} />
              ))
            )}
          </div>
        </div>
      )}

      <button
        className="compile-log-toggle"
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
        aria-live="polite"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`shrink-0 text-content-tertiary transition-transform duration-150 ${isOpen ? 'rotate-90' : '-rotate-90'}`}>
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span className="font-medium">Compile Log</span>
        {log.summary.errorsCount > 0 && (
          <span className="compile-log-badge-error">{log.summary.errorsCount} error{log.summary.errorsCount !== 1 ? 's' : ''}</span>
        )}
        {log.summary.warningsCount > 0 && (
          <span className="compile-log-badge-warning">{log.summary.warningsCount} warning{log.summary.warningsCount !== 1 ? 's' : ''}</span>
        )}
        {log.summary.badboxesCount > 0 && (
          <span className="compile-log-badge-muted">{log.summary.badboxesCount} badbox{log.summary.badboxesCount !== 1 ? 'es' : ''}</span>
        )}
        {totalIssues === 0 && log.compiled && (
          <span className="text-success text-[10px]">No issues</span>
        )}
        {log.duration != null && log.duration > 0 && (
          <span className="ml-auto text-content-tertiary text-[10px]">{log.duration.toFixed(1)}s</span>
        )}
      </button>
    </div>
  )
}
