module.exports = [
"[externals]/sharp [external] (sharp, cjs, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/[externals]_sharp_4f623ccc._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[externals]/sharp [external] (sharp, cjs)");
    });
});
}),
"[project]/node_modules/.pnpm/@google+generative-ai@0.21.0/node_modules/@google/generative-ai/dist/index.mjs [app-route] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/762e9_@google_generative-ai_dist_index_mjs_55f5b466._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[project]/node_modules/.pnpm/@google+generative-ai@0.21.0/node_modules/@google/generative-ai/dist/index.mjs [app-route] (ecmascript)");
    });
});
}),
];