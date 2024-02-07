import {kv} from "@vercel/kv";
import {Entry} from "@/app/types";
import Head from "next/head";
import {Metadata, ResolvingMetadata} from "next";
import { EntryVoteForm } from "@/app/EntryForm";

async function getEntry(id: string): Promise<Entry> {
    let nullEntry = {
        id: "",
        title: "No entry found",
        option1: "",
        end_at: 0,
        created_at: 0,
        required_channel: "",
    };

    try {
        let entry: Entry | null = await kv.hgetall(`entry:${id}`);

        if (!entry) {
            return nullEntry;
        }

        return entry;
    } catch (error) {
        console.error(error);
        return nullEntry;
    }
}

type Props = {
    params: { id: string }
    searchParams: { [key: string]: string | string[] | undefined }
}

export async function generateMetadata(
    { params, searchParams }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    // read route params
    const id = params.id
    const poll = await getEntry(id)

    const fcMetadata: Record<string, string> = {
        "fc:frame": "vNext",
        "fc:frame:post_url": `${process.env['HOST']}/api/vote?id=${id}`,
        "fc:frame:image": `${process.env['HOST']}/api/image?id=${id}`,
    };
    [poll.option1].filter(o => o !== "").map((option, index) => {
        fcMetadata[`fc:frame:button:${index + 1}`] = option;
    })


    return {
        title: poll.title,
        openGraph: {
            title: poll.title,
            images: [`/api/image?id=${id}`],
        },
        other: {
            ...fcMetadata,
        },
        metadataBase: new URL(process.env['HOST'] || '')
    }
}

export default async function Page({params}: { params: {id: string}}) {
    const entry = await getEntry(params.id);

    return(
        <>
            <div className="flex flex-col items-center justify-center min-h-screen py-2">
                <main className="flex flex-col items-center justify-center flex-1 px-4 sm:px-20 text-center">
                    <EntryVoteForm entry={entry}/>
                </main>
            </div>
        </>
    );

}