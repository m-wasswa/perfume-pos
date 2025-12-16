# PWA Installation Guide - Perfume POS

Your app is now a fully functional Progressive Web App (PWA) that can be installed on devices!

## ✅ What's Been Set Up

### 1. **Service Worker** (`public/sw.js`)
- Automatically caches your app content
- Enables offline functionality
- Handles network requests intelligently

### 2. **Web App Manifest** (`public/manifest.json`)
- Defines app name, description, and icons
- Sets display mode to "standalone" (looks like a native app)
- Includes app shortcuts for quick access

### 3. **PWA Configuration** (`next.config.ts`)
- Enhanced caching strategies for assets
- Proper runtime caching for API calls and CDN resources
- Optimized for offline performance

### 4. **Install Prompt Component** (`src/components/pwa-install-prompt.tsx`)
- Auto-shows when the app is ready to install
- Works on Android and iOS
- Shows instructions specific to each platform

## 🧪 Testing Installation

### **Desktop (Chrome/Edge/Opera)**

1. **Start the app:**
   ```bash
   npm run build
   npm start
   ```

2. **Open in browser:** `http://localhost:3000`

3. **Look for install button:** You should see one of these:
   - Install icon in the address bar (top right)
   - "Install Perfume POS" popup in bottom-right corner
   - Menu option: ⋮ → "Install app"

4. **Click install** and the app will be added to your desktop/start menu

### **Android (Chrome Mobile)**

1. Open the app in Chrome on your Android phone
2. Tap the menu (⋮) → "Install app" or look for the install prompt
3. Tap "Install"
4. The app icon will appear on your home screen

### **iOS (Safari)**

⚠️ **Note:** iOS doesn't have a native install prompt like Android. Instead:

1. Open the app in Safari
2. Tap the Share button (↗️ at bottom)
3. Scroll down and tap "Add to Home Screen"
4. Name the app (defaults to "Perfume POS")
5. Tap "Add"

## 🔍 Troubleshooting

### Install Button Not Showing?

1. **Check the browser console:**
   ```javascript
   // Open DevTools (F12) → Console and look for PWA logs
   ```

2. **Verify PWA requirements:**
   - ✅ Manifest is served: `curl http://localhost:3000/manifest.json`
   - ✅ Service Worker is registered: Check Console for success message
   - ✅ Using HTTPS in production (required for installation)
   - ✅ App is not already installed (check display mode)

3. **Common issues:**
   - **HTTPS Required:** PWAs only install on HTTPS (except localhost)
   - **Service Worker Failed:** Check for errors in Console
   - **Manifest Not Found:** Verify `/public/manifest.json` exists
   - **Already Installed:** If app is installed, prompt won't show

### Debug Logs

The app logs PWA status to the browser console. Open DevTools (F12) and look for:
- `ServiceWorker registration successful`
- `beforeinstallprompt event fired`
- Service Worker status and registration count

## 🚀 After Installation

Once installed, the app will:
- **Launch like a native app** - No address bar
- **Work offline** - Uses cached assets and API data
- **Load faster** - Assets loaded from cache
- **Push notifications ready** - Can be added later
- **Appear in app drawer** - On Android/iOS/Windows

## 📦 What Gets Cached

- Static pages and assets
- Google Fonts
- CDN resources (jsdelivr)
- Images and media
- API responses (network-first strategy)

## 🔧 Production Deployment

When deploying to production:

1. **Ensure HTTPS:** PWAs require HTTPS (except localhost)
2. **Valid Manifest:** Must be served with proper headers
3. **Service Worker:** Must register without errors
4. **Icons:** All icon files must exist in `/public`

### Environment Setup:
```bash
# Build for production
npm run build

# Test production build locally
npm start

# Then deploy the `.next` folder and `public` folder to your server
```

## 📝 Configuration Files

### Key Files:
- `next.config.ts` - PWA settings with caching strategies
- `public/manifest.json` - App metadata and icons
- `public/sw.js` - Service Worker logic
- `src/components/pwa-install-prompt.tsx` - Install UI
- `src/app/layout.tsx` - PWA meta tags

### Customization:

**Change app name:**
Edit `public/manifest.json`:
```json
{
  "name": "Your App Name",
  "short_name": "AppName"
}
```

**Change app icon:**
Replace PNG files in `/public`:
- `icon-192.png`
- `icon-192-maskable.png`
- `icon-512.png`
- `icon-512-maskable.png`

**Change theme colors:**
Edit `public/manifest.json` and `src/app/layout.tsx`:
```json
"theme_color": "#your-color",
"background_color": "#your-color"
```

## 📱 Testing Checklist

- [ ] Desktop installation works (Chrome/Edge)
- [ ] App launches in standalone mode
- [ ] Offline mode works
- [ ] Service Worker caches assets
- [ ] Mobile installation works (Android)
- [ ] iOS Add to Home Screen works
- [ ] App icon appears correctly
- [ ] App name displays properly
- [ ] Theme colors apply correctly
- [ ] Network requests work when online

## 💡 Next Steps

1. **Add Push Notifications** (optional)
2. **Custom splash screens** for better loading
3. **App shortcuts** (already configured)
4. **Update icons** with your branding
5. **Monitor performance** with Lighthouse

## 📚 Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Manifest Spec](https://www.w3.org/TR/appmanifest/)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)

---

**Status:** ✅ Ready for installation!

Your PWA is fully configured and ready to use. The install prompt will appear automatically when the app is ready to install.
