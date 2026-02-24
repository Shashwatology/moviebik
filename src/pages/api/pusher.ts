import PusherServer from 'pusher';
import { NextApiRequest, NextApiResponse } from 'next';

const pusher = new PusherServer({
    appId: "2119725",
    key: "a74526b2c362e9363d7f",
    secret: "60ba0171f37f627c2278",
    cluster: "ap2",
    useTLS: true
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { event, roomId, data } = req.body;

    try {
        await pusher.trigger(`room-${roomId}`, event, data);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Pusher error:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
}
