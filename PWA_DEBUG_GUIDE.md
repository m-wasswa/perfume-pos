# PWA Install Prompt Not Showing? Debug Guide

If you don't see the install popup, follow this debugging checklist:

## 1️⃣ Check Browser Console

Open DevTools: `F12` or `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (Mac)

Go to **Console** tab and look for these logs:

```javascript
// Should see these messages:
"PWA Install Check:"
"Manifest: /manifest.json"
"Service Worker Ready: true"
"Display Mode: browser"
"ServiceWorker registration successful: ServiceWorkerRegistration {...}"
```

❌ **If you see errors:** Note them and check below.

## 2️⃣ Verify Manifest is Accessible

In Console, run:
```javascript
fetch('/manifest.json').then(r => r.json()).then(console.log)
```

You should see the manifest JSON object with:
- `name`
- `start_url`
- `display: "standalone"`
- `icons` array

## 3️⃣ Check Service Worker Registration

In Console, run:
```javascript
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
  registrations.forEach(reg => {
    console.log('Scope:', reg.scope);
    console.log('Active:', reg.active);
  });
});
```

Should show 1 or more service workers registered at `/sw.js`.

## 4️⃣ Check PWA Requirements

In Console, run:
```javascript
// Check if PWA requirements are met
console.log('Requirements check:');
console.log('1. Manifest exists:', !!document.querySelector('link[rel="manifest"]'));
console.log('2. HTTPS/localhost:', window.location.protocol === 'https:' || window.location.hostname === 'localhost');
console.log('3. Service Workers supported:', 'serviceWorker' in navigator);
console.log('4. Not already installed:', !window.matchMedia('(display-mode: standalone)').matches);
console.log('5. beforeinstallprompt support:', 'onbeforeinstallprompt' in window);
```

All should be `true` except the last one initially.

## 5️⃣ Listen for Install Event

Paste this in Console to catch the install event:

```javascript
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('🎉 beforeinstallprompt fired!');
  console.log(e);
  // The app should show the install button now
});
```

If this logs the event, the browser is ready to install but something prevented it.

## 6️⃣ Check DevTools PWA Panel

1. Open DevTools (`F12`)
2. Go to **Application** tab (Chrome/Edge/Opera) or **Storage** (Firefox)
3. Look for:
   - **Manifest:** Should show valid manifest data
   - **Service Workers:** Should show registered with green "Active" status
   - **Storage:** Should show cache entries for your app

## 7️⃣ Common Issues & Fixes

### ❌ "Manifest not found"
- Check: `/public/manifest.json` exists
- Verify app is running on correct port (3000)
- Try hard refresh: `Ctrl+Shift+R` (Windows/Linux) / `Cmd+Shift+R` (Mac)

### ❌ "Service Worker failed to register"
- Check browser console for errors
- Verify `/public/sw.js` is not corrupted
- Try: `navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => reg.unregister()))`
- Then hard refresh page

### ❌ "beforeinstallprompt event never fires"
- **Cause:** Browser doesn't meet PWA criteria
- **Fix:** Ensure all PWA requirements are met (see step 4)
- **Note:** Some browsers don't support this event (use fallback)

### ❌ "App already shows as installed"
- Check: `window.matchMedia('(display-mode: standalone)').matches`
- If true, you're running the installed app (expected behavior)

### ❌ "Prompt shows but install button doesn't work"
- Check browser console for JavaScript errors
- Verify `deferredPrompt` is not null
- Try refreshing and trying again

## 8️⃣ Force Test Installation Flow

Paste this in Console to simulate the full flow:

```javascript
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('Install event captured');
  deferredPrompt = e;
  
  // Simulate clicking install button
  setTimeout(() => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        console.log('User choice:', choiceResult.outcome);
        deferredPrompt = null;
      });
    }
  }, 1000);
});
```

## 9️⃣ Check if PWA Actually Works

Once installed (or in standalone mode), test these:

```javascript
// Check if running as standalone app
console.log('Is standalone:', window.matchMedia('(display-mode: standalone)').matches);

// Check if offline
console.log('Online:', navigator.onLine);

// Check service worker
navigator.serviceWorker.controller && console.log('Service Worker active');
```

## 🔟 Network Requirements

PWA requires HTTPS in production (localhost is OK for testing)

Check current protocol:
```javascript
console.log('Protocol:', window.location.protocol);
// Should be https: in production
// Can be http: for localhost testing
```

## 📋 Summary Checklist

Use this to verify everything:

- [ ] Manifest file loads: `curl http://localhost:3000/manifest.json`
- [ ] Service Worker registered: Check in DevTools
- [ ] No console errors: Clear console and reload
- [ ] HTTPS or localhost: `location.protocol`
- [ ] Desktop/Mobile: Some browsers don't support PWA install
- [ ] Not already installed: Check `display-mode` in Console
- [ ] Supported browser: Chrome, Edge, Opera (best support)

## 🆘 Still Not Working?

Try these nuclear options:

1. **Clear everything:**
   - Close all browser tabs
   - Clear all browsing data (including cache and cookies)
   - Close and reopen browser
   - Go to app URL again

2. **Reset service workers:**
   ```javascript
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(reg => reg.unregister());
   });
   ```
   Then hard refresh (`Ctrl+Shift+R`)

3. **Rebuild app:**
   ```bash
   npm run build
   npm start
   ```

4. **Try different browser:** Some browsers have different PWA support

5. **Check browser version:** Ensure you're using latest version

---

If everything checks out but still not working, the browser might not support PWA installation on your system.

**Alternative:** You can still access the app as a web app - it will work offline and have all PWA features even without installation!
