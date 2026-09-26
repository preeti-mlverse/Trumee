"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/client";

/** Fires GA4's view_item_list / view_item / search events for server-rendered pages. */
export function ListTracker({ listName, items }: { listName: string; items: { item_id: number; item_name: string; price: number; index: number }[] }) {
  const key = items.map((i) => i.item_id).join(",");
  useEffect(() => {
    if (items.length) track("view_item_list", { item_list_name: listName, items: items.slice(0, 24) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listName, key]);
  return null;
}

export function EventOnMount({ name, params, thirdPartyOnly }: { name: string; params: Record<string, unknown>; thirdPartyOnly?: boolean }) {
  const key = JSON.stringify(params);
  useEffect(() => {
    track(name, params, { thirdPartyOnly });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, key]);
  return null;
}
