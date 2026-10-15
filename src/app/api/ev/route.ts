// Event collector. Named neutrally: EasyPrivacy (uBlock Origin, Brave, AdGuard, Opera…) blocks
// "/api/collect", which silently dropped every visitor using those browsers. /api/collect stays
// as an alias for pages still open from before the rename.
export { POST } from "../collect/route";
