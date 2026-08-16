import { Router } from 'express';
import {
  GetCommand, PutCommand, UpdateCommand, DeleteCommand,
  ScanCommand, QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { ddb } from './dynamo.js';
import { generateId } from './idgen.js';
import { requireAuth, requireRole } from './authMiddleware.js';

// Builds the middleware for a `read`/`write` mode:
//  - 'public'          → no restriction
//  - 'auth'             → any logged-in user
//  - [roles]            → only those roles
//  - function(req,item) → ownership check (see buildOwnershipCheck below), only
//                          meaningful for :id routes; POST / falls back to requireAuth
function buildAccessMiddleware(mode) {
  if (!mode || mode === 'public') return (req, res, next) => next();
  if (mode === 'auth') return requireAuth;
  if (Array.isArray(mode)) return requireRole(...mode);
  if (typeof mode === 'function') return requireAuth; // ownership checked separately, after fetching the item
  throw new Error(`crudRouter: invalid auth mode ${JSON.stringify(mode)}`);
}

// For :id routes when `read`/`write` is an ownership function — fetches the existing
// item first (404 if missing), then awaits the caller-supplied predicate. Caches the
// fetched item on req._crudItem so GET /:id doesn't need a second GetCommand.
// denyStatus is 404 for `read` (hides that the record exists at all from someone who
// can't see it — meaningful for authenticated-only resources) vs 403 for `write`
// (matches the already-verified Batch B behavior; these resources are public-read
// anyway, so there's no existence to hide).
function buildOwnershipCheck(table, mode, denyStatus = 403) {
  if (typeof mode !== 'function') return (req, res, next) => next();
  return async (req, res, next) => {
    try {
      const result = await ddb.send(new GetCommand({ TableName: table, Key: { id: req.params.id } }));
      if (!result.Item) return res.status(404).json({ error: 'Not found' });
      if (!await mode(req, result.Item)) {
        return denyStatus === 404
          ? res.status(404).json({ error: 'Not found' })
          : res.status(403).json({ error: 'You do not have permission to do that.' });
      }
      req._crudItem = result.Item;
      next();
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  };
}

// For GET / (list) when `read` is an ownership function — filters the already-fetched
// items array down to what the caller is allowed to see.
async function filterByOwnership(req, items, mode) {
  if (typeof mode !== 'function') return items;
  const checked = await Promise.all(items.map(async item => [item, await mode(req, item)]));
  return checked.filter(([, ok]) => ok).map(([item]) => item);
}

/**
 * Build an Express router with standard CRUD routes for a DynamoDB table.
 *
 * @param {string} table  DynamoDB table name
 * @param {object} opts
 *   gsiFields   – map of field name → GSI index name used for filter queries
 *   defaults    – function(data) returning fields to merge on create
 *   extraRoutes – function(router) to attach custom routes before the generic ones
 *   auth        – { read, write } access mode, see buildAccessMiddleware above.
 *                 No default — every call site sets this explicitly so nothing
 *                 is silently over- or under-restricted.
 *   filterItems – optional function(item) => boolean, applied to GET / and GET /:id
 *                 in addition to ownership. Used for soft-delete (e.g. exhibitors.js
 *                 hides `deleted: true` records everywhere by default) — a no-op for
 *                 every table that doesn't pass it.
 */
export function crudRouter(table, { gsiFields = {}, defaults = () => ({}), extraRoutes, auth = {}, filterItems } = {}) {
  const r = Router();
  const passesFilter = (item) => !filterItems || filterItems(item);

  if (extraRoutes) extraRoutes(r);

  const readAccess = buildAccessMiddleware(auth.read);
  const writeAccess = buildAccessMiddleware(auth.write);
  const readOwnershipCheck = buildOwnershipCheck(table, auth.read, 404);
  const writeOwnershipCheck = buildOwnershipCheck(table, auth.write, 403);

  // List / filter
  r.get('/', readAccess, async (req, res) => {
    try {
      const { sortBy, filter: filterJson } = req.query;
      const filterObj = filterJson ? JSON.parse(decodeURIComponent(filterJson)) : null;

      let items;

      if (filterObj) {
        const entries = Object.entries(filterObj);
        // Try GSI query for the first indexed field
        const gsiEntry = entries.find(([k]) => gsiFields[k]);
        if (gsiEntry) {
          const [field, value] = gsiEntry;
          const result = await ddb.send(new QueryCommand({
            TableName: table,
            IndexName: gsiFields[field],
            KeyConditionExpression: '#f = :v',
            ExpressionAttributeNames: { '#f': field },
            ExpressionAttributeValues: { ':v': value },
          }));
          items = result.Items || [];
          // Apply remaining filter conditions in JS
          const rest = entries.filter(([k]) => k !== field);
          if (rest.length) items = items.filter(item => rest.every(([k, v]) => item[k] === v));
        } else {
          // Full scan with FilterExpression
          const names = {};
          const values = {};
          const parts = entries.map(([k, v], i) => {
            names[`#k${i}`] = k;
            values[`:v${i}`] = v;
            return `#k${i} = :v${i}`;
          });
          const result = await ddb.send(new ScanCommand({
            TableName: table,
            FilterExpression: parts.join(' AND '),
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
          }));
          items = result.Items || [];
        }
      } else {
        const result = await ddb.send(new ScanCommand({ TableName: table }));
        items = result.Items || [];
      }

      items = await filterByOwnership(req, items, auth.read);
      items = items.filter(passesFilter);

      if (sortBy) {
        const desc = sortBy.startsWith('-');
        const field = desc ? sortBy.slice(1) : sortBy;
        items.sort((a, b) => {
          const av = a[field] ?? '';
          const bv = b[field] ?? '';
          return desc ? (bv > av ? 1 : -1) : (av > bv ? 1 : -1);
        });
      }

      res.json(items);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get by id
  r.get('/:id', readAccess, readOwnershipCheck, async (req, res) => {
    try {
      const item = req._crudItem || (await ddb.send(new GetCommand({ TableName: table, Key: { id: req.params.id } }))).Item;
      if (!item || !passesFilter(item)) return res.status(404).json({ error: 'Not found' });
      res.json(item);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Create
  r.post('/', writeAccess, async (req, res) => {
    try {
      const item = {
        id: generateId(),
        created_date: new Date().toISOString(),
        ...defaults(req.body),
        ...req.body,
      };
      await ddb.send(new PutCommand({ TableName: table, Item: item }));
      res.status(201).json(item);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Update
  r.put('/:id', writeAccess, writeOwnershipCheck, async (req, res) => {
    try {
      const body = req.body;
      const entries = Object.entries(body).filter(([k]) => k !== 'id');
      if (!entries.length) return res.status(400).json({ error: 'No fields to update' });

      const names = {};
      const values = {};
      const sets = entries.map(([k, v], i) => {
        names[`#f${i}`] = k;
        values[`:v${i}`] = v;
        return `#f${i} = :v${i}`;
      });

      const result = await ddb.send(new UpdateCommand({
        TableName: table,
        Key: { id: req.params.id },
        UpdateExpression: `SET ${sets.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      }));
      res.json(result.Attributes);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Delete
  r.delete('/:id', writeAccess, writeOwnershipCheck, async (req, res) => {
    try {
      await ddb.send(new DeleteCommand({ TableName: table, Key: { id: req.params.id } }));
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return r;
}
