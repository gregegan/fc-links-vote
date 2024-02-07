import type { NextApiRequest, NextApiResponse } from 'next';
import {Entry, ENTRY_EXPIRY} from "@/app/types";
import {kv} from "@vercel/kv";
import {getSSLHubRpcClient, Message} from "@farcaster/hub-nodejs";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";

const HUB_URL = process.env['HUB_URL']
const client = HUB_URL ? getSSLHubRpcClient(HUB_URL) : undefined;
const neynarClient = new NeynarAPIClient(process.env.NEYNAR_API_KEY || "");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        // Process the entry
        // For example, let's assume you receive an option in the body
        try {
            const entryId = req.query['id']
            const results = req.query['results'] === 'true'
            let entered = req.query['entered'] === 'true'
            if (!entryId) {
                return res.status(400).send('Missing entry ID');
            }

            let validatedMessage : Message | undefined = undefined;
            try {
                const frameMessage = Message.decode(Buffer.from(req.body?.trustedData?.messageBytes || '', 'hex'));
                const result = await client?.validateMessage(frameMessage);
                if (result && result.isOk() && result.value.valid) {
                    validatedMessage = result.value.message;
                }

                // Also validate the frame url matches the expected url
                let urlBuffer = validatedMessage?.data?.frameActionBody?.url || [];
                const urlString = Buffer.from(urlBuffer).toString('utf-8');
                if (validatedMessage && !urlString.startsWith(process.env['HOST'] || '')) {
                    return res.status(400).send(`Invalid frame url: ${urlBuffer}`);
                }
            } catch (e)  {
                return res.status(400).send(`Failed to validate message: ${e}`);
            }

            let buttonId = 0, fid = 0;
            // If HUB_URL is not provided, don't validate and fall back to untrusted data
            if (client) {
                buttonId = validatedMessage?.data?.frameActionBody?.buttonIndex || 0;
                fid = validatedMessage?.data?.fid || 0;
            } else {
                buttonId = req.body?.untrustedData?.buttonIndex || 0;
                fid = req.body?.untrustedData?.fid || 0;
            }

            console.log({fid: validatedMessage?.data?.fid, untrustedFid: req.body?.untrustedData?.fid})

            // Clicked create entry
            if ((results || entered) && buttonId === 2) {
                return res.status(302).setHeader('Location', `${process.env['HOST']}`).send('Redirecting to create poll');
            }

            let isFollowingChannel
            const requiredChannelFollow = await kv.hget(`entry:${entryId}`, 'required_channel') as string

            // check if user is in the defined channel
            if (requiredChannelFollow != '') {
              const channelFollowers = await neynarClient.fetchFollowersForAChannel(requiredChannelFollow, {limit: 1000});
              isFollowingChannel = !!channelFollowers.users.filter(user => user.fid === fid).length
            }

            console.log({requiredChannelFollow, isFollowingChannel})

            // check if user already voted
            const voteExists = await kv.sismember(`entry:${entryId}:entered`, fid)
            entered = entered || !!voteExists
            
            console.log({fid, buttonId, results, entered})

            if (fid > 0 && buttonId > 0 && buttonId < 5 && !results && !entered && isFollowingChannel) {
                let multi = kv.multi();
                multi.sadd(`entry:${entryId}:entered`, fid);
                multi.expire(`entry:${entryId}`, ENTRY_EXPIRY);
                multi.expire(`entry:${entryId}:entered`, ENTRY_EXPIRY);
                await multi.exec();
            }

            let entry: Entry | null = await kv.hgetall(`entry:${entryId}`);

            if (!entry) {
                return res.status(400).send('Missing entry ID');
            }
            const imageUrl = `${process.env['HOST']}/api/image?id=${entry.id}&results=${results ? 'false': 'true'}&date=${Date.now()}${ fid > 0 ? `&fid=${fid}` : '' }`;
            let button1Text = "View Results";
            if (requiredChannelFollow != '' && !isFollowingChannel) {
              button1Text = `Not in channel /${requiredChannelFollow}`
            } else if (!entered && !results) {
                button1Text = "Back"
            } else if (entered && !results) {
                button1Text = "Already entered"
            } else if (entered && results) {
                button1Text = "View Results"
            }

            // Return an HTML response
            res.setHeader('Content-Type', 'text/html');
            res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vote Recorded</title>
          <meta property="og:title" content="Vote Recorded">
          <meta property="og:image" content="${imageUrl}">
          <meta name="fc:frame" content="vNext">
          <meta name="fc:frame:image" content="${imageUrl}">
          <meta name="fc:frame:post_url" content="${process.env['HOST']}/api/vote?id=${entry.id}&entered=true&results=${results ? 'false' : 'true'}">
          <meta name="fc:frame:button:1" content="${button1Text}">
          <meta name="fc:frame:button:2" content="Create your own entry">
          <meta name="fc:frame:button:2:action" content="post_redirect">
        </head>
        <body>
          <p>${ results || entered ? `You have already entered. You clicked ${buttonId}` : `Your entry for ${buttonId} has been recorded for fid ${fid}.` }</p>
        </body>
      </html>
    `);
        } catch (error) {
            console.error(error);
            res.status(500).send('Error generating image');
        }
    } else {
        // Handle any non-POST requests
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
