import type { NextApiRequest, NextApiResponse } from 'next';
import sharp from 'sharp';
import {Entry} from "@/app/types";
import {kv} from "@vercel/kv";
import satori from "satori";
import { join } from 'path';
import * as fs from "fs";

const fontPath = join(process.cwd(), 'Roboto-Regular.ttf')
let fontData = fs.readFileSync(fontPath)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const entryId = req.query['id']
        const fid = parseInt(req.query['fid']?.toString() || '')
        if (!entryId) {
            return res.status(400).send('Missing entry ID');
        }

        let entry: Entry | null = await kv.hgetall(`entry:${entryId}`);


        if (!entry) {
            return res.status(400).send('Missing entry ID');
        }

        const showResults = req.query['results'] === 'true'
        // let votedOption: number | null = null
        // if (showResults && fid > 0) {
        //     votedOption = await kv.hget(`entry:${entryId}:votes`, `${fid}`) as number
        // }

        const entryOptions = [entry.option1]
            .filter((option) => option !== '');
        const totalVotes = entryOptions
            // @ts-ignore
            .map((option, index) => parseInt(entry[`votes${index+1}`]))
            .reduce((a, b) => a + b, 0);
        const entryData = {
            question: showResults ? `Results for ${entry.title}` : entry.title,
            options: entryOptions
                .map((option, index) => {
                    // @ts-ignore
                    const votes = entry[`votes${index+1}`]
                    const percentOfTotal = totalVotes ? Math.round(votes / totalVotes * 100) : 0;
                    let text = showResults ? `${percentOfTotal}%: ${option} (${votes} votes)` : `${index + 1}. ${option}`
                    return { option, votes, text, percentOfTotal }
                })
        };

        const svg = await satori(
            <div style={{
                justifyContent: 'flex-start',
                alignItems: 'center',
                display: 'flex',
                width: '100%',
                height: '100%',
                backgroundColor: 'f4f4f4',
                padding: 50,
                lineHeight: 1.2,
                fontSize: 24,
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 20,
                }}>
                    <h2 style={{textAlign: 'center', color: 'lightgray'}}>{entry.title}</h2>
                    <div>FID: {`${fid}`} entered to win!</div>
                    {/*{showResults ? <h3 style={{color: "darkgray"}}>Total votes: {totalVotes}</h3> : ''}*/}
                </div>
            </div>
            ,
            {
                width: 600, height: 400, fonts: [{
                    data: fontData,
                    name: 'Roboto',
                    style: 'normal',
                    weight: 400
                }]
            })

        // Convert SVG to PNG using Sharp
        const pngBuffer = await sharp(Buffer.from(svg))
            .toFormat('png')
            .toBuffer();

        // Set the content type to PNG and send the response
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'max-age=10');
        res.send(pngBuffer);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating image');
    }
}
