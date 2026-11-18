// Metro empaqueta la app. withNativeWind convierte las clases de global.css + tailwind.config.js
// en estilos de React Native.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
