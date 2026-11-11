// app.json is the config. For a sideload build (no Apple Developer account) the widget and Live Activity
// extension is left out, because it needs an app group and push entitlements a free Apple ID cannot sign.
module.exports = ({ config }) => {
  if (process.env.WRK_SIDELOAD === '1') {
    config.plugins = (config.plugins || []).filter((p) => (Array.isArray(p) ? p[0] : p) !== 'expo-widgets');
  }
  return config;
};
