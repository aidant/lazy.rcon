export const AbortSignal$timeout = (timeout: number) => {
  const controller = new AbortController()

  setTimeout(controller.abort.bind(controller), timeout)

  return controller.signal
}
