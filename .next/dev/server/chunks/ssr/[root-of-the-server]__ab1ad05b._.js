module.exports = [
"[externals]/sharp [external] (sharp, cjs, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/ssr/[externals]_sharp_4f623ccc._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[externals]/sharp [external] (sharp, cjs)");
    });
});
}),
"[project]/node_modules/.pnpm/@google+generative-ai@0.21.0/node_modules/@google/generative-ai/dist/index.mjs [app-rsc] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/ssr/762e9_@google_generative-ai_dist_index_mjs_d8d6513e._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[project]/node_modules/.pnpm/@google+generative-ai@0.21.0/node_modules/@google/generative-ai/dist/index.mjs [app-rsc] (ecmascript)");
    });
});
}),
];