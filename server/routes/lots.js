import { GetCommand, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { generateId } from '../lib/idgen.js';
import { crudRouter } from '../lib/crudRouter.js';

const TABLE = 'adma_lots';

// Stable 3-digit "paddle number" derived from the bidder's email — good enough
// for a demo bidder badge without a separate registration step/table.
function paddleFromEmail(email) {
  let hash = 0;
  for (const ch of email.toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) % 900;
  return 100 + hash;
}

export default crudRouter(TABLE, {
  defaults: () => ({ status: 'Upcoming', current_bid: null, bid_count: 0, images: [] }),
  gsiFields: { auction_id: 'auction-index' },
  extraRoutes(r) {
    r.post('/:id/bid', async (req, res) => {
      try {
        const { bidder_name, bidder_email, amount } = req.body;
        if (!bidder_name || !bidder_email || !amount) {
          return res.status(400).json({ error: 'bidder_name, bidder_email and amount are required' });
        }

        const lotResult = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id: req.params.id } }));
        const lot = lotResult.Item;
        if (!lot) return res.status(404).json({ error: 'Lot not found' });
        if (lot.status !== 'Open') {
          return res.status(400).json({ error: `This lot is ${(lot.status || 'not open').toLowerCase()} for bidding` });
        }
        if (lot.closing_time && new Date(lot.closing_time) < new Date()) {
          return res.status(400).json({ error: 'Bidding has closed for this lot' });
        }

        const increment = Number(lot.bid_increment) || 1;
        const minNext = lot.current_bid ? Number(lot.current_bid) + increment : (Number(lot.starting_bid) || increment);
        const bidAmount = Number(amount);
        if (!Number.isFinite(bidAmount) || bidAmount < minNext) {
          return res.status(400).json({ error: `Minimum bid is $${minNext}` });
        }

        const paddle_number = paddleFromEmail(bidder_email);
        const bid = {
          id: generateId(),
          lot_id: lot.id,
          auction_id: lot.auction_id,
          bidder_name, bidder_email,
          amount: bidAmount,
          paddle_number,
          created_date: new Date().toISOString(),
        };
        await ddb.send(new PutCommand({ TableName: 'adma_bids', Item: bid }));

        // Anti-sniping: a bid in the final 2 minutes pushes the close out by 2 minutes.
        let closing_time = lot.closing_time;
        if (closing_time) {
          const msLeft = new Date(closing_time) - new Date();
          if (msLeft > 0 && msLeft < 2 * 60 * 1000) {
            closing_time = new Date(Date.now() + 2 * 60 * 1000).toISOString();
          }
        }

        const updateResult = await ddb.send(new UpdateCommand({
          TableName: TABLE,
          Key: { id: lot.id },
          UpdateExpression: 'SET current_bid = :amt, bid_count = :cnt, highest_bidder_name = :n, highest_bidder_email = :e, closing_time = :ct',
          ExpressionAttributeValues: {
            ':amt': bidAmount,
            ':cnt': (lot.bid_count || 0) + 1,
            ':n': bidder_name,
            ':e': bidder_email,
            ':ct': closing_time,
          },
          ReturnValues: 'ALL_NEW',
        }));

        res.status(201).json({ lot: updateResult.Attributes, bid, paddle_number });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  },
});
