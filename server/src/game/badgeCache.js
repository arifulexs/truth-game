import { getAllUserBadgeAssignments } from '../db/badges.js';

// userId -> Badge[]. Read synchronously wherever a display name is sent to a
// client (chat, room state, friends list) so those hot paths never need a
// database round-trip. Refreshed on boot and whenever the admin panel
// assigns or removes a badge.
let badgesByUser = new Map();

export async function refreshBadgeCache() {
  badgesByUser = await getAllUserBadgeAssignments();
}

export function getBadgesForUserSync(userId) {
  return badgesByUser.get(userId) || [];
}
