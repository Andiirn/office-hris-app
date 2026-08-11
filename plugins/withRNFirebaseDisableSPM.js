const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withRNFirebaseDisableSPM = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfileContent = await fs.promises.readFile(podfilePath, 'utf8');

      if (!podfileContent.includes('$RNFirebaseDisableSPM')) {
        podfileContent = `$RNFirebaseDisableSPM = true\n\n${podfileContent}`;
        await fs.promises.writeFile(podfilePath, podfileContent, 'utf8');
      }

      return config;
    },
  ]);
};

module.exports = withRNFirebaseDisableSPM;
