// module-alias ships no type declarations for its /register side-effect entry.
// This shim lets `import "module-alias/register"` type-check on strict setups.
declare module "module-alias/register";
