// Security shield - production protection
// Disabled keyboard blocking to allow normal typing
export function installSecurityShield() {
  if (import.meta.env.DEV) return

  const BLOCK = `<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#080808;color:#fff;font-family:sans-serif;text-align:center;padding:2rem"><div><div style="font-size:3rem;margin-bottom:1rem">🔒</div><div style="font-size:1.1rem;font-weight:700;margin-bottom:.5rem">Access Restricted</div><div style="color:#7A7A7A;font-size:.85rem">Developer tools are not permitted on this platform.</div></div></div>`

  // Console warning
  const W = '\n%c⛔ STOP!\n%cThis is a protected platform.\n'
  const warn = () => { try { console.clear(); console.log(W, 'color:#E5181B;font-size:1.5rem;font-weight:900', 'color:#ff6b6b;font-size:.9rem') } catch (_) {} }
  warn(); setInterval(warn, 2000)

  // Only block F12 and Ctrl+Shift+I — NOT regular typing keys
  document.addEventListener('keydown', e => {
    if (e.key === 'F12') { e.preventDefault(); return false }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'i') { e.preventDefault(); return false }
  })

  // Right-click disable
  document.addEventListener('contextmenu', e => { e.preventDefault(); return false }, true)

  // DevTools size detection
  let dtOpen = false
  setInterval(() => {
    const open = window.outerWidth - window.innerWidth > 160 || window.outerHeight - window.innerHeight > 160
    if (open && !dtOpen) { dtOpen = true; document.body.innerHTML = BLOCK }
    else if (!open && dtOpen) { dtOpen = false; location.reload() }
  }, 1000)

  // iFrame blocking
  if (window.self !== window.top) window.top.location = window.self.location
}
