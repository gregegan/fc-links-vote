# Farcaster Frames Poll app

A example Poll app using [Farcaster Frames](https://warpcast.notion.site/Farcaster-Frames-4bd47fe97dc74a42a48d3a234636d8c5). 

This example lets you create a poll and have users vote on it. The FrameAction is authenticated against a hub 
so the votes cannot be spoofed (if `HUB_URL` is provided), and the results are stored in a redis database. 


## Demo

- [https://fc-polls.vercel.app/](https://fc-polls.vercel.app/)


zrange
Returns the specified range of elements in the sorted set stored at <key>.

zrange
Returns the specified range of elements in the sorted set stored at <key>.

sismember
Returns if member is a member of the set stored at key.

hset
Sets the specified fields to their respective values in the hash stored at key.

hget
Returns the value associated with field in the hash stored at key.

hgetall
Returns all fields and values of the hash stored at key. In the returned value, every field name is followed by its value, so the length of the reply is twice the size of the hash.

hincrby
Increments the number stored at field in the hash stored at key by increment. If key does not exist, a new key holding a hash is created. If field does not exist the value is set to 0 before the operation is performed.

sadd
Add the specified members to the set stored at key. Specified members that are already a member of this set are ignored. If key does not exist, a new set is created before adding the specified members.

commands
hgetall entry:5825c923-6c05-4037-9587-a7e5a09ddd20

keys *

flushdb

smembers entry:ffa96f10-86b5-4533-a8f9-040732456fcf:entered