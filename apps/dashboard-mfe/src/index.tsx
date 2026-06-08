// Boundary assíncrona para o Module Federation: o `import()` dinâmico garante
// que os shared singletons (react, react-dom, @bytebank/*) sejam resolvidos no
// share scope ANTES de a árvore da app ser avaliada. Importar shared não-eager
// de forma síncrona quebraria com "Shared module is not available for eager
// consumption". Este arquivo só roda no dev/preview standalone (:3001); o shell
// consome o remote via exposes './Dashboard' (ver rsbuild.config.ts).
import('./bootstrap');

export {};
