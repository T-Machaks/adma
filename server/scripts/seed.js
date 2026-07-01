/**
 * One-time DynamoDB seed script.
 * Run from the server/ directory: node scripts/seed.js
 */
import 'dotenv/config';
import { BatchWriteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';

const SEED_EXHIBITORS = [
  // ── Platinum — Main Pavilion ──────────────────────────────────────────────
  { id: 'e01', name: 'Afritractors',              tier: 'Platinum', category: 'Machinery',             section: 'Main Pavilion', booth: 'A01', featured: true,  logo_url: '', description: 'Tractor and implement dealer supplying Solis tractors, ploughs and planting equipment across Zimbabwe.' },
  { id: 'e02', name: 'Agricon',                   tier: 'Platinum', category: 'Machinery',             section: 'Main Pavilion', booth: 'A02', featured: true,  logo_url: '', description: 'Comprehensive equipment solutions for farming, earthmoving and agro-processing across Zimbabwe.' },
  { id: 'e03', name: 'Agriforce',                 tier: 'Platinum', category: 'Fertilizers & Inputs',  section: 'Main Pavilion', booth: 'A03', featured: true,  logo_url: '', description: 'Fertilisers, seed and crop protection inputs for commercial and smallholder farmers.' },
  { id: 'e04', name: 'Amcotts',                   tier: 'Platinum', category: 'Machinery',             section: 'Main Pavilion', booth: 'A04', featured: false, logo_url: '', description: 'Farm machinery and equipment dealer serving Zimbabwe\'s commercial farming sector.' },
  { id: 'e05', name: 'Amtec',                     tier: 'Platinum', category: 'Agri-Tech',             section: 'Main Pavilion', booth: 'A05', featured: false, logo_url: '', description: 'Agricultural technology and precision farming solutions for modern Zimbabwean farms.' },
  { id: 'e06', name: 'Bain',                      tier: 'Platinum', category: 'Services',              section: 'Main Pavilion', booth: 'A06', featured: false, logo_url: '', description: 'Industrial and agricultural support services across the farming value chain.' },
  { id: 'e07', name: 'Brown Engineering Group',   tier: 'Platinum', category: 'Machinery',             section: 'Main Pavilion', booth: 'A07', featured: true,  logo_url: '', description: 'Engineering and fabrication of farm implements, trailers and grain handling equipment.' },
  { id: 'e08', name: 'Centre Pivot Irrigation',   tier: 'Platinum', category: 'Irrigation',            section: 'Main Pavilion', booth: 'A08', featured: true,  logo_url: '', description: 'Centre pivot and drip irrigation systems for commercial-scale crop production.' },
  { id: 'e09', name: 'Cloverleaf Motors',         tier: 'Platinum', category: 'Logistics',             section: 'Main Pavilion', booth: 'A09', featured: false, logo_url: '', description: 'Commercial vehicle dealer supplying trucks and utility vehicles for farm and haulage operations.' },
  { id: 'e10', name: 'Croco Motors',              tier: 'Platinum', category: 'Logistics',             section: 'Main Pavilion', booth: 'A10', featured: false, logo_url: '', description: 'Vehicle dealership offering bakkies, trucks and fleet solutions for agribusiness operators.' },

  // ── Gold — Machinery Hall ────────────────────────────────────────────────
  { id: 'e11', name: 'Zimplow',                   tier: 'Gold', category: 'Machinery',             section: 'Machinery Hall', booth: 'B01', featured: false, logo_url: '', description: 'Zimbabwean industrial group manufacturing ploughs, cultivators and animal-drawn implements.' },
  { id: 'e12', name: 'Windmill',                  tier: 'Gold', category: 'Fertilizers & Inputs',  section: 'Machinery Hall', booth: 'B02', featured: false, logo_url: '', description: 'Fertiliser and agro-chemical manufacturer supplying inputs to commercial and smallholder farmers.' },
  { id: 'e13', name: 'Harvest Capital',           tier: 'Gold', category: 'Finance',              section: 'Machinery Hall', booth: 'B03', featured: false, logo_url: '', description: 'Asset finance and working capital loans for tractors, implements and irrigation equipment.' },
  { id: 'e14', name: 'AgriGuard Security',        tier: 'Gold', category: 'Security',             section: 'Machinery Hall', booth: 'B04', featured: false, logo_url: '', description: 'Farm security systems, guarding services and livestock theft prevention solutions.' },
  { id: 'e15', name: 'AquaFlow Irrigation',       tier: 'Gold', category: 'Irrigation',            section: 'Machinery Hall', booth: 'B05', featured: false, logo_url: '', description: 'Solar-powered water pumping and drip irrigation kits for smallholder and commercial farms.' },
  { id: 'e16', name: 'FarmTech Solutions',        tier: 'Gold', category: 'Agri-Tech',             section: 'Machinery Hall', booth: 'B06', featured: false, logo_url: '', description: 'Farm management software, soil sensors and yield-mapping technology.' },
  { id: 'e17', name: 'TransAgri Logistics',       tier: 'Gold', category: 'Logistics',             section: 'Machinery Hall', booth: 'B07', featured: false, logo_url: '', description: 'Bulk grain haulage and cold-chain transport for perishable agricultural produce.' },
  { id: 'e18', name: 'Prime Livestock Breeders',  tier: 'Gold', category: 'Livestock',             section: 'Machinery Hall', booth: 'B08', featured: false, logo_url: '', description: 'Registered cattle and goat breeder supplying stud stock to commercial ranches.' },
  { id: 'e19', name: 'Solar Agro Systems',        tier: 'Gold', category: 'Irrigation',            section: 'Machinery Hall', booth: 'B09', featured: false, logo_url: '', description: 'Solar water pumping and off-grid power systems for irrigation and rural farms.' },
  { id: 'e20', name: 'GreenFields Finance',       tier: 'Gold', category: 'Finance',              section: 'Machinery Hall', booth: 'B10', featured: false, logo_url: '', description: 'Agri-insurance and input finance products tailored to seasonal farming cash flows.' },

  // ── Silver — Suppliers Village ───────────────────────────────────────────
  { id: 'e21', name: 'Value Chain Logistics',     tier: 'Silver', category: 'Logistics',             section: 'Suppliers Village', booth: 'C01', featured: false, logo_url: '', description: 'Warehousing and distribution services for agricultural produce and inputs.' },
  { id: 'e22', name: 'SafeFarm Security Services',tier: 'Silver', category: 'Security',             section: 'Suppliers Village', booth: 'C02', featured: false, logo_url: '', description: 'Perimeter fencing, alarm systems and armed response for rural properties.' },
  { id: 'e23', name: 'Highveld Seed Co',          tier: 'Silver', category: 'Fertilizers & Inputs',  section: 'Suppliers Village', booth: 'C03', featured: false, logo_url: '', description: 'Certified seed varieties for maize, soya and small grains.' },
  { id: 'e24', name: 'Zambezi Livestock Traders', tier: 'Silver', category: 'Livestock',             section: 'Suppliers Village', booth: 'C04', featured: false, logo_url: '', description: 'Livestock trading and auction services connecting farmers to buyers nationwide.' },
  { id: 'e25', name: 'AgriBank Rural Finance',    tier: 'Silver', category: 'Finance',              section: 'Suppliers Village', booth: 'C05', featured: false, logo_url: '', description: 'Rural banking products and seasonal loans for smallholder farming cooperatives.' },
  { id: 'e26', name: 'Sunrise Irrigation Supplies',tier: 'Silver', category: 'Irrigation',           section: 'Suppliers Village', booth: 'C06', featured: false, logo_url: '', description: 'Sprinklers, pipes and fittings for garden and field-scale irrigation projects.' },
  { id: 'e27', name: 'National Foods Agri Inputs',tier: 'Silver', category: 'Fertilizers & Inputs',  section: 'Suppliers Village', booth: 'C07', featured: false, logo_url: '', description: 'Stock feeds and agri-inputs supporting livestock and crop production.' },
  { id: 'e28', name: 'Mashonaland Machinery Spares',tier: 'Silver', category: 'Machinery',           section: 'Suppliers Village', booth: 'C08', featured: false, logo_url: '', description: 'Spare parts and after-sales support for tractors and farm implements.' },
  { id: 'e29', name: 'CropServe Advisory',        tier: 'Silver', category: 'Services',              section: 'Suppliers Village', booth: 'C09', featured: false, logo_url: '', description: 'Agronomy advisory and extension services for commercial and emerging farmers.' },
  { id: 'e30', name: 'SmartFarm Tech',            tier: 'Silver', category: 'Agri-Tech',             section: 'Suppliers Village', booth: 'C10', featured: false, logo_url: '', description: 'IoT soil moisture sensors and weather stations for precision agriculture.' },

  // ── Bronze — Field Zone ──────────────────────────────────────────────────
  { id: 'e31', name: 'Village Poultry Suppliers', tier: 'Bronze', category: 'Livestock',             section: 'Field Zone', booth: 'D01', featured: false, logo_url: '', description: 'Day-old chicks, layers and broiler feed for small-scale poultry farmers.' },
  { id: 'e32', name: 'Manica Feeds',              tier: 'Bronze', category: 'Fertilizers & Inputs',  section: 'Field Zone', booth: 'D02', featured: false, logo_url: '', description: 'Stock feed manufacturer supplying dairy, beef and poultry rations.' },
  { id: 'e33', name: 'RuralWatch Security',       tier: 'Bronze', category: 'Security',             section: 'Field Zone', booth: 'D03', featured: false, logo_url: '', description: 'Community farm-watch and rapid-response security for rural farming areas.' },
  { id: 'e34', name: 'FarmLink Logistics',        tier: 'Bronze', category: 'Logistics',             section: 'Field Zone', booth: 'D04', featured: false, logo_url: '', description: 'Small-load transport and delivery services connecting farms to local markets.' },
  { id: 'e35', name: 'GreenGrow Fertilisers',     tier: 'Bronze', category: 'Fertilizers & Inputs',  section: 'Field Zone', booth: 'D05', featured: false, logo_url: '', description: 'Affordable blended fertilisers for smallholder maize and horticulture growers.' },
  { id: 'e36', name: 'AgriConnect Services',      tier: 'Bronze', category: 'Services',              section: 'Field Zone', booth: 'D06', featured: false, logo_url: '', description: 'Farmer training, market linkage and cooperative support services.' },
];

const SEED_SPONSORS = [
  { id: 's1', name: 'Afritractors',            tier: 'Platinum', description: 'Zimbabwe\'s leading tractor and implement dealer. Proud Platinum sponsor of ADMA Agri Show 2026.', website: 'https://www.afritractors.co.zw',       logo_url: '', featured: true  },
  { id: 's2', name: 'Agricon',                 tier: 'Platinum', description: 'Comprehensive farm equipment solutions supporting Zimbabwean agriculture.',                        website: 'https://www.agricon.co.zw',            logo_url: '', featured: true  },
  { id: 's3', name: 'Centre Pivot Irrigation', tier: 'Platinum', description: 'Centre pivot and drip irrigation systems for commercial-scale crop production.',                   website: '',                                     logo_url: '', featured: true  },
  { id: 's4', name: 'Zimplow',                 tier: 'Gold',     description: 'Diversified Zimbabwean industrial group manufacturing implements for agriculture.',                website: 'https://www.zimplow.co.zw',            logo_url: '', featured: false },
  { id: 's5', name: 'Amtec',                   tier: 'Gold',     description: 'Agricultural technology and precision farming solutions for modern Zimbabwean farms.',             website: '',                                     logo_url: '', featured: false },
  { id: 's6', name: 'Cloverleaf Motors',       tier: 'Gold',     description: 'Commercial vehicle dealer supplying trucks and utility vehicles for farm operations.',              website: '',                                     logo_url: '', featured: false },
  { id: 's7', name: 'Windmill',                tier: 'Silver',   description: 'Fertiliser and agro-chemical manufacturer supplying inputs nationwide.',                            website: '',                                     logo_url: '', featured: false },
  { id: 's8', name: 'Harvest Capital',         tier: 'Silver',   description: 'Asset finance and working capital loans for farm equipment.',                                       website: '',                                     logo_url: '', featured: false },
  { id: 's9', name: 'FarmTech Solutions',      tier: 'Bronze',   description: 'Farm management software, soil sensors and yield-mapping technology.',                             website: '',                                     logo_url: '', featured: false },
  { id: 's10', name: 'AgriGuard Security',     tier: 'Bronze',   description: 'Farm security systems and livestock theft prevention solutions.',                                  website: '',                                     logo_url: '', featured: false },
];

const SEED_ANNOUNCEMENTS = [
  { id: 'a1', title: 'Welcome to ADMA Agri Show 2026', body: "ADMA Agri Show 2026 is taking shape! Join us at ART Farm, Pomona, Harare — 25 acres, 280+ exhibitors and live livestock auctions. Register your interest today.", type: 'General',   pinned: true,  created_date: new Date().toISOString() },
  { id: 'a2', title: 'Exhibitor Registrations Now Open', body: 'Companies wishing to exhibit at ADMA Agri Show 2026 can now register for a stand. Platinum, Gold, Silver, and Bronze packages are available. Contact us at info@agrishow.co.zw.', type: 'Important', pinned: true,  created_date: new Date(Date.now() - 86400000).toISOString() },
  { id: 'a3', title: 'Supplier & Vendor Registration Open', body: 'Suppliers and vendors wishing to trade on-site during the show can now submit their registration. Limited vendor slots are available across all zones — apply early to secure your spot.', type: 'Important', pinned: false, created_date: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'a4', title: 'ADMA 2026 Site Plan Now Available', body: 'The official ADMA 2026 site plan is now live in the app under Site Plan. Use it to find your favourite exhibitors across the Main Pavilion, Machinery Hall, Suppliers Village and Field Zone.', type: 'Update', pinned: false, created_date: new Date(Date.now() - 3 * 86400000).toISOString() },
];

const SEED_USERS = [
  { id: 'usr_organizer',  email: 'organizer@agrishow.co.zw',  full_name: 'Demo Organizer',      role: 'organizer',         company: 'ADMA',              status: 'active', created_date: new Date().toISOString() },
  { id: 'usr_partner',    email: 'partner@agrishow.co.zw',    full_name: 'Marketing Partner',   role: 'marketing_partner', company: 'ADMA Media',        status: 'active', created_date: new Date().toISOString() },
  { id: 'usr_exhibitor',  email: 'exhibitor@agrishow.co.zw',  full_name: 'Demo Exhibitor',      role: 'exhibitor',         company: 'Afritractors',      status: 'active', created_date: new Date().toISOString() },
  { id: 'usr_attendee',   email: 'attendee@agrishow.co.zw',   full_name: 'Demo Attendee',       role: 'attendee',          company: '',                  status: 'active', created_date: new Date().toISOString() },
];

async function batchWrite(table, items) {
  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25).map(Item => ({ PutRequest: { Item } }));
    await ddb.send(new BatchWriteCommand({ RequestItems: { [table]: chunk } }));
  }
  console.log(`✓ ${table}: ${items.length} items`);
}

await batchWrite('adma_exhibitors',    SEED_EXHIBITORS);
await batchWrite('adma_sponsors',      SEED_SPONSORS);
await batchWrite('adma_announcements', SEED_ANNOUNCEMENTS);
await batchWrite('adma_users',         SEED_USERS);

// Singleton app settings
await ddb.send(new PutCommand({
  TableName: 'adma_app_settings',
  Item: { pk: 'singleton', virtualExhibitionOpen: false },
}));
console.log('✓ adma_app_settings: singleton');

console.log('\nSeed complete.');
