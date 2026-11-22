See @AGENTS.md

## This fork (atj013/sparkyfitness)

`origin` is the maintainer's fork; `upstream` is `CodeWithCJ/SparkyFitness`.

- `main`: an untouched copy of upstream `main`. Sync it with `gh repo sync atj013/sparkyfitness --branch main --source CodeWithCJ/SparkyFitness`; never commit to it.
- `diary-meal-sections`: the fork's app work (the phone app, and server changes that are also kept here). To take upstream changes, `git fetch upstream` and merge `upstream/main` into it, resolve conflicts, run the checks of every package the merge touched, then push.
- `fork-server`: what the maintainer's server runs. It is the upstream **release tag** their server was on (currently `v1.12.1`) plus only the fork's server commits, cherry-picked. Never merge `main` or the app branch into it: upstream `main` carries database migrations the release does not have, and running them would make the database newer than the official images. Every push builds `ghcr.io/atj013/sparkyfitness_server:fork` and `:fork-<sha>` (`.github/workflows/fork-server-image.yml`, on that branch only).
- A server change: commit it on `diary-meal-sections`, cherry-pick it onto `fork-server`, run the server tests there, push both. Then the maintainer runs `docker compose pull` and `docker compose up -d`.
- A new upstream release: ask before moving `fork-server` to it (`git rebase --onto <new tag> <old tag> fork-server`, force-push). Moving it runs that release's migrations on the maintainer's database; they back the database up first. Their web app stays on the official `codewithcj/sparkyfitness` image at the same release.
- Pushing these branches and syncing `main` is part of this flow; sending anything to upstream (pull requests, issues, comments) needs the maintainer's say-so each time.
- On the fork, every upstream GitHub Actions workflow is disabled on purpose (they need upstream's secrets, or run upstream's own release jobs); only "Fork server image (GHCR)" is on. A workflow can be switched back on with `gh workflow enable "<name>" --repo atj013/sparkyfitness`.

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
