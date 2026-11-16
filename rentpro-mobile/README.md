# RentPro Mobile

Standalone Expo Android application for the RentPro backend. The existing web app remains in `mobile/`; this directory is an independent native client.

## Requirements

- Node.js 20 LTS and npm
- Android device or emulator
- Expo account and EAS CLI login for cloud builds
- Public HTTPS URL for the RentPro API for a physical device or production build

## Install and run

```powershell
cd rentpro-mobile
npm install
Copy-Item .env.example .env
```

Set `EXPO_PUBLIC_API_URL` in the local environment to the API's base URL. For a physical device on the local network, use the computer's LAN IP and ensure both devices are on the same Wi-Fi network. Do not use `localhost` on a physical Android device.

```powershell
$env:EXPO_PUBLIC_API_URL = "http://192.168.1.20:4000"
npx expo start
```

## Owner authentication

Authentication is enabled on the backend with `AUTH_ENABLED=true`. Set these backend environment variables:

- `OWNER_EMAIL`: owner's sign-in email.
- `OWNER_PASSWORD_HASH`: bcrypt hash of a strong owner password (cost factor 12 or higher).
- `JWT_SECRET`: random secret with at least 32 characters.

Generate a password hash without storing the password in the repository:

```powershell
cd backend
node -e "const readline=require('readline/promises');const bcrypt=require('bcryptjs');(async()=>{const r=readline.createInterface({input:process.stdin,output:process.stdout});const p=await r.question('Owner password: ');r.close();console.log(await bcrypt.hash(p,12))})()"
```

Generate a JWT secret:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Configure these values only in the backend host's secret environment settings. The login token is stored using Expo SecureStore on Android. When authentication is not enabled, the API retains its existing local development behavior.

## EAS APK

Set the API URL in the EAS `preview` environment, then build:

```powershell
cd rentpro-mobile
npx eas-cli login
npx eas-cli init
npx eas-cli env:set --environment preview --name EXPO_PUBLIC_API_URL --value "https://your-rentpro-api.example.com"
npm run build:android:preview
```

The EAS build page provides the APK download. Install it on an Android device and sign in with the configured owner credentials. For Google Play, use `npm run build:android:production` to create an Android App Bundle.

## API capabilities and limitations

The app uses the existing RentPro API for flats, readings, billing, payments, settings, PDF invoices, and CSV reports. The backend records a payment history for new payments; historic bills created before this change retain their totals but do not have fabricated transaction-level history. The current backend JSON store is for development only unless the deployment host provides persistent storage. Configure durable storage before using it as the sole production record.
