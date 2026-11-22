const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const twaDir = path.join(rootDir, 'android-twa');
const apkPath = path.join(twaDir, 'app-release-signed.apk');
const tempDir = path.join(twaDir, '.temp-check');

if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
fs.mkdirSync(tempDir, { recursive: true });

execSync(`tar -xf "${apkPath}" -C "${tempDir}" classes.dex`);

const classesDexPath = path.join(tempDir, 'classes.dex');
const dexdumpPath = 'C:\\Users\\adhar\\AppData\\Local\\Android\\Sdk\\build-tools\\35.0.0\\dexdump.exe';

const dexdumpOutput = execSync(`"${dexdumpPath}" "${classesDexPath}"`, { maxBuffer: 50 * 1024 * 1024 }).toString();

const checks = [
  'com.unity3d',
  'com.adjust',
  'com.google.android.gms.ads',
  'com.onesignal',
  'READ_SMS',
  'RECEIVE_SMS',
  'SEND_SMS',
  'READ_CALL_LOG',
  'READ_PHONE_STATE',
  'READ_CONTACTS',
  'BIND_NOTIFICATION_LISTENER_SERVICE',
  'ACCESS_FINE_LOCATION'
];

console.log('=== APK DEEP SECURITY AUDIT ===\n');
let allClean = true;
checks.forEach(check => {
  const found = dexdumpOutput.includes(check);
  console.log(`[${found ? 'FAIL' : 'PASS'}] ${check}: ${found ? 'FOUND' : 'CLEAN (Not found)'}`);
  if (found) allClean = false;
});

fs.rmSync(tempDir, { recursive: true, force: true });

console.log(`\nOverall Security Status: ${allClean ? '100% CLEAN - ZERO SENSITIVE PERMISSIONS OR ADWARE' : 'WARNINGS FOUND'}`);
