# VS Code / Cursor Launch Configurations

This folder contains launch configurations for running the InvoiceMe app in debug and release modes.

## 🚀 Available Configurations

### Frontend (Flutter Web)

1. **Flutter: Debug (Chrome)** - Default debug mode
   - Runs in Chrome browser
   - Hot reload enabled
   - API URL: `http://localhost:3000`
   - Best for development

2. **Flutter: Debug (Edge)** - Debug in Edge browser
   - Alternative browser for testing
   - Hot reload enabled
   - API URL: `http://localhost:3000`

3. **Flutter: Profile Mode** - Performance profiling
   - Optimized build with debug info
   - Use DevTools for performance analysis
   - API URL: `http://localhost:3000`

4. **Flutter: Release Mode (Local Backend)** - Production build testing
   - Fully optimized production build
   - No hot reload
   - API URL: `http://localhost:3000`
   - Test production build locally

5. **Flutter: Release Mode (Production Backend)** - Full production testing
   - Production build
   - API URL: `https://invoiceme-backend-77zj.onrender.com`
   - Test against live backend

### Backend (NestJS)

6. **Backend: Debug** - Development server
   - Runs `npm run start:dev`
   - Hot reload on file changes
   - Loads environment from `.env`

7. **Backend: Production Mode** - Production server locally
   - Runs `npm run start:prod`
   - Tests production build
   - Loads environment from `.env`

### Compound Configurations

8. **Full Stack: Debug** - Run everything in debug mode
   - Starts backend in debug mode
   - Starts frontend in debug mode
   - Both run simultaneously

9. **Full Stack: Release** - Test production locally
   - Starts backend in production mode
   - Starts frontend in release mode
   - Simulates production environment

---

## 📋 How to Use

### Option 1: Run & Debug Panel (Sidebar)

1. Click the **Run and Debug** icon in the sidebar (▶️ with bug)
2. Select a configuration from the dropdown
3. Click the green play button (▶️)
4. Or press **F5** to start debugging

### Option 2: Keyboard Shortcuts

- **F5** - Start debugging with selected configuration
- **Ctrl+F5** (or **Cmd+F5** on Mac) - Run without debugging
- **Shift+F5** - Stop debugging
- **Ctrl+Shift+F5** - Restart debugging

### Option 3: Command Palette

1. Press **Cmd+Shift+P** (Mac) or **Ctrl+Shift+P** (Windows/Linux)
2. Type: "Debug: Select and Start Debugging"
3. Choose configuration

---

## 🔧 Quick Start Guides

### Start Full Stack Development

**Method 1: Use Compound Configuration**
1. Select "Full Stack: Debug" from dropdown
2. Press F5
3. Both backend and frontend start together

**Method 2: Start Separately**
1. First: Select "Backend: Debug" and press F5
2. Wait for backend to start (~5 seconds)
3. Then: Select "Flutter: Debug (Chrome)" and press F5

### Test Production Build Locally

1. First: Build backend: `cd backend && npm run build`
2. Select "Full Stack: Release"
3. Press F5
4. Test production build against local backend

### Test Against Production Backend

1. Select "Flutter: Release Mode (Production Backend)"
2. Press F5
3. Frontend connects to live Render backend

---

## 🛠️ Configuration Details

### Environment Variables

**Frontend:**
- `API_URL` is passed via `--dart-define`
- Can be changed in launch.json

**Backend:**
- Loaded from `backend/.env` file
- Uses `envFile` parameter in launch.json

### Web Renderer

All Flutter web configs use `--web-renderer html`:
- Better compatibility
- Faster initial load
- Good for text-heavy apps

Can be changed to `canvaskit` for:
- Better graphics performance
- Pixel-perfect rendering
- Larger initial download

### Browser Selection

Change browser in `args`:
```json
"-d", "chrome"  // Chrome
"-d", "edge"    // Edge
"-d", "firefox" // Firefox
```

---

## 🐛 Debugging Tips

### Frontend Debugging

**Set Breakpoints:**
1. Click left of line numbers in `.dart` files
2. Red dot appears
3. Run "Flutter: Debug (Chrome)"
4. App pauses at breakpoint

**Hot Reload:**
- Save file or press **Ctrl+S** (Windows) / **Cmd+S** (Mac)
- Changes apply without restart
- Only works in debug mode

**Hot Restart:**
- Press **Ctrl+Shift+F5** (Windows) / **Cmd+Shift+F5** (Mac)
- Full restart while keeping debug session
- Resets app state

**Flutter DevTools:**
- Open automatically when debugging
- Inspector: Widget tree visualization
- Performance: Frame analysis
- Network: API calls monitoring

### Backend Debugging

**Set Breakpoints:**
1. Click left of line numbers in `.ts` files
2. Run "Backend: Debug"
3. App pauses at breakpoint

**Watch Variables:**
- Hover over variables to see values
- Add to Watch panel for continuous monitoring

**Debug Console:**
- View console.log output
- Execute code in running app context

---

## 📝 Customizing Configurations

### Change API URL

Edit `.vscode/launch.json`:

```json
{
  "name": "Flutter: Debug (Chrome)",
  "env": {
    "API_URL": "http://your-custom-url:port"
  }
}
```

Or use `--dart-define`:
```json
{
  "args": [
    "--dart-define=API_URL=http://your-url"
  ]
}
```

### Change Port

Backend runs on port from `.env` file:
```env
PORT=3000
```

### Add New Configuration

Copy existing configuration and modify:
```json
{
  "name": "Flutter: My Custom Config",
  "type": "dart",
  "request": "launch",
  "program": "frontend/lib/main.dart",
  "cwd": "frontend",
  "args": ["--web-renderer", "html", "-d", "chrome"],
  "env": {
    "API_URL": "http://localhost:3000"
  }
}
```

---

## ⚠️ Common Issues

### "Cannot find program frontend/lib/main.dart"

**Solution:** Open the root folder (`invoiceMe`) in VS Code, not a subfolder

### Backend won't start

**Check:**
1. `.env` file exists in `backend/` folder
2. Database connection string is correct
3. Port 3000 is not in use: `lsof -i :3000`

### Frontend can't connect to backend

**Check:**
1. Backend is running (green dot in Debug panel)
2. API_URL matches backend URL
3. CORS is configured in backend `.env`

### Hot reload not working

**Causes:**
- Running in release mode (hot reload disabled)
- Const constructors (rebuild required)
- State management changes

**Solution:** Use hot restart (Ctrl+Shift+F5)

---

## 📚 Additional Resources

- **Flutter Debugging:** https://docs.flutter.dev/testing/debugging
- **NestJS Debugging:** https://docs.nestjs.com/
- **VS Code Debugging:** https://code.visualstudio.com/docs/editor/debugging
- **Dart DevTools:** https://dart.dev/tools/dart-devtools

---

## 🎯 Recommended Workflow

**Daily Development:**
1. Start "Full Stack: Debug"
2. Make changes to code
3. Save files (hot reload applies changes)
4. Test in browser

**Before Committing:**
1. Run "Full Stack: Release"
2. Test production build locally
3. Verify no debug-only code

**Before Deploying:**
1. Run "Flutter: Release Mode (Production Backend)"
2. Test against live backend
3. Verify everything works

---

**Happy Coding!** 🚀
