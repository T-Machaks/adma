/**
 * One-time DynamoDB seed script.
 * Run from the server/ directory: node scripts/seed.js
 *
 * Exhibitor names and tier assignments are sourced from the real ADMA 2026
 * site plan and exhibitor logo wall at agrishow.co.zw. Tiers are derived
 * from the plan's zone-anchor stands (Platinum) vs numbered stand colour
 * coding (Gold/Silver/Bronze).
 */
import 'dotenv/config';
import { BatchWriteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';

const SEED_EXHIBITORS = [
  // ── Platinum — Main Pavilion (real zone-anchor stands from the ADMA 2026 site plan) ──
  { id: 'e01', name: 'Afritractors',            tier: 'Platinum', category: 'Machinery',            section: 'Main Pavilion', booth: 'A01', featured: true,  logo_url: '', description: 'Tractor and implement dealer supplying Solis tractors, ploughs and planting equipment across Zimbabwe.' },
  { id: 'e02', name: 'Agricon',                 tier: 'Platinum', category: 'Machinery',            section: 'Main Pavilion', booth: 'A02', featured: true,  logo_url: '', description: 'Comprehensive equipment solutions for farming, earthmoving and agro-processing across Zimbabwe.' },
  { id: 'e03', name: 'Agriforce',               tier: 'Platinum', category: 'Fertilizers & Inputs', section: 'Main Pavilion', booth: 'A03', featured: true,  logo_url: '', description: 'Fertilisers, seed and crop protection inputs for commercial and smallholder farmers.' },
  { id: 'e04', name: 'Amcotts',                 tier: 'Platinum', category: 'Machinery',            section: 'Main Pavilion', booth: 'A04', featured: false, logo_url: '', description: 'Farm machinery and equipment dealer serving Zimbabwe\'s commercial farming sector.' },
  { id: 'e05', name: 'Amtec',                   tier: 'Platinum', category: 'Agri-Tech',            section: 'Main Pavilion', booth: 'A05', featured: false, logo_url: '', description: 'Agricultural technology and precision farming solutions for modern Zimbabwean farms.' },
  { id: 'e06', name: 'Bain',                    tier: 'Platinum', category: 'Machinery',            section: 'Main Pavilion', booth: 'A06', featured: false, logo_url: '', description: 'New Holland tractor and implement dealer supporting commercial and emerging farmers.' },
  { id: 'e07', name: 'Brown Engineering Group', tier: 'Platinum', category: 'Machinery',            section: 'Main Pavilion', booth: 'A07', featured: true,  logo_url: '', description: 'Engineering and fabrication of farm implements, trailers and grain handling equipment.' },
  { id: 'e08', name: 'Centre Pivot Irrigation', tier: 'Platinum', category: 'Irrigation',           section: 'Main Pavilion', booth: 'A08', featured: true,  logo_url: '', description: 'Centre pivot and drip irrigation systems for commercial-scale crop production.' },
  { id: 'e09', name: 'Cloverleaf Motors',       tier: 'Platinum', category: 'Logistics',            section: 'Main Pavilion', booth: 'A09', featured: false, logo_url: '', description: 'Commercial vehicle dealer supplying trucks and utility vehicles for farm and haulage operations.' },
  { id: 'e10', name: 'Croco Motors',            tier: 'Platinum', category: 'Logistics',            section: 'Main Pavilion', booth: 'A10', featured: false, logo_url: '', description: 'Vehicle dealership offering bakkies, trucks and fleet solutions for agribusiness operators.' },
  { id: 'e11', name: 'Driptech',                tier: 'Platinum', category: 'Irrigation',           section: 'Main Pavilion', booth: 'A11', featured: true,  logo_url: '', description: 'Drip irrigation systems and water-efficient technology for horticulture and field crops.' },
  { id: 'e12', name: 'Dulys Agriquip',          tier: 'Platinum', category: 'Machinery',            section: 'Main Pavilion', booth: 'A12', featured: false, logo_url: '', description: 'Agricultural equipment and implement supplier serving commercial farming operations.' },
  { id: 'e13', name: 'Haingate',                tier: 'Platinum', category: 'Services',             section: 'Main Pavilion', booth: 'A13', featured: false, logo_url: '', description: 'Farm inputs and commercial trading house serving Zimbabwe\'s agricultural sector.' },
  { id: 'e14', name: 'Hastt',                   tier: 'Platinum', category: 'Agri-Tech',            section: 'Main Pavilion', booth: 'A14', featured: false, logo_url: '', description: 'Technology-driven health, safety, and compliance management solutions for farming operations.' },
  { id: 'e15', name: 'Kurima',                  tier: 'Platinum', category: 'Machinery',            section: 'Main Pavilion', booth: 'A15', featured: false, logo_url: '', description: 'Farm machinery and equipment supplier with a nationwide branch and service network.' },
  { id: 'e16', name: 'Load Agro Power',         tier: 'Platinum', category: 'Machinery',            section: 'Main Pavilion', booth: 'A16', featured: false, logo_url: '', description: 'Tractors, generators and power equipment for agricultural and industrial applications.' },
  { id: 'e17', name: 'Lozino',                  tier: 'Platinum', category: 'Machinery',            section: 'Main Pavilion', booth: 'A17', featured: false, logo_url: '', description: 'Agricultural machinery and implement dealer supporting commercial farming operations.' },
  { id: 'e18', name: 'Promech',                 tier: 'Platinum', category: 'Machinery',            section: 'Main Pavilion', booth: 'A18', featured: false, logo_url: '', description: 'Processing and mechanisation equipment for farming and agro-industrial operations.' },
  { id: 'e19', name: 'Radzim',                  tier: 'Platinum', category: 'Machinery',            section: 'Main Pavilion', booth: 'A19', featured: false, logo_url: '', description: 'Agricultural machinery, spares and equipment supplier serving Zimbabwean farmers.' },
  { id: 'e20', name: 'Terramera',               tier: 'Platinum', category: 'Fertilizers & Inputs', section: 'Main Pavilion', booth: 'A20', featured: false, logo_url: '', description: 'Crop nutrition and biological input solutions for sustainable farm production.' },
  { id: 'e21', name: 'Petrichor',               tier: 'Platinum', category: 'Irrigation',           section: 'Main Pavilion', booth: 'A20B', featured: false, logo_url: '', description: 'Irrigation and water management solutions for commercial agriculture.' },
  { id: 'e22', name: 'Terraquip',               tier: 'Platinum', category: 'Machinery',            section: 'Main Pavilion', booth: 'A21', featured: false, logo_url: '', description: 'Earthmoving and agricultural equipment supplier for land preparation and construction.' },
  { id: 'e23', name: 'WWI',                     tier: 'Platinum', category: 'Machinery',            section: 'Main Pavilion', booth: 'A22', featured: false, logo_url: '', description: 'Agricultural machinery and industrial equipment supplier serving commercial farms.' },
  { id: 'e24', name: 'Zemco',                   tier: 'Platinum', category: 'Machinery',            section: 'Main Pavilion', booth: 'A23', featured: false, logo_url: '', description: 'Farm equipment and machinery dealer supporting Zimbabwe\'s agricultural mechanisation.' },
  { id: 'e25', name: 'Zimplow',                 tier: 'Platinum', category: 'Machinery',            section: 'Main Pavilion', booth: 'A24', featured: true,  logo_url: '', description: 'Zimbabwean industrial group manufacturing ploughs, cultivators and animal-drawn implements.' },

  // ── Gold — Machinery Hall ────────────────────────────────────────────────
  { id: 'e26', name: 'Farmec',                  tier: 'Gold', category: 'Machinery',            section: 'Machinery Hall', booth: 'B01', featured: false, logo_url: '', description: 'Massey Ferguson tractor and combine harvester dealer for commercial farming operations.' },
  { id: 'e27', name: 'Blackwood Hodge',         tier: 'Gold', category: 'Machinery',            section: 'Machinery Hall', booth: 'B02', featured: false, logo_url: '', description: 'Heavy equipment and machinery dealer serving farming, mining and construction sectors.' },
  { id: 'e28', name: 'Tselentis Group',         tier: 'Gold', category: 'Machinery',            section: 'Machinery Hall', booth: 'B03', featured: false, logo_url: '', description: 'Import and distribution of heavy equipment, spare parts and industrial machinery.' },
  { id: 'e29', name: 'Kanu Equipment',          tier: 'Gold', category: 'Machinery',            section: 'Machinery Hall', booth: 'B04', featured: false, logo_url: '', description: 'Construction and agricultural equipment dealer offering a comprehensive machinery range.' },
  { id: 'e30', name: 'Seedco',                  tier: 'Gold', category: 'Fertilizers & Inputs',  section: 'Machinery Hall', booth: 'B05', featured: false, logo_url: '', description: 'Leading seed breeder and supplier of certified maize, soya and small grain seed varieties.' },
  { id: 'e31', name: 'Omnia',                   tier: 'Gold', category: 'Fertilizers & Inputs',  section: 'Machinery Hall', booth: 'B06', featured: false, logo_url: '', description: 'Fertiliser blending and crop nutrition solutions for commercial agriculture.' },
  { id: 'e32', name: 'ETG Inputs',              tier: 'Gold', category: 'Fertilizers & Inputs',  section: 'Machinery Hall', booth: 'B07', featured: false, logo_url: '', description: 'Agricultural inputs distributor supplying seed, fertiliser and crop protection products.' },
  { id: 'e33', name: 'Windmill',                tier: 'Gold', category: 'Fertilizers & Inputs',  section: 'Machinery Hall', booth: 'B08', featured: false, logo_url: '', description: 'Fertiliser and agro-chemical manufacturer supplying inputs to farmers nationwide.' },
  { id: 'e34', name: 'ZFC',                     tier: 'Gold', category: 'Fertilizers & Inputs',  section: 'Machinery Hall', booth: 'B09', featured: false, logo_url: '', description: 'Zimbabwe Fertilizer Company — manufacturer of compound and straight fertilisers.' },
  { id: 'e35', name: 'National Foods Stockfeeds', tier: 'Gold', category: 'Livestock',           section: 'Machinery Hall', booth: 'B10', featured: false, logo_url: '', description: 'Stock feed manufacturer supplying dairy, beef, poultry and pig rations nationwide.' },
  { id: 'e36', name: 'Hyperfeeds',              tier: 'Gold', category: 'Livestock',            section: 'Machinery Hall', booth: 'B11', featured: false, logo_url: '', description: 'Animal nutrition specialist producing balanced feeds for livestock and poultry.' },
  { id: 'e37', name: 'Feedmix',                 tier: 'Gold', category: 'Livestock',            section: 'Machinery Hall', booth: 'B12', featured: false, logo_url: '', description: 'Livestock and poultry feed manufacturer serving commercial and smallholder farmers.' },
  { id: 'e38', name: 'CBZ Agro-Yield',          tier: 'Gold', category: 'Finance',              section: 'Machinery Hall', booth: 'B13', featured: false, logo_url: '', description: 'Agricultural finance and input support products from CBZ Holdings for growing farm businesses.' },
  { id: 'e39', name: 'Stanbic',                 tier: 'Gold', category: 'Finance',              section: 'Machinery Hall', booth: 'B14', featured: false, logo_url: '', description: 'Banking and agri-finance solutions supporting commercial and emerging farmers.' },
  { id: 'e40', name: 'Banc ABC',                tier: 'Gold', category: 'Finance',              section: 'Machinery Hall', booth: 'B15', featured: false, logo_url: '', description: 'Commercial banking services with tailored finance products for agribusiness.' },
  { id: 'e41', name: 'NMB',                     tier: 'Gold', category: 'Finance',              section: 'Machinery Hall', booth: 'B16', featured: false, logo_url: '', description: 'Banking and asset finance solutions for farm equipment and working capital.' },
  { id: 'e42', name: 'First Capital Bank',      tier: 'Gold', category: 'Finance',              section: 'Machinery Hall', booth: 'B17', featured: false, logo_url: '', description: 'Retail and business banking with financing options for agricultural enterprises.' },
  { id: 'e43', name: 'CABS',                    tier: 'Gold', category: 'Finance',              section: 'Machinery Hall', booth: 'B18', featured: false, logo_url: '', description: 'Building society offering savings, mortgages and business finance products.' },
  { id: 'e44', name: 'POSB',                    tier: 'Gold', category: 'Finance',              section: 'Machinery Hall', booth: 'B19', featured: false, logo_url: '', description: 'People\'s Own Savings Bank — retail banking and savings products nationwide.' },
  { id: 'e45', name: 'Total Energies',          tier: 'Gold', category: 'Services',             section: 'Machinery Hall', booth: 'B20', featured: false, logo_url: '', description: 'Fuel, lubricants and energy solutions for farming and transport fleets.' },
  { id: 'e46', name: 'Puma Energy',             tier: 'Gold', category: 'Services',             section: 'Machinery Hall', booth: 'B21', featured: false, logo_url: '', description: 'Fuel supply and bulk storage solutions for commercial and farming operations.' },
  { id: 'e47', name: 'Glow Petroleum',          tier: 'Gold', category: 'Services',             section: 'Machinery Hall', booth: 'B22', featured: false, logo_url: '', description: 'Petroleum products, lubricants and fuel supply for agricultural fleets.' },
  { id: 'e48', name: 'Autoworld',               tier: 'Gold', category: 'Logistics',            section: 'Machinery Hall', booth: 'B23', featured: false, logo_url: '', description: 'Commercial vehicle and 4x4 dealer offering fleet solutions for farm and business use.' },
  { id: 'e49', name: 'Asia Auto',               tier: 'Gold', category: 'Logistics',            section: 'Machinery Hall', booth: 'B24', featured: false, logo_url: '', description: 'Vehicle dealership supplying pickups and light commercial vehicles.' },
  { id: 'e50', name: 'Mike Harris Toyota',      tier: 'Gold', category: 'Logistics',            section: 'Machinery Hall', booth: 'B25', featured: false, logo_url: '', description: 'Official Toyota dealer offering double cabs and commercial vehicles for farm use.' },
  { id: 'e51', name: 'Zimoco',                  tier: 'Gold', category: 'Logistics',            section: 'Machinery Hall', booth: 'B26', featured: false, logo_url: '', description: 'Zimbabwe Motor Corporation — distributor of Mercedes-Benz trucks and commercial vehicles.' },
  { id: 'e52', name: 'Unifreight',              tier: 'Gold', category: 'Logistics',            section: 'Machinery Hall', booth: 'B27', featured: false, logo_url: '', description: 'Freight, haulage and logistics services for agricultural produce and inputs.' },
  { id: 'e53', name: 'Transerv',                tier: 'Gold', category: 'Logistics',            section: 'Machinery Hall', booth: 'B28', featured: false, logo_url: '', description: 'Transport and vehicle servicing solutions for commercial farming fleets.' },
  { id: 'e54', name: 'TSL',                     tier: 'Gold', category: 'Logistics',            section: 'Machinery Hall', booth: 'B29', featured: false, logo_url: '', description: 'Agricultural marketing, trading and logistics group serving Zimbabwean farmers.' },
  { id: 'e55', name: 'Steel Warehouse',         tier: 'Gold', category: 'Services',             section: 'Machinery Hall', booth: 'B30', featured: false, logo_url: '', description: 'Steel and metal products supplier for farm structures and fabrication.' },
  { id: 'e56', name: 'BSI Steel',               tier: 'Gold', category: 'Services',             section: 'Machinery Hall', booth: 'B31', featured: false, logo_url: '', description: 'Steel products and building materials supplier for agricultural infrastructure.' },
  { id: 'e57', name: 'Fawcett Security',        tier: 'Gold', category: 'Security',             section: 'Machinery Hall', booth: 'B32', featured: false, logo_url: '', description: 'Farm and rural security services including guarding and alarm response.' },
  { id: 'e58', name: 'Ezytrack',                tier: 'Gold', category: 'Agri-Tech',            section: 'Machinery Hall', booth: 'B33', featured: false, logo_url: '', description: 'GPS fleet tracking and asset management solutions for farm vehicles and equipment.' },
  { id: 'e59', name: 'African Drone Kings',     tier: 'Gold', category: 'Agri-Tech',            section: 'Machinery Hall', booth: 'B34', featured: false, logo_url: '', description: 'Drone spraying, crop mapping and aerial survey services for commercial farms.' },
  { id: 'e60', name: 'Solar Energy Projects',   tier: 'Gold', category: 'Irrigation',           section: 'Machinery Hall', booth: 'B35', featured: false, logo_url: '', description: 'Solar-powered irrigation and off-grid energy installations for farms.' },

  // ── Silver — Suppliers Village ───────────────────────────────────────────
  { id: 'e61', name: 'Cropserve',               tier: 'Silver', category: 'Services',             section: 'Suppliers Village', booth: 'C01', featured: false, logo_url: '', description: 'Agronomy advisory and extension services for commercial and emerging farmers.' },
  { id: 'e62', name: 'Cutting Edge',            tier: 'Silver', category: 'Machinery',            section: 'Suppliers Village', booth: 'C02', featured: false, logo_url: '', description: 'Cutting tools, blades and abrasives for farm workshops and fabrication.' },
  { id: 'e63', name: 'Cochrane Pumps',          tier: 'Silver', category: 'Irrigation',           section: 'Suppliers Village', booth: 'C03', featured: false, logo_url: '', description: 'Industrial and irrigation pumps with dewatering and maintenance services.' },
  { id: 'e64', name: 'Waterwright',             tier: 'Silver', category: 'Irrigation',           section: 'Suppliers Village', booth: 'C04', featured: false, logo_url: '', description: 'Borehole drilling and water reticulation solutions for farms.' },
  { id: 'e65', name: 'Speroni Irrigation',      tier: 'Silver', category: 'Irrigation',           section: 'Suppliers Village', booth: 'C05', featured: false, logo_url: '', description: 'Irrigation pumps and sprinkler systems for horticulture and field crops.' },
  { id: 'e66', name: 'Four Seasons Irrigation', tier: 'Silver', category: 'Irrigation',           section: 'Suppliers Village', booth: 'C06', featured: false, logo_url: '', description: 'Irrigation equipment supplier offering drip and sprinkler solutions.' },
  { id: 'e67', name: 'National Propshaft Centre', tier: 'Silver', category: 'Machinery',          section: 'Suppliers Village', booth: 'C07', featured: false, logo_url: '', description: 'Driveline specialists offering propshaft repair and reconditioning for farm vehicles.' },
  { id: 'e68', name: 'R&S Diesel Pro',          tier: 'Silver', category: 'Machinery',            section: 'Suppliers Village', booth: 'C08', featured: false, logo_url: '', description: 'Diesel engine service, repair and parts supply for tractors and farm equipment.' },
  { id: 'e69', name: 'SKM',                     tier: 'Silver', category: 'Logistics',            section: 'Suppliers Village', booth: 'C09', featured: false, logo_url: '', description: 'Motorcycles and light transport solutions for farm mobility and rural access.' },
  { id: 'e70', name: 'Haojue Motorcycles',      tier: 'Silver', category: 'Logistics',            section: 'Suppliers Village', booth: 'C10', featured: false, logo_url: '', description: 'Motorcycle dealer supplying affordable rural transport for farming communities.' },
  { id: 'e71', name: 'Nicnel',                  tier: 'Silver', category: 'Services',             section: 'Suppliers Village', booth: 'C11', featured: false, logo_url: '', description: 'Engineering and technical support services for farm plant and equipment maintenance.' },
  { id: 'e72', name: 'Prime Agro',              tier: 'Silver', category: 'Fertilizers & Inputs', section: 'Suppliers Village', booth: 'C12', featured: false, logo_url: '', description: 'Agricultural inputs and crop protection products for commercial farms.' },
  { id: 'e73', name: 'Selected Seeds',          tier: 'Silver', category: 'Fertilizers & Inputs', section: 'Suppliers Village', booth: 'C13', featured: false, logo_url: '', description: 'Certified seed varieties for maize, soya and horticultural crops.' },
  { id: 'e74', name: 'Klein Karoo',             tier: 'Silver', category: 'Fertilizers & Inputs', section: 'Suppliers Village', booth: 'C14', featured: false, logo_url: '', description: 'Seed production and supply for vegetable and field crop growers.' },
  { id: 'e75', name: 'National Tested Seeds',   tier: 'Silver', category: 'Fertilizers & Inputs', section: 'Suppliers Village', booth: 'C15', featured: false, logo_url: '', description: 'Certified maize and small grain seed varieties bred for local conditions.' },
  { id: 'e76', name: 'Agriseeds',               tier: 'Silver', category: 'Fertilizers & Inputs', section: 'Suppliers Village', booth: 'C16', featured: false, logo_url: '', description: 'Seed supplier offering a range of maize, soya and vegetable varieties.' },
  { id: 'e77', name: 'Tiger Agrochem',          tier: 'Silver', category: 'Fertilizers & Inputs', section: 'Suppliers Village', booth: 'C17', featured: false, logo_url: '', description: 'Crop protection chemicals and agrochemical solutions for pest and disease control.' },
  { id: 'e78', name: 'Chemplex Agro Pharma',    tier: 'Silver', category: 'Fertilizers & Inputs', section: 'Suppliers Village', booth: 'C18', featured: false, logo_url: '', description: 'Agrochemicals and animal health pharmaceuticals for farming operations.' },
  { id: 'e79', name: 'Hi-Bred Chicks',          tier: 'Silver', category: 'Livestock',            section: 'Suppliers Village', booth: 'C19', featured: false, logo_url: '', description: 'Day-old chicks and poultry breeding stock for commercial and small-scale producers.' },
  { id: 'e80', name: 'Masvingo Chicks',         tier: 'Silver', category: 'Livestock',            section: 'Suppliers Village', booth: 'C20', featured: false, logo_url: '', description: 'Poultry hatchery supplying day-old chicks to farmers across the region.' },
  { id: 'e81', name: 'Global Animal Feeds',     tier: 'Silver', category: 'Livestock',            section: 'Suppliers Village', booth: 'C21', featured: false, logo_url: '', description: 'Livestock feed manufacturer supplying balanced rations for dairy and beef cattle.' },
  { id: 'e82', name: 'Supreme Feed',            tier: 'Silver', category: 'Livestock',            section: 'Suppliers Village', booth: 'C22', featured: false, logo_url: '', description: 'Animal feed producer supplying poultry, pig and cattle rations.' },
  { id: 'e83', name: 'Fivet',                   tier: 'Silver', category: 'Livestock',            section: 'Suppliers Village', booth: 'C23', featured: false, logo_url: '', description: 'Veterinary products and animal health solutions for livestock farmers.' },
  { id: 'e84', name: 'Corporate 24',            tier: 'Silver', category: 'Finance',              section: 'Suppliers Village', booth: 'C24', featured: false, logo_url: '', description: 'Medical aid and healthcare cover for farming families and employees.' },
  { id: 'e85', name: 'Bright Insurance Brokers', tier: 'Silver', category: 'Finance',             section: 'Suppliers Village', booth: 'C25', featured: false, logo_url: '', description: 'Insurance brokerage offering crop, asset and liability cover for farm businesses.' },

  // ── Bronze — Field Zone ──────────────────────────────────────────────────
  { id: 'e86', name: 'Trade Kings',             tier: 'Bronze', category: 'Services',             section: 'Field Zone', booth: 'D01', featured: false, logo_url: '', description: 'Trade supply of hardware, fasteners and construction consumables.' },
  { id: 'e87', name: 'Filter Shop',             tier: 'Bronze', category: 'Machinery',            section: 'Field Zone', booth: 'D02', featured: false, logo_url: '', description: 'Oil, air and fuel filters for tractors, trucks and farm machinery.' },
  { id: 'e88', name: 'Mikes Radiators',         tier: 'Bronze', category: 'Machinery',            section: 'Field Zone', booth: 'D03', featured: false, logo_url: '', description: 'Radiator repair, servicing and cooling system parts for farm vehicles.' },
  { id: 'e89', name: 'Recruitment Matters',     tier: 'Bronze', category: 'Services',             section: 'Field Zone', booth: 'D04', featured: false, logo_url: '', description: 'Recruitment and staffing services for agricultural and agribusiness employers.' },
  { id: 'e90', name: 'Union Hardware',          tier: 'Bronze', category: 'Services',             section: 'Field Zone', booth: 'D05', featured: false, logo_url: '', description: 'Hardware, tools and building materials retail and wholesale supply.' },
  { id: 'e91', name: 'Poly Packaging',          tier: 'Bronze', category: 'Services',             section: 'Field Zone', booth: 'D06', featured: false, logo_url: '', description: 'Packaging solutions including bags and containers for agricultural produce.' },
  { id: 'e92', name: 'Concrete Flooring Solutions', tier: 'Bronze', category: 'Services',         section: 'Field Zone', booth: 'D07', featured: false, logo_url: '', description: 'Concrete flooring and construction services for farm buildings and storage.' },
  { id: 'e93', name: 'Woodlot Timbers',         tier: 'Bronze', category: 'Services',             section: 'Field Zone', booth: 'D08', featured: false, logo_url: '', description: 'Timber supply for construction, fencing and farm infrastructure.' },
  { id: 'e94', name: 'Khaya Cement',            tier: 'Bronze', category: 'Services',             section: 'Field Zone', booth: 'D09', featured: false, logo_url: '', description: 'Cement manufacturer supplying building materials for farm construction.' },
  { id: 'e95', name: 'Farm and City Centre',    tier: 'Bronze', category: 'Services',             section: 'Field Zone', booth: 'D10', featured: false, logo_url: '', description: 'General farm and hardware retailer stocking tools and rural supplies.' },
  { id: 'e96', name: 'Urban Farmer',            tier: 'Bronze', category: 'Fertilizers & Inputs',  section: 'Field Zone', booth: 'D11', featured: false, logo_url: '', description: 'Gardening and small-scale farming inputs for urban and peri-urban growers.' },
  { id: 'e97', name: 'Natural Air',             tier: 'Bronze', category: 'Services',             section: 'Field Zone', booth: 'D12', featured: false, logo_url: '', description: 'Ventilation and cooling systems for poultry houses and farm buildings.' },
  { id: 'e98', name: 'Guard Alert',             tier: 'Bronze', category: 'Security',             section: 'Field Zone', booth: 'D13', featured: false, logo_url: '', description: 'Alarm monitoring and rapid-response security services for rural properties.' },
  { id: 'e99', name: 'Chisafety',               tier: 'Bronze', category: 'Security',             section: 'Field Zone', booth: 'D14', featured: false, logo_url: '', description: 'Safety equipment, welding supplies and protective gear for farm workshops.' },
  { id: 'e100', name: 'Sky Helicopters',        tier: 'Bronze', category: 'Logistics',            section: 'Field Zone', booth: 'D15', featured: false, logo_url: '', description: 'Aerial crop spraying and helicopter charter services for large-scale farms.' },
];

const SEED_SPONSORS = [
  { id: 's1', name: 'Afritractors',            tier: 'Platinum', description: 'Zimbabwe\'s leading tractor and implement dealer. Proud Platinum sponsor of ADMA Agri Show 2026.', website: 'https://www.afritractors.co.zw', logo_url: '', featured: true  },
  { id: 's2', name: 'Agricon',                 tier: 'Platinum', description: 'Comprehensive farm equipment solutions supporting Zimbabwean agriculture.',                        website: 'https://www.agricon.co.zw',      logo_url: '', featured: true  },
  { id: 's3', name: 'Centre Pivot Irrigation', tier: 'Platinum', description: 'Centre pivot and drip irrigation systems for commercial-scale crop production.',                   website: '',                                logo_url: '', featured: true  },
  { id: 's4', name: 'Zimplow',                 tier: 'Platinum', description: 'Diversified Zimbabwean industrial group manufacturing implements for agriculture.',                website: 'https://www.zimplow.co.zw',      logo_url: '', featured: false },
  { id: 's5', name: 'Farmec',                  tier: 'Gold',     description: 'Massey Ferguson tractor and combine harvester dealer for commercial farming operations.',          website: '',                                logo_url: '', featured: false },
  { id: 's6', name: 'Seedco',                  tier: 'Gold',     description: 'Leading seed breeder and supplier of certified maize, soya and small grain seed varieties.',         website: '',                                logo_url: '', featured: false },
  { id: 's7', name: 'CBZ Agro-Yield',          tier: 'Gold',     description: 'Agricultural finance and input support products for growing farm businesses.',                     website: '',                                logo_url: '', featured: false },
  { id: 's8', name: 'Windmill',                tier: 'Silver',   description: 'Fertiliser and agro-chemical manufacturer supplying inputs nationwide.',                            website: '',                                logo_url: '', featured: false },
  { id: 's9', name: 'Cochrane Pumps',          tier: 'Silver',   description: 'Industrial and irrigation pumps with dewatering and maintenance services.',                         website: '',                                logo_url: '', featured: false },
  { id: 's10', name: 'Fawcett Security',       tier: 'Bronze',   description: 'Farm and rural security services including guarding and alarm response.',                          website: '',                                logo_url: '', featured: false },
  { id: 's11', name: 'Ezytrack',               tier: 'Bronze',   description: 'GPS fleet tracking and asset management solutions for farm vehicles and equipment.',                website: '',                                logo_url: '', featured: false },
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
