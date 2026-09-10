# JARVIS mobile

Native Android/iOS app. React Native + Expo + Expo Router, initialized in this repository root.
Use StyleSheet and src/theme tokens; no HTML, DOM, Next.js, CSS or WebView in app code.
Stitch project 11174925214121356476 is the visual reference. See docs/DESIGN_SYNC.md.
Keep domain calculations independent of UI and native storage. Persist structured data in expo-sqlite; preferences in AsyncStorage.
Follow docs/IMPLEMENTATION_PLAN.md. Do not claim device verification from a successful bundle alone.
Run npm run typecheck, npm run lint, npm test and npm run export:native for meaningful changes.
No automatic commits, nested repositories or backend requirements for the local demo.
