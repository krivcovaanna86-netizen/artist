export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-tg-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-tg-button border-t-transparent rounded-full animate-spin" />
        <p className="text-tg-hint">Загрузка...</p>
      </div>
    </div>
  )
}
