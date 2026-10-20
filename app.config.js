// Adds Firebase (push notifications) to the Android build only when
// google-services.json is present — without it the app builds and runs, just
// without push. Download it from Firebase → Project settings → Your apps
// (package com.solaros.mobile) and put it next to this file.
const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  const file = path.join(__dirname, 'google-services.json');
  if (!fs.existsSync(file)) return config;
  return { ...config, android: { ...config.android, googleServicesFile: './google-services.json' } };
};
