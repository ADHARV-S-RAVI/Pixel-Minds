const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

async function main() {
  console.log('==============================================');
  console.log('   Pixel Minds Clean TWA Builder');
  console.log('==============================================\n');

  const rootDir = path.resolve(__dirname, '..');
  const twaDir = path.join(rootDir, 'android-twa');
  const keystorePath = path.join(twaDir, 'android.keystore');
  const keyAlias = 'pixelminds';
  const keyPass = 'pixelminds123';
  const jdkBin = 'C:\\Program Files\\Java\\jdk-17\\bin';
  const keytool = path.join(jdkBin, 'keytool.exe');
  const jarsigner = path.join(jdkBin, 'jarsigner.exe');
  const sdkDir = 'C:\\Users\\adhar\\AppData\\Local\\Android\\Sdk';
  const buildToolsDir = path.join(sdkDir, 'build-tools', '34.0.0');
  const zipalign = path.join(buildToolsDir, 'zipalign.exe');
  const apksignerBat = path.join(buildToolsDir, 'apksigner.bat');

  if (!fs.existsSync(twaDir)) {
    fs.mkdirSync(twaDir, { recursive: true });
  }

  // 1. Generate Keystore if not exists
  if (!fs.existsSync(keystorePath)) {
    console.log('[1/7] Generating release keystore...');
    const genKeyCmd = `"${keytool}" -genkeypair -v -keystore "${keystorePath}" -alias "${keyAlias}" -keyalg RSA -keysize 2048 -validity 10000 -storepass "${keyPass}" -keypass "${keyPass}" -dname "CN=Pixel Minds, OU=Pixel Minds, O=Pixel Minds, C=US"`;
    execSync(genKeyCmd, { stdio: 'inherit' });
    console.log('Release keystore created successfully.');
  } else {
    console.log('[1/7] Release keystore already exists.');
  }

  // 2. Extract SHA-256 fingerprint
  console.log('[2/7] Extracting SHA-256 certificate fingerprint...');
  const certOutput = execSync(`"${keytool}" -list -v -keystore "${keystorePath}" -alias "${keyAlias}" -storepass "${keyPass}"`).toString();
  const shaMatch = certOutput.match(/SHA256:\s*([A-F0-9:]+)/i);
  let sha256Fingerprint = '';
  if (shaMatch) {
    sha256Fingerprint = shaMatch[1].trim();
    console.log(`SHA-256 Fingerprint: ${sha256Fingerprint}`);

    // Update assetlinks.json
    const assetlinksPath = path.join(rootDir, 'public', '.well-known', 'assetlinks.json');
    const assetlinks = [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "tech.pixelminds.pixelminds",
          sha256_cert_fingerprints: [sha256Fingerprint]
        }
      }
    ];
    fs.writeFileSync(assetlinksPath, JSON.stringify(assetlinks, null, 2));
    console.log(`Updated ${assetlinksPath} with certificate fingerprint.`);
  }

  // 3. Start local HTTP server to serve static assets locally for TwaGenerator
  console.log('[3/7] Starting local static server for TWA generator...');
  const server = http.createServer((req, res) => {
    const cleanUrl = req.url.split('?')[0].replace(/^\//, '');
    const filePath = path.join(rootDir, 'public', cleanUrl);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const data = fs.readFileSync(filePath);
      const ext = path.extname(filePath);
      const contentType = ext === '.json' ? 'application/json' : ext === '.png' ? 'image/png' : 'text/plain';
      res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': data.length });
      res.end(data);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  await new Promise(resolve => server.listen(8989, '127.0.0.1', resolve));
  console.log('Local static server listening on http://127.0.0.1:8989');

  try {
    // 4. Require Bubblewrap core and generate TWA project
    console.log('[4/7] Generating clean Android TWA project...');
    const core = require('C:/Users/adhar/AppData/Local/npm-cache/_npx/881cef4662d2c421/node_modules/@bubblewrap/core');
    const { TwaManifest, TwaGenerator, ConsoleLog } = core;

    const manifestData = {
      packageId: 'tech.pixelminds.pixelminds',
      host: 'www.pixel-minds.tech',
      name: 'Pixel Minds',
      launcherName: 'Pixel Minds',
      themeColor: '#07101f',
      navigationColor: '#07101f',
      backgroundColor: '#07101f',
      enableNotifications: false,
      startUrl: '/',
      iconUrl: 'http://127.0.0.1:8989/icons/icon-512x512.png',
      maskableIconUrl: 'http://127.0.0.1:8989/icons/icon-512x512.png',
      appVersionName: '1.0.0',
      appVersionCode: 1,
      signingKey: {
        path: keystorePath,
        alias: keyAlias
      },
      splashScreenFadeOutDuration: 300,
      enableSiteSettingsShortcut: false,
      shortcuts: [],
      generatorApp: 'bubblewrap',
      webManifestUrl: 'http://127.0.0.1:8989/manifest.json',
      fallbackType: 'customtabs',
      features: {
        locationDelegation: { enabled: false },
        playBilling: { enabled: false }
      },
      alphaDependencies: { enabled: false },
      additionalTrustedOrigins: [
        'https://pixelmindss.vercel.app',
        'https://pixel-minds.tech'
      ]
    };

    const twaManifest = new TwaManifest(manifestData);
    const twaGenerator = new TwaGenerator();
    const log = new ConsoleLog('TwaGenerator');

    try {
      await twaGenerator.removeTwaProject(twaDir);
    } catch (e) {
      // ignore
    }

    await twaGenerator.createTwaProject(twaDir, twaManifest, log);

    // Save twa-manifest.json with production iconUrl
    manifestData.iconUrl = 'https://www.pixel-minds.tech/icons/icon-512x512.png';
    manifestData.maskableIconUrl = 'https://www.pixel-minds.tech/icons/icon-512x512.png';
    manifestData.webManifestUrl = 'https://www.pixel-minds.tech/manifest.json';
    manifestData.signingKey.path = './android.keystore';
    fs.writeFileSync(path.join(twaDir, 'twa-manifest.json'), JSON.stringify(manifestData, null, 2));

    console.log('TWA project generated successfully in android-twa/');
  } finally {
    server.close();
  }

  // Set compileSdkVersion and targetSdkVersion to 34
  const buildGradlePath = path.join(twaDir, 'app', 'build.gradle');
  if (fs.existsSync(buildGradlePath)) {
    let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
    buildGradle = buildGradle.replace(/compileSdkVersion\s+\d+/g, 'compileSdkVersion 34');
    buildGradle = buildGradle.replace(/targetSdkVersion\s+\d+/g, 'targetSdkVersion 34');
    fs.writeFileSync(buildGradlePath, buildGradle);
    console.log('Configured app/build.gradle with compileSdkVersion 34 and targetSdkVersion 34.');
  }

  // 5. Inspect and verify AndroidManifest.xml
  console.log('[5/7] Verifying AndroidManifest.xml permissions...');
  const manifestXmlPath = path.join(twaDir, 'app', 'src', 'main', 'AndroidManifest.xml');
  const manifestXml = fs.readFileSync(manifestXmlPath, 'utf8');

  const dangerousPermissions = [
    'READ_SMS', 'RECEIVE_SMS', 'SEND_SMS',
    'READ_CALL_LOG', 'READ_PHONE_STATE',
    'READ_CONTACTS', 'WRITE_CONTACTS',
    'BIND_NOTIFICATION_LISTENER_SERVICE',
    'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION',
    'CAMERA', 'RECORD_AUDIO'
  ];

  let flagged = false;
  for (const perm of dangerousPermissions) {
    if (manifestXml.includes(perm)) {
      console.error(`WARNING: Found unexpected permission ${perm} in AndroidManifest.xml!`);
      flagged = true;
    }
  }

  if (!flagged) {
    console.log('PASSED: Zero dangerous or sensitive permissions in AndroidManifest.xml.');
  }

  // 6. Build release APK and App Bundle
  console.log('[6/7] Building APK and App Bundle using Gradle...');
  const env = {
    ...process.env,
    ANDROID_HOME: sdkDir,
    JAVA_HOME: 'C:\\Program Files\\Java\\jdk-17'
  };

  const gradlewCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  console.log(`Running ${gradlewCmd} assembleRelease bundleRelease...`);
  execSync(`${gradlewCmd} assembleRelease bundleRelease`, {
    cwd: twaDir,
    stdio: 'inherit',
    env
  });

  // 7. Align and Sign
  console.log('[7/7] Zipaligning and signing release artifacts...');
  const unsignedApk = path.join(twaDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release-unsigned.apk');
  const alignedApk = path.join(twaDir, 'app-release-unsigned-aligned.apk');
  const signedApk = path.join(twaDir, 'app-release-signed.apk');

  if (fs.existsSync(unsignedApk)) {
    if (fs.existsSync(alignedApk)) fs.unlinkSync(alignedApk);
    execSync(`"${zipalign}" -v -p 4 "${unsignedApk}" "${alignedApk}"`, { stdio: 'pipe' });

    if (fs.existsSync(signedApk)) fs.unlinkSync(signedApk);
    execSync(`"${apksignerBat}" sign --ks "${keystorePath}" --ks-key-alias "${keyAlias}" --ks-pass "pass:${keyPass}" --key-pass "pass:${keyPass}" --out "${signedApk}" "${alignedApk}"`, { stdio: 'inherit' });

    // Verify signature
    const verifyOutput = execSync(`"${apksignerBat}" verify --verbose "${signedApk}"`).toString();
    console.log(`APK Verification Output:\n${verifyOutput.trim()}`);
  }

  const unsignedAab = path.join(twaDir, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
  const signedAab = path.join(twaDir, 'app-release-bundle.aab');
  if (fs.existsSync(unsignedAab)) {
    fs.copyFileSync(unsignedAab, signedAab);
    execSync(`"${jarsigner}" -keystore "${keystorePath}" -storepass "${keyPass}" -keypass "${keyPass}" "${signedAab}" "${keyAlias}"`, { stdio: 'inherit' });
    console.log('App Bundle signed successfully.');
  }

  const apkStats = fs.statSync(signedApk);
  const aabStats = fs.statSync(signedAab);

  console.log('\n==============================================');
  console.log('         BUILD SUCCEEDED SUCCESSFULLY         ');
  console.log('==============================================');
  console.log(`Signed APK:        ${signedApk} (${(apkStats.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`Signed App Bundle: ${signedAab} (${(aabStats.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`SHA-256 Cert:      ${sha256Fingerprint}`);
  console.log(`Keystore:          ${keystorePath}`);
  console.log(`Alias:             ${keyAlias}`);
  console.log(`Password:          ${keyPass}`);
  console.log('==============================================\n');
}

main().catch(err => {
  console.error('Error during TWA build:', err);
  process.exit(1);
});
