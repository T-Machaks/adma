// MineCon 2025 exhibitor data — seeded into localStorage on first app load.
// Logos are served directly from minecon.global (public CDN).

const BASE = 'https://minecon.global/wp-content/uploads/2025';

export const SEED_EXHIBITORS = [
  // ── DIAMOND ─────────────────────────────────────────────────────────────
  { id: 'e01', name: 'Steel Warehouse Holdings',    tier: 'Diamond', category: 'Suppliers',  section: 'Main Hall',       booth: 'A01', featured: true,  logo_url: `${BASE}/08/STEEL-WAREHOUSE.png`,          description: 'The leading steel and metal products supplier to mining and construction projects across Zimbabwe and the region.' },
  { id: 'e02', name: 'Isuzu Zimbabwe',              tier: 'Diamond', category: 'Equipment',  section: 'Main Hall',       booth: 'A02', featured: true,  logo_url: `${BASE}/08/ISUZU.png`,                    description: 'Official Isuzu commercial vehicle dealer for Zimbabwe. Trucks, pickups and fleet solutions for the mining and construction sector.' },
  { id: 'e03', name: 'Viking',                      tier: 'Diamond', category: 'Equipment',  section: 'Main Hall',       booth: 'A03', featured: true,  logo_url: `${BASE}/08/VIKING.png`,                   description: 'Specialist supplier of power tools, hand tools, and industrial equipment for mining and construction professionals.' },
  { id: 'e04', name: 'Agricon Equipment',           tier: 'Diamond', category: 'Equipment',  section: 'Main Hall',       booth: 'A04', featured: true,  logo_url: `${BASE}/08/AGRICON.png`,                  description: 'Comprehensive equipment solutions for mining, earthmoving, agriculture, and construction across Zimbabwe.' },
  { id: 'e05', name: 'ICC',                         tier: 'Diamond', category: 'Services',   section: 'Main Hall',       booth: 'A05', featured: true,  logo_url: `${BASE}/08/ICC.png`,                      description: 'Industrial and commercial contractors providing integrated project management and engineering services.' },
  { id: 'e06', name: 'Redan',                       tier: 'Diamond', category: 'Suppliers',  section: 'Main Hall',       booth: 'A06', featured: true,  logo_url: `${BASE}/08/REDAN.png`,                    description: 'Distributor of industrial consumables, safety equipment, and PPE for the mining and construction industry.' },
  { id: 'e07', name: 'SANY Group',                  tier: 'Diamond', category: 'Equipment',  section: 'Main Hall',       booth: 'A07', featured: true,  logo_url: `${BASE}/08/SANY.png`,                     description: 'Global leader in construction and mining equipment. Excavators, cranes, concrete machinery, and road equipment.' },
  { id: 'e08', name: 'R&S Diesel Professionals',    tier: 'Diamond', category: 'Services',   section: 'Main Hall',       booth: 'A08', featured: true,  logo_url: `${BASE}/08/RS-DIESEL.png`,                description: 'Specialist diesel engine service, repair, and parts supply for heavy plant and mining fleet operations.' },
  { id: 'e09', name: 'National Propshaft Centre',   tier: 'Diamond', category: 'Services',   section: 'Main Hall',       booth: 'A09', featured: false, logo_url: `${BASE}/08/NATIONAL-PROPSHAFT-CENTRE.png`, description: 'Driveline specialists offering propshaft repair, reconditioning and supply for commercial and industrial vehicles.' },
  { id: 'e10', name: 'Nicnel',                      tier: 'Diamond', category: 'Services',   section: 'Main Hall',       booth: 'A10', featured: false, logo_url: `${BASE}/08/NICNEL.png`,                   description: 'Engineering and technical services provider supporting mining operations and industrial plant maintenance.' },
  { id: 'e11', name: 'AM Mach',                     tier: 'Diamond', category: 'Equipment',  section: 'Main Hall',       booth: 'A11', featured: false, logo_url: `${BASE}/09/am-mach-2.png`,                description: 'Heavy machinery importers and dealers. Excavators, bulldozers, graders, and mining equipment solutions.' },
  { id: 'e12', name: 'Better Brands',               tier: 'Diamond', category: 'Suppliers',  section: 'Main Hall',       booth: 'A12', featured: false, logo_url: `${BASE}/09/BETTERBRANDS.png`,             description: 'Branded industrial and consumer products for the mining, construction and agricultural sectors.' },
  { id: 'e13', name: 'Zimplow Holdings',            tier: 'Diamond', category: 'Equipment',  section: 'Main Hall',       booth: 'A13', featured: true,  logo_url: `${BASE}/08/ZINMPLOW.png`,                 description: 'Diversified Zimbabwean industrial group manufacturing equipment for mining, agriculture and construction.' },
  { id: 'e14', name: 'Great Dyke',                  tier: 'Diamond', category: 'Solutions',  section: 'Main Hall',       booth: 'A14', featured: false, logo_url: `${BASE}/09/GREATDYKE.png`,                description: 'Mining investment and exploration company operating across Zimbabwe\'s Great Dyke mineral belt.' },
  { id: 'e15', name: 'Tsapo',                       tier: 'Diamond', category: 'Solutions',  section: 'Main Hall',       booth: 'A15', featured: false, logo_url: `${BASE}/09/TSAPO.png`,                    description: 'Specialist mining contracting and project development company operating in Sub-Saharan Africa.' },
  { id: 'e16', name: 'LiuGong Zimbabwe',            tier: 'Diamond', category: 'Equipment',  section: 'Main Hall',       booth: 'A16', featured: true,  logo_url: `${BASE}/09/LIUGONG.png`,                  description: 'Official LiuGong heavy equipment distributor for Zimbabwe. Wheel loaders, excavators, forklifts and more.' },

  // ── GOLD ────────────────────────────────────────────────────────────────
  { id: 'e17', name: 'Electrosales Zimbabwe',       tier: 'Gold',    category: 'Solutions',  section: 'Exhibition Hall', booth: 'B01', featured: false, logo_url: `${BASE}/09/ELECTROSALES.png`,             description: 'Electrical systems, lighting, and power solutions for mining sites and industrial operations.' },
  { id: 'e18', name: 'Tselentis Group',             tier: 'Gold',    category: 'Equipment',  section: 'Exhibition Hall', booth: 'B02', featured: false, logo_url: `${BASE}/08/TSELENTIS-GROUP.png`,          description: 'Import and distribution of heavy equipment, spare parts, and industrial machinery.' },
  { id: 'e19', name: 'Steel Building Company',      tier: 'Gold',    category: 'Suppliers',  section: 'Exhibition Hall', booth: 'B03', featured: false, logo_url: `${BASE}/08/STEEL-BUILDING-COMPANY.png`,   description: 'Pre-engineered steel structures and buildings for mining, warehousing, and industrial applications.' },
  { id: 'e20', name: 'E4 Engineering',              tier: 'Gold',    category: 'Services',   section: 'Exhibition Hall', booth: 'B04', featured: false, logo_url: `${BASE}/08/E4-ENGINEERING.png`,           description: 'Structural and civil engineering consultants specialising in mining infrastructure and industrial projects.' },
  { id: 'e21', name: 'Pomona Bricks',               tier: 'Gold',    category: 'Suppliers',  section: 'Exhibition Hall', booth: 'B05', featured: false, logo_url: `${BASE}/08/POMONA-BRICKS.png`,            description: 'Quality brick and masonry product manufacturer for residential, commercial, and industrial construction.' },
  { id: 'e22', name: 'Ledtronics',                  tier: 'Gold',    category: 'Solutions',  section: 'Exhibition Hall', booth: 'B06', featured: false, logo_url: `${BASE}/08/LEDTRONICS.png`,               description: 'Industrial and commercial LED lighting solutions optimised for mining, warehouse, and outdoor environments.' },
  { id: 'e23', name: 'Auto Torque',                 tier: 'Gold',    category: 'Services',   section: 'Exhibition Hall', booth: 'B07', featured: false, logo_url: `${BASE}/08/AUTO-TORQUE.png`,              description: 'Automotive and heavy vehicle servicing, parts, and fleet management solutions for mining operations.' },
  { id: 'e24', name: 'Kanu Equipment',              tier: 'Gold',    category: 'Equipment',  section: 'Exhibition Hall', booth: 'B08', featured: false, logo_url: `${BASE}/08/KANU-EQUIPMENT.png`,           description: 'Construction and mining equipment dealer offering a comprehensive range of machinery and support services.' },
  { id: 'e25', name: 'FuelTech',                    tier: 'Gold',    category: 'Suppliers',  section: 'Exhibition Hall', booth: 'B09', featured: false, logo_url: `${BASE}/08/FUELTECH.png`,                 description: 'Bulk fuel supply, storage solutions, and fuel management systems for remote mining operations.' },
  { id: 'e26', name: 'Sealachem',                   tier: 'Gold',    category: 'Suppliers',  section: 'Exhibition Hall', booth: 'B10', featured: false, logo_url: `${BASE}/08/SEALACHEM.png`,                description: 'Specialty chemicals and sealants for industrial, mining, and construction applications.' },
  { id: 'e27', name: 'PTS',                         tier: 'Gold',    category: 'Services',   section: 'Exhibition Hall', booth: 'B11', featured: false, logo_url: `${BASE}/08/PTS.png`,                      description: 'Professional technical services including plant maintenance, inspections, and industrial support.' },
  { id: 'e28', name: 'Slab Sales Africa',           tier: 'Gold',    category: 'Suppliers',  section: 'Exhibition Hall', booth: 'B12', featured: false, logo_url: `${BASE}/08/SLAB-SALES-AFRICA.png`,        description: 'Natural stone slabs, granite, marble, and engineered stone for construction and architectural projects.' },
  { id: 'e29', name: 'Starbell Auto',               tier: 'Gold',    category: 'Equipment',  section: 'Exhibition Hall', booth: 'B13', featured: false, logo_url: `${BASE}/08/STARBELL-AUTO.png`,            description: 'Commercial vehicle and light truck dealer with fleet solutions for mining and construction companies.' },
  { id: 'e30', name: 'Intrachem',                   tier: 'Gold',    category: 'Suppliers',  section: 'Exhibition Hall', booth: 'B14', featured: false, logo_url: `${BASE}/08/INTRACHEM.png`,                description: 'Chemical products and reagents for mining processes, water treatment, and industrial applications.' },
  { id: 'e31', name: 'FBM Haulage',                 tier: 'Gold',    category: 'Services',   section: 'Exhibition Hall', booth: 'B15', featured: false, logo_url: `${BASE}/08/FBM-HAULAGE.png`,              description: 'Heavy haulage and bulk transport specialists serving the mining and construction sectors.' },
  { id: 'e32', name: 'Tandamanzi',                  tier: 'Gold',    category: 'Solutions',  section: 'Exhibition Hall', booth: 'B16', featured: false, logo_url: `${BASE}/08/TANDAMANZI.png`,               description: 'Wildlife management and eco-tourism solutions alongside land development services.' },
  { id: 'e33', name: 'Zimdam',                      tier: 'Gold',    category: 'Services',   section: 'Exhibition Hall', booth: 'B17', featured: false, logo_url: `${BASE}/09/ZIMDAM.png`,                   description: 'Dam construction, water infrastructure, and civil engineering for mining and agricultural projects.' },
  { id: 'e34', name: 'Primus',                      tier: 'Gold',    category: 'Suppliers',  section: 'Exhibition Hall', booth: 'B18', featured: false, logo_url: `${BASE}/09/PRIMUS-1.png`,                 description: 'Industrial and construction supply company providing a broad range of materials and consumables.' },
  { id: 'e35', name: 'Zimoco',                      tier: 'Gold',    category: 'Equipment',  section: 'Exhibition Hall', booth: 'B19', featured: false, logo_url: `${BASE}/09/ZIMOCO.png`,                   description: 'Zimbabwe Motor Corporation — official distributor of Mercedes-Benz trucks and commercial vehicles.' },
  { id: 'e36', name: 'Solar Agro Systems',          tier: 'Gold',    category: 'Solutions',  section: 'Exhibition Hall', booth: 'B20', featured: false, logo_url: `${BASE}/09/SOLAR-AGRO-SYSTEMS.png`,       description: 'Solar-powered water pumping and irrigation systems for agriculture and off-grid mining operations.' },
  { id: 'e37', name: 'Stanserv',                    tier: 'Gold',    category: 'Services',   section: 'Exhibition Hall', booth: 'B21', featured: false, logo_url: `${BASE}/09/STANSERV.png`,                 description: 'Standards and compliance services, calibration, and industrial testing for mining operations.' },
  { id: 'e38', name: 'Winfield',                    tier: 'Gold',    category: 'Services',   section: 'Exhibition Hall', booth: 'B22', featured: false, logo_url: `${BASE}/09/WINFIELD.png`,                 description: 'Electrical contracting and industrial electrical services for mining infrastructure.' },
  { id: 'e39', name: 'EcoCash',                     tier: 'Gold',    category: 'Solutions',  section: 'Exhibition Hall', booth: 'B23', featured: false, logo_url: `${BASE}/09/ECOCASH.png`,                  description: 'Zimbabwe\'s leading mobile money and digital payments platform powering business transactions on-site.' },
  { id: 'e40', name: 'Solar Energy Projects',       tier: 'Gold',    category: 'Solutions',  section: 'Exhibition Hall', booth: 'B24', featured: false, logo_url: `${BASE}/09/SOLAR-ENERGY-PROJECTS.png`,    description: 'Commercial and industrial solar installations reducing energy costs for mining and manufacturing.' },
  { id: 'e41', name: 'Zimdam',                      tier: 'Gold',    category: 'Services',   section: 'Exhibition Hall', booth: 'B25', featured: false, logo_url: `${BASE}/09/ZIMDAM.png`,                   description: 'Infrastructure and water management engineering for mining and industrial projects.' },
  { id: 'e42', name: 'Hastt',                       tier: 'Gold',    category: 'Solutions',  section: 'Exhibition Hall', booth: 'B26', featured: false, logo_url: `${BASE}/09/HASTT.png`,                    description: 'Technology-driven health, safety, and compliance management solutions for mining sites.' },
  { id: 'e43', name: 'Swift',                       tier: 'Gold',    category: 'Services',   section: 'Exhibition Hall', booth: 'B27', featured: false, logo_url: `${BASE}/10/SWIFT.png`,                    description: 'Logistics and courier services with specialist mining and industrial cargo handling.' },

  // ── CHROME ──────────────────────────────────────────────────────────────
  { id: 'e44', name: 'EzyTrack',                    tier: 'Chrome',  category: 'Solutions',  section: 'Suppliers Zone',  booth: 'C01', featured: false, logo_url: `${BASE}/08/ezytrackpng.png`,              description: 'GPS fleet tracking and asset management solutions for mining vehicles and equipment.' },
  { id: 'e45', name: 'Design Element Studios',      tier: 'Chrome',  category: 'Services',   section: 'Suppliers Zone',  booth: 'C02', featured: false, logo_url: `${BASE}/08/DESIGN-ELEMENT-STUDIOS.png`,   description: 'Creative agency specialising in exhibition design, branding, and event graphics.' },
  { id: 'e46', name: 'Penanel',                     tier: 'Chrome',  category: 'Solutions',  section: 'Suppliers Zone',  booth: 'C03', featured: false, logo_url: `${BASE}/08/PENANEL.png`,                  description: 'Panel systems, partitioning, and modular building solutions for site offices and industrial spaces.' },
  { id: 'e47', name: 'Cutting Edge',                tier: 'Chrome',  category: 'Equipment',  section: 'Suppliers Zone',  booth: 'C04', featured: false, logo_url: `${BASE}/08/CUTTING-EDGE.png`,             description: 'Cutting tools, blades, and abrasive products for industrial and mining fabrication applications.' },
  { id: 'e48', name: 'Ice Age',                     tier: 'Chrome',  category: 'Services',   section: 'Suppliers Zone',  booth: 'C05', featured: false, logo_url: `${BASE}/08/ICE-AGE.png`,                  description: 'Industrial refrigeration and cold storage solutions for mining camps and food service operations.' },
  { id: 'e49', name: 'Shumba Packs',                tier: 'Chrome',  category: 'Suppliers',  section: 'Suppliers Zone',  booth: 'C06', featured: false, logo_url: `${BASE}/08/SHUMBA-PACKS.png`,             description: 'Industrial packaging, bags, and bulk containment products for mining and agricultural use.' },
  { id: 'e50', name: 'TradeKings',                  tier: 'Chrome',  category: 'Suppliers',  section: 'Suppliers Zone',  booth: 'C07', featured: false, logo_url: `${BASE}/09/TRADEKINGS.png`,               description: 'Trade supply of hardware, fasteners, and construction consumables.' },
  { id: 'e51', name: 'FDCA',                        tier: 'Chrome',  category: 'Services',   section: 'Suppliers Zone',  booth: 'C08', featured: false, logo_url: `${BASE}/09/FDCA.png`,                     description: 'Fire detection, suppression, and safety systems for mining and industrial facilities.' },
  { id: 'e52', name: 'Drum City',                   tier: 'Chrome',  category: 'Suppliers',  section: 'Suppliers Zone',  booth: 'C09', featured: false, logo_url: `${BASE}/09/DRUM-CITY.png`,                description: 'Drums, barrels, and bulk fluid containers for fuel, chemicals, and oil storage on site.' },
  { id: 'e53', name: 'Shepco',                      tier: 'Chrome',  category: 'Services',   section: 'Suppliers Zone',  booth: 'C10', featured: false, logo_url: `${BASE}/09/SHEPCO.png`,                   description: 'Site clearing, earthworks, and bulk excavation services for construction and mining projects.' },
  { id: 'e54', name: 'Glow Petroleum',              tier: 'Chrome',  category: 'Suppliers',  section: 'Suppliers Zone',  booth: 'C11', featured: false, logo_url: `${BASE}/09/GLOW-PETROLEUM.png`,           description: 'Petroleum products, lubricants, and fuel supply for mining operations and construction fleets.' },
  { id: 'e55', name: 'Sunflow',                     tier: 'Chrome',  category: 'Solutions',  section: 'Suppliers Zone',  booth: 'C12', featured: false, logo_url: `${BASE}/09/SUNFLOW.png`,                  description: 'Solar water heaters and renewable thermal energy solutions for mining camps and facilities.' },
  { id: 'e56', name: 'Bain Web',                    tier: 'Chrome',  category: 'Solutions',  section: 'Suppliers Zone',  booth: 'C13', featured: false, logo_url: `${BASE}/09/bain-web.png`,                 description: 'Digital marketing, web development, and online presence solutions for mining businesses.' },
  { id: 'e57', name: 'Dzines',                      tier: 'Chrome',  category: 'Services',   section: 'Suppliers Zone',  booth: 'C14', featured: false, logo_url: `${BASE}/09/DZINES.png`,                   description: 'Signage, branding, and visual communications for mining sites, exhibitions, and corporate clients.' },
  { id: 'e58', name: 'CropServe',                   tier: 'Chrome',  category: 'Solutions',  section: 'Suppliers Zone',  booth: 'C15', featured: false, logo_url: `${BASE}/09/CROPSERVE.png`,                description: 'Agricultural inputs and advisory services supporting mining community farming initiatives.' },
  { id: 'e59', name: 'PJM',                         tier: 'Chrome',  category: 'Services',   section: 'Suppliers Zone',  booth: 'C16', featured: false, logo_url: `${BASE}/09/PJM.png`,                      description: 'Project and construction management consultancy for mining and infrastructure developments.' },

  // ── COPPER ──────────────────────────────────────────────────────────────
  { id: 'e60', name: 'ProCAfrica',                  tier: 'Copper',  category: 'Services',   section: 'Solutions Zone',  booth: 'D01', featured: false, logo_url: `${BASE}/08/PROCAFRICA.png`,               description: 'Procurement and supply chain management specialists serving the African mining sector.' },
  { id: 'e61', name: 'SKM Motorcycles',             tier: 'Copper',  category: 'Equipment',  section: 'Solutions Zone',  booth: 'D02', featured: false, logo_url: `${BASE}/08/SKM.png`,                      description: 'Motorcycles and light transport solutions for mine site mobility and rural access.' },
  { id: 'e62', name: 'Fine & Country',              tier: 'Copper',  category: 'Solutions',  section: 'Solutions Zone',  booth: 'D03', featured: false, logo_url: `${BASE}/08/FINE-AND-COUNTRY.png`,         description: 'Premium property sales and investment advisory services for mining executives and investors.' },
  { id: 'e63', name: 'TecSol',                      tier: 'Copper',  category: 'Solutions',  section: 'Solutions Zone',  booth: 'D04', featured: false, logo_url: `${BASE}/08/TECSOL.png`,                   description: 'Technology solutions for automation, data capture, and operational efficiency in mining.' },
  { id: 'e64', name: 'Scout Aerial Africa',         tier: 'Copper',  category: 'Solutions',  section: 'Solutions Zone',  booth: 'D05', featured: false, logo_url: `${BASE}/08/SCOUT-AERIAL.png`,             description: 'Drone surveys, aerial photography, and LiDAR mapping for mining exploration and site monitoring.' },
  { id: 'e65', name: 'Compulink',                   tier: 'Copper',  category: 'Solutions',  section: 'Solutions Zone',  booth: 'D06', featured: false, logo_url: `${BASE}/08/COMPULINK.png`,                description: 'IT infrastructure, networking, and software solutions for mining and industrial clients.' },
  { id: 'e66', name: 'Hollands',                    tier: 'Copper',  category: 'Suppliers',  section: 'Solutions Zone',  booth: 'D07', featured: false, logo_url: `${BASE}/08/HOLLANDS.png`,                 description: 'Hardware, tools, and building materials retail and wholesale supply.' },
  { id: 'e67', name: 'Stem Magnetics',              tier: 'Copper',  category: 'Equipment',  section: 'Solutions Zone',  booth: 'D08', featured: false, logo_url: `${BASE}/08/STEM-MAGNETICS.png`,           description: 'Magnetic separation equipment and solutions for mineral processing and waste management.' },
  { id: 'e68', name: 'Greencon',                    tier: 'Copper',  category: 'Services',   section: 'Solutions Zone',  booth: 'D09', featured: false, logo_url: `${BASE}/08/GREENCON.png`,                 description: 'Environmental consulting and green construction services for sustainable mining development.' },
  { id: 'e69', name: 'AMD',                         tier: 'Copper',  category: 'Equipment',  section: 'Solutions Zone',  booth: 'D10', featured: false, logo_url: `${BASE}/08/AMD.png`,                      description: 'Mining and drilling equipment supply and maintenance services.' },
  { id: 'e70', name: 'Hardrock',                    tier: 'Copper',  category: 'Services',   section: 'Solutions Zone',  booth: 'D11', featured: false, logo_url: `${BASE}/09/HARDROCK.png`,                 description: 'Hard rock drilling and blasting services for underground and open-cast mining operations.' },
  { id: 'e71', name: 'Cochrane Pump',               tier: 'Copper',  category: 'Equipment',  section: 'Solutions Zone',  booth: 'D12', featured: false, logo_url: `${BASE}/09/COCHRANE-PUMP.png`,            description: 'Industrial pumps, dewatering solutions, and pump maintenance for mining and construction.' },
  { id: 'e72', name: 'CAFCA',                       tier: 'Copper',  category: 'Suppliers',  section: 'Solutions Zone',  booth: 'D13', featured: false, logo_url: `${BASE}/09/CAFCA.png`,                    description: 'Cable and wire manufacturer supplying power and communications cable to the mining sector.' },
  { id: 'e73', name: 'Powerworx',                   tier: 'Copper',  category: 'Solutions',  section: 'Solutions Zone',  booth: 'D14', featured: false, logo_url: `${BASE}/09/POWERWORX.png`,                description: 'Power generation, UPS systems, and electrical infrastructure for off-grid mining sites.' },
  { id: 'e74', name: 'Corporate 24',                tier: 'Copper',  category: 'Services',   section: 'Solutions Zone',  booth: 'D15', featured: false, logo_url: `${BASE}/09/CORPORATE-24.png`,             description: 'Private healthcare, medical insurance, and occupational health services for mining personnel.' },
  { id: 'e75', name: 'Dolphin Telcoms',             tier: 'Copper',  category: 'Solutions',  section: 'Solutions Zone',  booth: 'D16', featured: false, logo_url: `${BASE}/09/DOLPHIN-TELCOMS.png`,          description: 'Telecommunications infrastructure and connectivity solutions for remote mining operations.' },
  { id: 'e76', name: 'GPS',                         tier: 'Copper',  category: 'Solutions',  section: 'Solutions Zone',  booth: 'D17', featured: false, logo_url: `${BASE}/09/GPS.png`,                      description: 'GPS tracking, geofencing, and asset monitoring systems for mining fleets and equipment.' },
  { id: 'e77', name: 'Hillmax Engineering',         tier: 'Copper',  category: 'Services',   section: 'Solutions Zone',  booth: 'D18', featured: false, logo_url: `${BASE}/09/HILLMAX-ENGINEERING.png`,      description: 'Mechanical and structural engineering services for mining plant and equipment fabrication.' },
  { id: 'e78', name: 'PowerDrive',                  tier: 'Copper',  category: 'Equipment',  section: 'Solutions Zone',  booth: 'D19', featured: false, logo_url: `${BASE}/09/POWERDRIVE.png`,               description: 'Drive systems, gearboxes, and power transmission components for industrial machinery.' },
  { id: 'e79', name: 'CAFCA',                       tier: 'Copper',  category: 'Suppliers',  section: 'Solutions Zone',  booth: 'D20', featured: false, logo_url: `${BASE}/09/CAFCA.png`,                    description: 'Wire and cable products including mining cables, control cables, and flexible cords.' },
  { id: 'e80', name: 'Exodus Mining',               tier: 'Copper',  category: 'Services',   section: 'Solutions Zone',  booth: 'D21', featured: false, logo_url: `${BASE}/09/EXODUS-MINING.png`,            description: 'Small-scale and artisanal mining support services, equipment supply, and compliance advisory.' },
];

export const SEED_SPONSORS = [
  { id: 's1', name: 'SANY Group',               tier: 'Platinum', description: 'Global leader in construction and mining equipment. Proud Platinum sponsor of MineCon 2026.',                       website: 'https://www.sanyglobal.com',   logo_url: `${BASE}/08/SANY.png`,                    featured: true  },
  { id: 's2', name: 'Zimplow Holdings',          tier: 'Platinum', description: 'Diversified Zimbabwean industrial group supporting mining and construction across Southern Africa.',               website: 'https://www.zimplow.co.zw',    logo_url: `${BASE}/08/ZINMPLOW.png`,                featured: true  },
  { id: 's3', name: 'Steel Warehouse Holdings',  tier: 'Platinum', description: 'Zimbabwe\'s leading steel and metal products supplier to mining and construction projects.',                       website: 'https://www.swh.co.zw',        logo_url: `${BASE}/08/STEEL-WAREHOUSE.png`,         featured: true  },
  { id: 's4', name: 'Agricon Equipment',         tier: 'Gold',     description: 'Comprehensive equipment solutions for mining, earthmoving and construction across Zimbabwe.',                       website: 'https://www.agricon.co.zw',    logo_url: `${BASE}/08/AGRICON.png`,                 featured: false },
  { id: 's5', name: 'LiuGong Zimbabwe',          tier: 'Gold',     description: 'Official LiuGong heavy equipment distributor for Zimbabwe and the wider region.',                                  website: 'https://www.liugongzw.com',    logo_url: `${BASE}/09/LIUGONG.png`,                 featured: false },
  { id: 's6', name: 'Kanu Equipment',            tier: 'Gold',     description: 'Construction and mining equipment dealer with full aftersales support.',                                            website: '',                             logo_url: `${BASE}/08/KANU-EQUIPMENT.png`,          featured: false },
  { id: 's7', name: 'Electrosales Zimbabwe',     tier: 'Silver',   description: 'Electrical systems, lighting, and power solutions for mining and industrial operations.',                          website: '',                             logo_url: `${BASE}/09/ELECTROSALES.png`,            featured: false },
  { id: 's8', name: 'R&S Diesel Professionals',  tier: 'Silver',   description: 'Specialist diesel engine service and parts supply for heavy plant and mining fleet.',                              website: '',                             logo_url: `${BASE}/08/RS-DIESEL.png`,               featured: false },
  { id: 's9', name: 'Scout Aerial Africa',       tier: 'Bronze',   description: 'Drone surveys, aerial photography, and LiDAR mapping for mining exploration and site monitoring.',                 website: 'https://scoutaerialafrica.com', logo_url: `${BASE}/08/SCOUT-AERIAL.png`,            featured: false },
  { id: 's10', name: 'EcoCash',                  tier: 'Bronze',   description: 'Zimbabwe\'s leading mobile money platform powering cashless transactions at the exhibition.',                      website: '',                             logo_url: `${BASE}/09/ECOCASH.png`,                 featured: false },
];

export const SEED_ANNOUNCEMENTS = [
  {
    id: 'a1',
    title: 'Welcome to MineCon 2026',
    body: 'MineCon 2026 is taking shape! Join us at Artfarm Grounds, Pomona, Harare for Southern Africa\'s premier mining and construction exhibition. Dates to be confirmed — register your interest today.',
    type: 'General',
    pinned: true,
    created_date: new Date().toISOString(),
  },
  {
    id: 'a2',
    title: 'Exhibitor Registrations Now Open',
    body: 'Companies wishing to exhibit at MineCon 2026 can now register for a booth. Diamond, Gold, Chrome, and Copper packages are available. Contact us at info@minecon.global.',
    type: 'Important',
    pinned: true,
    created_date: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'a3',
    title: 'MineCon 2025 Recap',
    body: 'MineCon 2025 was a huge success with over 80 exhibitors across 4 zones. Thank you to every exhibitor, sponsor, and attendee who made it a landmark event for Zimbabwe\'s mining sector.',
    type: 'Update',
    pinned: false,
    created_date: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

export const SEED_USERS = [
  {
    id: 'usr_organizer',
    email: 'organizer@minecon.global',
    full_name: 'Demo Organizer',
    role: 'organizer',
    company: 'MineCon',
    status: 'active',
    created_date: new Date().toISOString(),
  },
  {
    id: 'usr_partner',
    email: 'partner@minecon.global',
    full_name: 'Marketing Partner',
    role: 'marketing_partner',
    company: 'MineCon Media',
    status: 'active',
    created_date: new Date().toISOString(),
  },
  {
    id: 'usr_exhibitor',
    email: 'exhibitor@minecon.global',
    full_name: 'Demo Exhibitor',
    role: 'exhibitor',
    company: 'Steel Warehouse Holdings',
    status: 'active',
    created_date: new Date().toISOString(),
  },
  {
    id: 'usr_attendee',
    email: 'attendee@minecon.global',
    full_name: 'Demo Attendee',
    role: 'attendee',
    company: '',
    status: 'active',
    created_date: new Date().toISOString(),
  },
];

/**
 * Seeds localStorage with 2025 demo data if the keys don't already exist.
 * Safe to call on every app load — skips if data is present.
 */
export function seedIfEmpty() {
  if (!localStorage.getItem('entities_exhibitors')) {
    localStorage.setItem('entities_exhibitors', JSON.stringify(SEED_EXHIBITORS));
  }
  if (!localStorage.getItem('entities_sponsors')) {
    localStorage.setItem('entities_sponsors', JSON.stringify(SEED_SPONSORS));
  }
  if (!localStorage.getItem('entities_announcements')) {
    localStorage.setItem('entities_announcements', JSON.stringify(SEED_ANNOUNCEMENTS));
  }
  if (!localStorage.getItem('entities_users')) {
    localStorage.setItem('entities_users', JSON.stringify(SEED_USERS));
  }
}
