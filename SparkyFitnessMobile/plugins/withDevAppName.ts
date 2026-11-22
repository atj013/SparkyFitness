// Dev builds show "DevSparkyFitness" under the app icon, so the dev and the
// production app can sit side by side on one phone. Only the name people see
// changes: the project, slug and bundle ids keep their values, because the
// Xcode project and several plugins are named after them.
//
// iOS: CFBundleDisplayName. Android: the `app_name` string, which is the
// launcher label. The widgets, watch app and complication get the same name
// from their own `displayName` in targets/*/expo-target.config.js.
import {
  AndroidConfig,
  ConfigPlugin,
  withInfoPlist,
  withStringsXml,
} from 'expo/config-plugins';

// A local build can show another name, e.g. plain "SparkyFitness" on a phone
// without the production app, by setting DEV_APP_NAME in SparkyFitnessMobile/.env.
// The ids stay the dev ones either way.
export const DEV_APP_NAME =
  process.env.DEV_APP_NAME?.trim() || 'DevSparkyFitness';

const withDevAppName: ConfigPlugin = (config) => {
  config = withInfoPlist(config, (innerConfig) => {
    innerConfig.modResults.CFBundleDisplayName = DEV_APP_NAME;
    return innerConfig;
  });
  return withStringsXml(config, (innerConfig) => {
    innerConfig.modResults = AndroidConfig.Strings.setStringItem(
      [
        AndroidConfig.Resources.buildResourceItem({
          name: 'app_name',
          value: DEV_APP_NAME,
        }),
      ],
      innerConfig.modResults
    );
    return innerConfig;
  });
};

export default withDevAppName;
