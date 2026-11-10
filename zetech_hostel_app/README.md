# Zetech Hostel App

## Production API and images

The app's bundled photos live in `assets/images/` and are declared in
`pubspec.yaml`, so they are packaged into the app and do not need an internet
connection. Debug and release builds use the same hosted HTTPS API as the website by
default. To override it:

```powershell
flutter build apk --release --dart-define=API_BASE_URL=https://your-api-host/api
```

For local development, pass the development server URL. Android emulators can
use `http://10.0.2.2:5000/api`; physical phones must use the computer's LAN URL,
for example `--dart-define=API_BASE_URL=http://<computer-ip>:5000/api`. Photos
served by the backend must use its HTTPS `/assets/...` URL rather than a local
file path.
