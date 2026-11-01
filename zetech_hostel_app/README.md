# Zetech Hostel App

## Production API and images

The app's bundled photos live in `assets/images/` and are declared in
`pubspec.yaml`, so they are packaged into the app and do not need an internet
connection. Build production releases with the deployed HTTPS API address:

```powershell
flutter build apk --release --dart-define=API_BASE_URL=https://your-api-host/api
```

Without `API_BASE_URL`, a production build reports a configuration error; the
local Android emulator URL is only for development. Photos served by the
backend must use its HTTPS `/assets/...` URL rather than a local file path.
