See @AGENTS.md

## Android APK releases (atj013/sparkyfitness)

Every time an Android APK is built for the maintainer's phone, publish it as a GitHub release on `atj013/sparkyfitness`. This is standing approval for that flow: commit the work being shipped, push its branch, tag, and release. Commit messages still follow the AGENTS.md rules (no AI attribution). Ask first only when the work in the tree is not what the APK contains.

**Build (Windows, from `SparkyFitnessMobile/android`)**

- Needs JDK 17 (`JAVA_HOME`), `ANDROID_HOME`, Windows long paths on, and `cmake.dir` pointing at the SDK's CMake 3.31.6 in `android/local.properties` (`npx expo prebuild --clean` deletes that file: add the line back). The 3.22 CMake that ships by default cannot build `react-native-worklets` under the long pnpm paths.
- `SparkyFitnessMobile/.env` (git-ignored) sets `DEV_APP_NAME=SparkyFitness`, the name under the icon. The app id stays the dev one (`org.SparkyApps.SparkyFitnessMobile1.dev`), so each APK updates the installed app in place.
- With `NODE_ENV=production`: `.\gradlew.bat app:assembleRelease -PreactNativeArchitectures=arm64-v8a`. Output: `app/build/outputs/apk/release/app-release.apk` (signed with the debug key, fine for sideloading).
- If `:app:createBundleReleaseJsAndAssets` fails with `0xC0000005` after "Done writing bundle output", the bundler crashed on exit: run the build again. Never copy or upload the APK unless the build printed BUILD SUCCESSFUL, or an older APK goes out under the new name.
- Check before uploading: `aapt2 dump badging` shows `application-label:'SparkyFitness'`, and the APK's `assets/index.android.bundle` contains a string from the change being shipped.

**Release**

- Tag `android-YYYY.MM.DD` (the build date); a second or third build that day is `android-YYYY.MM.DD-2`, `-3`. The app's version (`1.12.1`) does not change between these builds, so the date is what tells them apart.
- Target the pushed commit the APK was built from. Asset name: `SparkyFitness-android-YYYY.MM.DD.apk` (same suffix as the tag).
- A normal release (not a pre-release), so it shows as Latest. Title `SparkyFitness Android YYYY.MM.DD`.
- Notes in plain language: what changed for the person using the app, then how to install (download the APK on the phone, allow installs from that source, it updates the existing app and keeps the login).
- `gh release create <tag> <apk> --repo atj013/sparkyfitness --target <commit sha> --title "<title>" --notes-file <notes.md>`
- The fork is public: anyone can download a release. Never attach anything with secrets (no `.env`, keystores or server URLs).
