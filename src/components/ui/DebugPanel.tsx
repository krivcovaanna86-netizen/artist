import { useState, useEffect, useCallback, useRef } from 'react'
import { useTheme } from '../../lib/hooks/useTheme'

interface LogEntry {
  id: number
  timestamp: Date
  type: 'log' | 'error' | 'warn' | 'info'
  message: string
  data?: any
}

// Global log storage
const logs: LogEntry[] = []
let logId = 0
let listeners: ((logs: LogEntry[]) => void)[] = []

// Override console methods to capture logs
const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
}

const addLog = (type: LogEntry['type'], ...args: any[]) => {
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2)
      } catch {
        return String(arg)
      }
    }
    return String(arg)
  }).join(' ')

  const entry: LogEntry = {
    id: ++logId,
    timestamp: new Date(),
    type,
    message: message.slice(0, 1000),
  }

  logs.push(entry)
  
  while (logs.length > 200) {
    logs.shift()
  }

  listeners.forEach(listener => listener([...logs]))
}

let interceptorsInstalled = false

export function installLogInterceptors() {
  if (interceptorsInstalled) return
  interceptorsInstalled = true

  console.log = (...args) => {
    addLog('log', ...args)
    originalConsole.log(...args)
  }

  console.error = (...args) => {
    addLog('error', ...args)
    originalConsole.error(...args)
  }

  console.warn = (...args) => {
    addLog('warn', ...args)
    originalConsole.warn(...args)
  }

  console.info = (...args) => {
    addLog('info', ...args)
    originalConsole.info(...args)
  }

  addLog('info', '🔍 Debug panel initialized - tap 🔍 button to open')
}

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [logEntries, setLogEntries] = useState<LogEntry[]>([...logs])
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'api'>('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const { theme, cycleTheme, resolvedTheme } = useTheme()

  useEffect(() => {
    const listener = (newLogs: LogEntry[]) => {
      setLogEntries(newLogs)
    }
    listeners.push(listener)

    return () => {
      listeners = listeners.filter(l => l !== listener)
    }
  }, [])

  useEffect(() => {
    if (autoScroll && logsEndRef.current && !isMinimized && isOpen) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logEntries, autoScroll, isMinimized, isOpen])

  const clearLogs = useCallback(() => {
    logs.length = 0
    setLogEntries([])
  }, [])

  const copyLogs = useCallback(() => {
    const text = logEntries.map(l => 
      `[${l.timestamp.toLocaleTimeString()}] [${l.type.toUpperCase()}] ${l.message}`
    ).join('\n')
    
    navigator.clipboard?.writeText(text)
      .then(() => addLog('info', '📋 Logs copied to clipboard'))
      .catch(() => addLog('error', 'Failed to copy logs'))
  }, [logEntries])

  const filteredLogs = logEntries.filter(log => {
    if (filter === 'all') return true
    if (filter === 'error') return log.type === 'error'
    if (filter === 'warn') return log.type === 'warn' || log.type === 'error'
    if (filter === 'api') return log.message.includes('[API]') || log.message.includes('[Admin API]') || log.message.includes('[Upload]')
    return true
  })

  const errorCount = logEntries.filter(l => l.type === 'error').length
  const warnCount = logEntries.filter(l => l.type === 'warn').length

  const getTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return 'text-red-400'
      case 'warn': return 'text-yellow-400'
      case 'info': return 'text-blue-400'
      default: return 'text-gray-300'
    }
  }

  const getTypeIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return '❌'
      case 'warn': return '⚠️'
      case 'info': return 'ℹ️'
      default: return '📝'
    }
  }

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return '☀️'
      case 'dark': return '🌙'
      default: return '🌓'
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-50 w-14 h-14 bg-gray-800/90 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-700 transition-all active:scale-95"
        title="Открыть отладку"
      >
        <span className="text-xl">🔍</span>
        {errorCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
            {errorCount > 99 ? '99+' : errorCount}
          </span>
        )}
        {errorCount === 0 && warnCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-yellow-500 rounded-full text-xs flex items-center justify-center font-bold text-black">
            {warnCount > 99 ? '99+' : warnCount}
          </span>
        )}
      </button>
    )
  }

  return (
    <div 
      className={`fixed z-50 bg-gray-900 text-white shadow-2xl transition-all duration-200 ${
        isMinimized 
          ? 'bottom-24 right-4 w-80 h-12 rounded-xl' 
          : 'bottom-4 left-2 right-2 h-[50vh] min-h-[300px] max-h-[500px] rounded-xl lg:left-auto lg:right-4 lg:w-[600px]'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-gray-800 rounded-t-xl">
        <div className="flex items-center gap-2">
          <span>🔍</span>
          <span className="text-sm font-medium">Debug Console</span>
          <span className="text-xs text-gray-400">({filteredLogs.length})</span>
          {errorCount > 0 && (
            <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
              {errorCount} errors
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isMinimized && (
            <>
              <button
                onClick={cycleTheme}
                className="p-1.5 hover:bg-gray-700 rounded text-sm"
                title={`Тема: ${theme} (${resolvedTheme})`}
              >
                {getThemeIcon()}
              </button>
              
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1"
              >
                <option value="all">All ({logEntries.length})</option>
                <option value="error">Errors ({errorCount})</option>
                <option value="warn">Warnings ({warnCount})</option>
                <option value="api">API</option>
              </select>

              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`text-xs px-2 py-1 rounded ${
                  autoScroll ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
                }`}
                title="Auto-scroll"
              >
                ⬇️
              </button>

              <button
                onClick={copyLogs}
                className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded"
                title="Copy logs"
              >
                📋
              </button>

              <button
                onClick={clearLogs}
                className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded"
                title="Clear logs"
              >
                🗑️
              </button>
            </>
          )}
          
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-gray-700 rounded"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? '⬆️' : '⬇️'}
          </button>
          
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-gray-700 rounded"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-800/50 text-xs text-gray-400 border-b border-gray-700/50">
          <span>🌐 {window.location.hostname}</span>
          <span>📱 {(window as any).Telegram?.WebApp ? 'Telegram' : 'Browser'}</span>
          <span>{getThemeIcon()} {resolvedTheme}</span>
          <span>🔐 {
            (window as any).Telegram?.WebApp?.initData ? 'TG App' :
            localStorage.getItem('telegram_auth') ? 'TG Login' :
            localStorage.getItem('devMode') === 'true' ? 'Dev Mode' :
            'No Auth'
          }</span>
        </div>
      )}

      {!isMinimized && (
        <div className="h-[calc(100%-80px)] overflow-y-auto p-2 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              <p className="text-2xl mb-2">📭</p>
              <p>No logs yet</p>
              <p className="text-xs mt-2">Perform some actions to see logs here</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredLogs.map(log => (
                <div 
                  key={log.id} 
                  className={`py-1.5 px-2 rounded ${
                    log.type === 'error' ? 'bg-red-900/30 border-l-2 border-red-500' : 
                    log.type === 'warn' ? 'bg-yellow-900/30 border-l-2 border-yellow-500' : 
                    log.message.includes('[API]') || log.message.includes('[Admin API]') ? 'bg-blue-900/20 border-l-2 border-blue-500' :
                    'bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0">{getTypeIcon(log.type)}</span>
                    <span className="text-gray-500 flex-shrink-0 font-medium">
                      {log.timestamp.toLocaleTimeString('ru-RU', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit'
                      })}
                    </span>
                    <span className={`${getTypeColor(log.type)} break-all whitespace-pre-wrap leading-relaxed`}>
                      {log.message}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
