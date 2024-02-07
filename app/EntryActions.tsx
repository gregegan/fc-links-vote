"use server";

import { kv } from "@vercel/kv";
import { revalidatePath } from "next/cache";
import {Entry, ENTRY_EXPIRY} from "./types";
import {redirect} from "next/navigation";

export async function saveEntry(entry: Entry, formData: FormData) {
  let newEntries = {
    ...entry,
    created_at: Date.now(),
    end_at: Date.now(),
    title: formData.get("title") as string,
    option1: formData.get("option1") as string,
    required_channel: formData.get("requiredChannel") as string || "",
  }
  await kv.hset(`entry:${entry.id}`, entry);
  await kv.expire(`entry:${entry.id}`, ENTRY_EXPIRY);
  await kv.zadd("entries_by_date", { // TODO
    score: Number(entry.created_at),
    member: newEntries.id,
  });

  revalidatePath("/entries");
  redirect(`/entries/${entry.id}`);
}

export async function voteEntry(entry: Entry, optionIndex: number) {
  await kv.hincrby(`entry:${entry.id}`, `votes${optionIndex}`, 1); // TODO

  revalidatePath(`/entries/${entry.id}`);
  redirect(`/entries/${entry.id}?results=true`);
}

export async function redirectToEntries() {
  redirect("/entries");
}