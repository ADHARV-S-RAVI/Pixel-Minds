const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const twaDir = path.resolve(__dirname, '..', 'android-twa');
const keystore = path.join(twaDir, 'android.keystore');
const alias = 'pixelminds';
const pass = 'pixelminds123';
const buildTools = 'C:\\Users\\adhar\\AppData\\Local\\Android\\Sdk\\build-tools\\35.0.0';
const zipalign = path.join(buildTools, 'zipalign.exe');
const apksignerBat = path.join(buildTools, 'apksigner.bat');
const jarsigner = 'C:\\Program Files\\Java\\jdk-17\\bin\\jarsigner.exe';

const unsignedApk = path.join(twaDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release-unsigned.apk');
const alignedApk = path.join(twaDir, 'app-release-unsigned-aligned.apk');
const signedApk = path.join(twaDir, 'app-release-signed.apk');

console.log('[1/4] Zipaligning APK...');
if (fs.existsSync(alignedApk)) fs.unlinkSync(alignedApk);
execSync(`"${zipalign}" -v -p 4 "${unsignedApk}" "${alignedApk}"`, { stdio: 'inherit' });

console.log('[2/4] Signing APK with apksigner (v1, v2, v3, v4)...');
if (fs.existsSync(signedApk)) fs.unlinkSync(signedApk);
execSync(`"${apksignerBat}" sign --ks "${keystore}" --ks-key-alias "${alias}" --ks-pass "pass:${pass}" --key-pass "pass:${pass}" --out "${signedApk}" "${alignedApk}"`, { stdio: 'inherit' });

console.log('[3/4] Signing App Bundle (.aab) with jarsigner...');
const unsignedAab = path.join(twaDir, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
const signedAab = path.join(twaDir, 'app-release-bundle.aab');
fs.copyFileSync(unsignedAab, signedAab);
execSync(`"${jarsigner}" -keystore "${keystore}" -storepass "${pass}" -keypass "${pass}" "${signedAab}" "${alias}"`, { stdio: 'inherit' });

console.log('[4/4] Verifying APK signature...');
const verifyOutput = execSync(`"${apksignerBat}" verify --verbose "${signedApk}"`).toString();
console.log(verifyOutput.trim());

const apkStat = fs.statSync(signedApk);
const aabStat = fs.statSync(signedAab);

console.log('\n==============================================');
console.log('         BUILD & SIGNING SUCCESSFUL           ');
console.log('==============================================');
console.log(`Signed APK:        ${signedApk} (${(apkStat.size / 1024 / 1024).toFixed(2)} MB)`);
console.log(`Signed App Bundle: ${signedAab} (${(aabStat.size / 1024 / 1024).toFixed(2)} MB)`);
console.log('==============================================\n');

