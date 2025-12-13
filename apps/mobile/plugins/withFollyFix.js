import { withDangerousMod } from '@expo/config-plugins';
import fs from 'fs';
import path from 'path';

/**
 * Plugin to fix the Folly coroutine issue in React Native 0.81+
 * Adds FOLLY_CFG_NO_COROUTINES=1 to disable coroutine support
 */
const withFollyFix = config => {
  return withDangerousMod(config, [
    'ios',
    async config => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, 'utf8');

        // Check if we already added the fix
        if (!podfileContent.includes('FOLLY_CFG_NO_COROUTINES')) {
          // Add the post_install hook to disable Folly coroutines
          const postInstallFix = `
  # Fix for Folly coroutine issue in React Native 0.81+
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FOLLY_CFG_NO_COROUTINES=1'
    end
  end
`;

          // Insert before the end of post_install block
          if (podfileContent.includes('post_install do |installer|')) {
            podfileContent = podfileContent.replace(
              /post_install do \|installer\|/,
              `post_install do |installer|${postInstallFix}`
            );
          } else {
            // Add new post_install block before 'end' of the main target
            podfileContent = podfileContent.replace(
              /^end\s*$/m,
              `  post_install do |installer|${postInstallFix}  end\nend`
            );
          }

          fs.writeFileSync(podfilePath, podfileContent);
        }
      }

      return config;
    },
  ]);
};

export default withFollyFix;
