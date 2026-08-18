// Compatibility entry point. The application now lives in focused ES modules.
const release=new URL(import.meta.url).searchParams.get("v")||"development";
await import(`./core/app.js?v=${encodeURIComponent(release)}`);
