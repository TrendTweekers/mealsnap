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
];